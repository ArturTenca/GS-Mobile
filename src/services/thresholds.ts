import type { ThresholdMap } from '@/features/condition/types';
import { supabase } from '@/lib/supabase';
import { ServiceError } from '@/services/ServiceError';
import type { SensorType } from '@/types/database';

const MSG_LOAD = 'Não foi possível carregar os limites.';
const MSG_SAVE = 'Não foi possível salvar os limites. Verifique sua internet e tente de novo.';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ThresholdRow {
  sensor_type: SensorType;
  min_value: number | string | null;
  max_value: number | string | null;
}

function num(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function listThresholds(propertyId: string): Promise<ThresholdMap> {
  try {
    const { data, error } = await supabase
      .from('thresholds')
      .select('sensor_type,min_value,max_value')
      .eq('property_id', propertyId);
    if (error) throw new ServiceError(MSG_LOAD, error);
    const map: ThresholdMap = {};
    for (const t of (data as ThresholdRow[] | null) ?? []) {
      map[t.sensor_type] = { min: num(t.min_value), max: num(t.max_value) };
    }
    return map;
  } catch (e) {
    if (e instanceof ServiceError) throw e;
    throw new ServiceError(MSG_LOAD, e);
  }
}

export interface ThresholdSaveRow {
  type: SensorType;
  min: number | null;
  max: number | null;
}

/** Upserts the per-type limits of a farm. Temperature is always Celsius. */
export async function saveThresholds(propertyId: string, rows: ThresholdSaveRow[]): Promise<void> {
  try {
    if (!UUID_RE.test(propertyId)) throw new ServiceError(MSG_SAVE, new Error('invalid property id'));
    const { error } = await supabase.from('thresholds').upsert(
      rows.map((r) => ({
        property_id: propertyId,
        sensor_type: r.type,
        min_value: r.min,
        max_value: r.max,
      })),
      { onConflict: 'property_id,sensor_type' },
    );
    if (error) throw new ServiceError(MSG_SAVE, error);
  } catch (e) {
    if (e instanceof ServiceError) throw e;
    throw new ServiceError(MSG_SAVE, e);
  }
}
