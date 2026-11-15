import type { ConditionAlert, DeriveSensor, ThresholdMap } from '@/features/condition/types';
import { supabase } from '@/lib/supabase';
import { computeDemoOffset, shiftDemoRow } from '@/services/demoTime';
import { ServiceError } from '@/services/ServiceError';
import type { AlertCategory, AlertSeverity, AlertStatus, SensorType } from '@/types/database';

const MSG_LOAD = 'Não foi possível carregar o resumo da propriedade.';

export interface ClimateSnapshotView {
  condition: string;
  description: string;
  temperatureC: number | null;
  humidityPct: number | null;
  rainProbabilityPct: number | null;
  observedAt: string;
}

export interface HomeOverview {
  asOf: number;
  propertyId: string;
  sensors: DeriveSensor[];
  thresholds: ThresholdMap;
  alerts: ConditionAlert[];
  climate: { status: 'ok'; data: ClimateSnapshotView | null } | { status: 'error' };
}

interface SensorRow {
  id: string;
  name: string;
  type: SensorType;
  unit: string;
  area_id: string | null;
  last_seen_at: string | null;
  is_demo: boolean;
  planting_areas: { name: string } | { name: string }[] | null;
}

interface ReadingRow {
  sensor_id: string;
  recorded_at: string;
  value: number | string;
  is_demo: boolean;
}

interface ThresholdRow {
  sensor_type: SensorType;
  min_value: number | string | null;
  max_value: number | string | null;
}

interface AlertRow {
  id: string;
  sensor_id: string | null;
  category: AlertCategory;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description: string;
  recommendation: string | null;
  triggered_at: string;
  is_demo: boolean;
}

interface ClimateRow {
  condition: string;
  description: string;
  temperature_c: number | string | null;
  humidity_pct: number | string | null;
  rain_probability_pct: number | string | null;
  observed_at: string;
  is_demo: boolean;
}

const SEVERITY_RANK: Record<AlertSeverity, number> = { critical: 3, warning: 2, info: 1 };

function num(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function areaName(embed: SensorRow['planting_areas']): string | null {
  if (!embed) return null;
  if (Array.isArray(embed)) return embed[0]?.name ?? null;
  return embed.name ?? null;
}

export async function getHomeOverview(propertyId: string): Promise<HomeOverview> {
  try {
    const now = Date.now();

    const climateQuery = (async () => {
      try {
        const res = await supabase
          .from('climate_snapshots')
          .select(
            'condition,description,temperature_c,humidity_pct,rain_probability_pct,observed_at,is_demo',
          )
          .eq('property_id', propertyId)
          .order('observed_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        return res;
      } catch (e) {
        return { data: null, error: e };
      }
    })();

    const [sensorsRes, readingsRes, thresholdsRes, alertsRes, climateRes] = await Promise.all([
      supabase
        .from('sensors')
        .select('id,name,type,unit,area_id,last_seen_at,is_demo,planting_areas(name)')
        .eq('property_id', propertyId),
      supabase
        .from('latest_readings')
        .select('sensor_id,recorded_at,value,is_demo')
        .eq('property_id', propertyId),
      supabase
        .from('thresholds')
        .select('sensor_type,min_value,max_value')
        .eq('property_id', propertyId),
      supabase
        .from('alerts')
        .select(
          'id,sensor_id,category,severity,status,title,description,recommendation,triggered_at,is_demo',
        )
        .eq('property_id', propertyId)
        .neq('status', 'resolvido')
        .order('severity', { ascending: false })
        .order('triggered_at', { ascending: false })
        .limit(100),
      climateQuery,
    ]);

    if (sensorsRes.error) throw new ServiceError(MSG_LOAD, sensorsRes.error);
    if (readingsRes.error) throw new ServiceError(MSG_LOAD, readingsRes.error);
    if (thresholdsRes.error) throw new ServiceError(MSG_LOAD, thresholdsRes.error);
    if (alertsRes.error) throw new ServiceError(MSG_LOAD, alertsRes.error);

    const readings = (readingsRes.data ?? []) as ReadingRow[];

    // One offset from the freshest demo reading, applied once below (D-08).
    let freshestDemo: string | null = null;
    for (const r of readings) {
      if (r.is_demo !== true) continue;
      if (freshestDemo === null || Date.parse(r.recorded_at) > Date.parse(freshestDemo)) {
        freshestDemo = r.recorded_at;
      }
    }
    const offset = computeDemoOffset(freshestDemo, now);

    const latestBySensor = new Map<string, { value: number; recordedAt: string }>();
    for (const raw of readings) {
      const r = shiftDemoRow(raw, ['recorded_at'], offset, now);
      const value = num(r.value);
      if (value === null) continue;
      latestBySensor.set(r.sensor_id, { value, recordedAt: r.recorded_at });
    }

    const sensors: DeriveSensor[] = ((sensorsRes.data ?? []) as SensorRow[]).map((raw) => {
      const s = shiftDemoRow(raw, ['last_seen_at'], offset, now);
      return {
        id: s.id,
        name: s.name,
        type: s.type,
        areaName: areaName(s.planting_areas),
        lastSeenAt: s.last_seen_at,
        isDemo: s.is_demo === true,
        latest: latestBySensor.get(s.id) ?? null,
      };
    });

    const thresholds: ThresholdMap = {};
    for (const t of (thresholdsRes.data ?? []) as ThresholdRow[]) {
      thresholds[t.sensor_type] = { min: num(t.min_value), max: num(t.max_value) };
    }

    const alerts: ConditionAlert[] = ((alertsRes.data ?? []) as AlertRow[])
      .map((raw) => {
        const a = shiftDemoRow(raw, ['triggered_at'], offset, now);
        return {
          id: a.id,
          sensorId: a.sensor_id,
          category: a.category,
          severity: a.severity,
          status: a.status,
          title: a.title,
          recommendation: a.recommendation,
          triggeredAt: a.triggered_at,
        };
      })
      .sort(
        (x, y) =>
          SEVERITY_RANK[y.severity] - SEVERITY_RANK[x.severity] ||
          Date.parse(y.triggeredAt) - Date.parse(x.triggeredAt),
      );

    let climate: HomeOverview['climate'];
    if (climateRes.error) {
      climate = { status: 'error' };
    } else if (!climateRes.data) {
      climate = { status: 'ok', data: null };
    } else {
      const c = shiftDemoRow(climateRes.data as ClimateRow, ['observed_at'], offset, now);
      climate = {
        status: 'ok',
        data: {
          condition: c.condition,
          description: c.description,
          temperatureC: num(c.temperature_c),
          humidityPct: num(c.humidity_pct),
          rainProbabilityPct: num(c.rain_probability_pct),
          observedAt: c.observed_at,
        },
      };
    }

    return { asOf: now, propertyId, sensors, thresholds, alerts, climate };
  } catch (e) {
    if (e instanceof ServiceError) throw e;
    throw new ServiceError(MSG_LOAD, e);
  }
}
