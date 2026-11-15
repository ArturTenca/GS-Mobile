import { supabase } from '@/lib/supabase';
import { ServiceError } from '@/services/ServiceError';
import type { ProducerProfile } from '@/types/database';

const MSG = 'Não foi possível carregar o perfil.';

export async function getProducer(): Promise<ProducerProfile> {
  try {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) throw new ServiceError(MSG, authError);

    const { data, error } = await supabase
      .from('producers')
      .select('id, full_name, onboarding_completed_at')
      .eq('id', auth.user.id)
      .maybeSingle();
    if (error || !data) throw new ServiceError(MSG, error);

    return {
      id: data.id as string,
      fullName: data.full_name as string,
      onboardingCompletedAt: (data.onboarding_completed_at as string | null) ?? null,
    };
  } catch (e) {
    if (e instanceof ServiceError) throw e;
    throw new ServiceError(MSG, e);
  }
}

const MSG_SAVE_NAME = 'Não foi possível salvar o nome. Verifique sua internet e tente de novo.';

/**
 * Updates the signed-in producer's full_name (RLS + column grant limit this to
 * the own row and column). .select().single() turns an RLS silent zero-row
 * update into an error. Then best-effort syncs auth user_metadata.name so the
 * Início greeting matches; that second call never fails the save.
 */
export async function updateProducerName(fullName: string): Promise<string> {
  try {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) throw new ServiceError(MSG_SAVE_NAME, authError);

    const { data, error } = await supabase
      .from('producers')
      .update({ full_name: fullName })
      .eq('id', auth.user.id)
      .select('full_name')
      .single();
    if (error || !data) throw new ServiceError(MSG_SAVE_NAME, error);

    try {
      await supabase.auth.updateUser({ data: { name: fullName } });
    } catch {
      // Greeting sync is best-effort; the profile row is the source of truth.
    }

    return data.full_name as string;
  } catch (e) {
    if (e instanceof ServiceError) throw e;
    throw new ServiceError(MSG_SAVE_NAME, e);
  }
}
