import { supabase } from '@/lib/supabase';
import { ServiceError } from '@/services/ServiceError';
import type { Property } from '@/types/database';

const MSG_LOAD = 'Não foi possível carregar a propriedade.';

/**
 * First property of the signed-in producer, or null. Never creates or clones a
 * demo farm: the demo is cloned once at signup only (D-01).
 */
export async function getCurrentProperty(): Promise<Property | null> {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new ServiceError(MSG_LOAD, error);
    return (data as Property | null) ?? null;
  } catch (e) {
    if (e instanceof ServiceError) throw e;
    throw new ServiceError(MSG_LOAD, e);
  }
}
