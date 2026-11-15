import type { ThresholdMap } from '@/features/condition/types';
import { supabase } from '@/lib/supabase';
import { ServiceError } from '@/services/ServiceError';
import type { SensorType } from '@/types/database';

const MSG_LOAD = 'Não foi possível carregar os limites.';

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
