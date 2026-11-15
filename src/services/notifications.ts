import { CATEGORY_ORDER } from '@/components/alerts/alertMeta';
import { supabase } from '@/lib/supabase';
import { ServiceError } from '@/services/ServiceError';
import type { AlertCategory } from '@/types/database';

export interface NotificationPrefs {
  enabled: boolean;
  categories: AlertCategory[];
}

export const ALL_CATEGORIES: AlertCategory[] = [...CATEGORY_ORDER];

const MSG_LOAD = 'Não foi possível carregar as preferências.';
const MSG_SAVE = 'Não foi possível salvar a preferência. Verifique sua internet e tente de novo.';

function normalize(row: { notify_enabled?: unknown; notify_categories?: unknown }): NotificationPrefs {
  const raw = Array.isArray(row.notify_categories) ? (row.notify_categories as string[]) : null;
  return {
    enabled: typeof row.notify_enabled === 'boolean' ? row.notify_enabled : true,
    categories: raw ? ALL_CATEGORIES.filter((c) => raw.includes(c)) : [...ALL_CATEGORIES],
  };
}

export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  try {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) throw new ServiceError(MSG_LOAD, authError);

    const { data, error } = await supabase
      .from('producers')
      .select('notify_enabled, notify_categories')
      .eq('id', auth.user.id)
      .maybeSingle();
    if (error || !data) throw new ServiceError(MSG_LOAD, error);
    return normalize(data);
  } catch (e) {
    if (e instanceof ServiceError) throw e;
    throw new ServiceError(MSG_LOAD, e);
  }
}

/** Updates only the given fields (explicit allowlist; column grant from 008 backs this). */
export async function saveNotificationPrefs(patch: Partial<NotificationPrefs>): Promise<NotificationPrefs> {
  try {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) throw new ServiceError(MSG_SAVE, authError);

    const payload: { notify_enabled?: boolean; notify_categories?: AlertCategory[] } = {};
    if (typeof patch.enabled === 'boolean') payload.notify_enabled = patch.enabled;
    if (patch.categories) {
      const wanted = patch.categories;
      payload.notify_categories = ALL_CATEGORIES.filter((c) => wanted.includes(c));
    }
    if (Object.keys(payload).length === 0) throw new ServiceError(MSG_SAVE);

    // .select().single() turns an RLS silent zero-row update into an error.
    const { data, error } = await supabase
      .from('producers')
      .update(payload)
      .eq('id', auth.user.id)
      .select('notify_enabled, notify_categories')
      .single();
    if (error || !data) throw new ServiceError(MSG_SAVE, error);
    return normalize(data);
  } catch (e) {
    if (e instanceof ServiceError) throw e;
    throw new ServiceError(MSG_SAVE, e);
  }
}
