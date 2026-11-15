import { supabase } from '@/lib/supabase';
import { computeDemoOffset, shiftDemoRow } from '@/services/demoTime';
import { ServiceError } from '@/services/ServiceError';

const MSG_LOAD = 'Não foi possível carregar as leituras.';

export type HistoryPoint = { t: number; v: number; isDemo: boolean };

interface LatestRow {
  sensor_id: string;
  recorded_at: string;
  is_demo: boolean;
}

interface ReadingRow {
  recorded_at: string;
  value: number | string | null;
  is_demo: boolean;
}

function num(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Offset (ms) to add to this farm's demo timestamps, from its freshest demo reading (D-08). */
export async function getDemoOffset(propertyId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('latest_readings')
      .select('sensor_id,recorded_at,is_demo')
      .eq('property_id', propertyId);
    if (error) throw new ServiceError(MSG_LOAD, error);
    let maxT = -Infinity;
    let maxIso: string | null = null;
    for (const r of (data as LatestRow[] | null) ?? []) {
      if (r.is_demo !== true) continue;
      const t = Date.parse(r.recorded_at);
      if (Number.isFinite(t) && t > maxT) {
        maxT = t;
        maxIso = r.recorded_at;
      }
    }
    return computeDemoOffset(maxIso, Date.now());
  } catch (e) {
    if (e instanceof ServiceError) throw e;
    throw new ServiceError(MSG_LOAD, e);
  }
}

/**
 * History of ONE sensor over the period window, anchored to now (D-13).
 * Queried per sensor (never `.in` over all sensors) so the PostgREST 1000-row cap
 * cannot truncate a farm: 30 days at hourly resolution is 721 rows. Real sensors
 * with sub-hourly data would need server-side bucketing (Phase 3 concern).
 */
export async function listSensorHistory(
  sensorId: string,
  periodMs: number,
  offsetMs: number,
): Promise<HistoryPoint[]> {
  try {
    const now = Date.now();
    const since = new Date(now - periodMs - offsetMs).toISOString();
    const { data, error } = await supabase
      .from('readings')
      .select('recorded_at,value,is_demo')
      .eq('sensor_id', sensorId)
      .gte('recorded_at', since)
      .order('recorded_at', { ascending: true })
      .limit(1000);
    if (error) throw new ServiceError(MSG_LOAD, error);

    const out: HistoryPoint[] = [];
    for (const raw of (data as ReadingRow[] | null) ?? []) {
      const v = num(raw.value);
      if (v === null) continue;
      const r = shiftDemoRow(raw, ['recorded_at'], offsetMs, now);
      const t = Date.parse(r.recorded_at);
      if (!Number.isFinite(t)) continue;
      out.push({ t, v, isDemo: r.is_demo === true });
    }
    out.sort((a, b) => a.t - b.t);
    return out;
  } catch (e) {
    if (e instanceof ServiceError) throw e;
    throw new ServiceError(MSG_LOAD, e);
  }
}
