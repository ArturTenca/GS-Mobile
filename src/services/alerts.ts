import { sortAlerts } from '@/features/alerts/filter';
import { supabase } from '@/lib/supabase';
import { computeDemoOffset, shiftDemoRow, shiftTs } from '@/services/demoTime';
import { ServiceError } from '@/services/ServiceError';
import { listThresholds } from '@/services/thresholds';
import type { AlertCategory, AlertSeverity, AlertStatus, SensorType } from '@/types/database';

const MSG_LOAD = 'Não foi possível carregar o alerta.';
const MSG_LOAD_LIST = 'Não foi possível carregar os alertas.';
const MSG_UPDATE = 'Não foi possível atualizar o alerta. Verifique sua internet e tente de novo.';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface AlertDetail {
  id: string;
  title: string;
  description: string;
  recommendation: string | null;
  severity: AlertSeverity;
  status: AlertStatus;
  category: AlertCategory;
  triggeredAt: string;
  sensorName: string | null;
  areaName: string | null;
  sensorId: string | null;
  sensorType: SensorType | null;
  readingValue: number | null;
  readingAt: string | null;
  unit: string | null;
  threshold: { min: number | null; max: number | null } | null;
  lastSeenAt: string | null;
}

export interface AlertListItem {
  id: string;
  sensorId: string | null;
  sensorName: string | null;
  areaName: string | null;
  category: AlertCategory;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description: string;
  recommendation: string | null;
  triggeredAt: string;
  isDemo: boolean;
}

interface AreaEmbed {
  name: string;
}

interface SensorEmbed {
  name: string;
  type?: SensorType;
  unit?: string | null;
  last_seen_at?: string | null;
  planting_areas: AreaEmbed | AreaEmbed[] | null;
}

interface AlertRow {
  id: string;
  property_id: string;
  category: AlertCategory;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description: string;
  recommendation: string | null;
  triggered_at: string;
  is_demo: boolean;
  sensor_id?: string | null;
  reading_id?: number | null;
  sensors: SensorEmbed | SensorEmbed[] | null;
}

function first<T>(embed: T | T[] | null | undefined): T | null {
  if (!embed) return null;
  return Array.isArray(embed) ? (embed[0] ?? null) : embed;
}

/** Freshest demo reading of the property, anchored the same way as Início (D-08). */
async function fetchDemoOffset(propertyId: string, now: number): Promise<number> {
  const res = await supabase
    .from('readings')
    .select('recorded_at')
    .eq('property_id', propertyId)
    .eq('is_demo', true)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (res.error) throw new ServiceError(MSG_LOAD, res.error);
  const row = res.data as { recorded_at: string } | null;
  return computeDemoOffset(row?.recorded_at ?? null, now);
}

const MEASUREMENT_CATEGORIES: AlertCategory[] = ['temperature_high', 'soil_moisture_low', 'air_humidity_high'];

/** The reading that triggered the alert, else the sensor's latest one. */
async function fetchEvidenceReading(
  sensorId: string,
  readingId: number | null,
): Promise<{ value: number; recorded_at: string } | null> {
  const q = supabase.from('readings').select('value,recorded_at');
  const res =
    readingId !== null
      ? await q.eq('id', readingId).maybeSingle()
      : await q.eq('sensor_id', sensorId).order('recorded_at', { ascending: false }).limit(1).maybeSingle();
  if (res.error) throw new ServiceError(MSG_LOAD, res.error);
  const r = res.data as { value: number | string; recorded_at: string } | null;
  if (!r) return null;
  const value = Number(r.value);
  return Number.isFinite(value) ? { value, recorded_at: r.recorded_at } : null;
}

/**
 * visualizado only moves novo -> visualizado (never downgrades); resolvido
 * must hit a row, so an RLS no-op surfaces as an error (T-04-14/15).
 */
export async function updateAlertStatus(id: string, status: 'visualizado' | 'resolvido'): Promise<void> {
  try {
    if (!UUID_RE.test(id)) throw new ServiceError(MSG_UPDATE, new Error('invalid alert id'));
    if (status === 'visualizado') {
      const res = await supabase.from('alerts').update({ status }).eq('id', id).eq('status', 'novo');
      if (res.error) throw new ServiceError(MSG_UPDATE, res.error);
      return;
    }
    const res = await supabase.from('alerts').update({ status }).eq('id', id).select().single();
    if (res.error || !res.data) throw new ServiceError(MSG_UPDATE, res.error ?? new Error('no row updated'));
  } catch (e) {
    if (e instanceof ServiceError) throw e;
    throw new ServiceError(MSG_UPDATE, e);
  }
}

export async function getAlert(id: string): Promise<AlertDetail | null> {
  // URL param is attacker-controlled: a malformed id is simply "not found" (T-02-16).
  if (!UUID_RE.test(id)) return null;
  try {
    const now = Date.now();
    const res = await supabase
      .from('alerts')
      .select(
        'id,property_id,sensor_id,reading_id,category,severity,status,title,description,recommendation,triggered_at,is_demo,sensors(name,type,unit,last_seen_at,planting_areas(name))',
      )
      .eq('id', id)
      .maybeSingle();
    if (res.error) throw new ServiceError(MSG_LOAD, res.error);
    if (!res.data) return null;

    let row = res.data as AlertRow;
    let demoOffset = 0;
    if (row.is_demo === true) {
      demoOffset = await fetchDemoOffset(row.property_id, now);
      row = shiftDemoRow(row, ['triggered_at'], demoOffset, now);
    }
    const sensor = first(row.sensors);
    const shift = (ts: string): string =>
      demoOffset ? (shiftTs(ts, demoOffset, now) ?? ts) : ts;

    let readingValue: number | null = null;
    let readingAt: string | null = null;
    let threshold: AlertDetail['threshold'] = null;
    if (MEASUREMENT_CATEGORIES.includes(row.category) && row.sensor_id) {
      const reading = await fetchEvidenceReading(row.sensor_id, row.reading_id ?? null);
      if (reading) {
        readingValue = reading.value;
        readingAt = shift(reading.recorded_at);
      }
      if (sensor?.type) {
        const map = await listThresholds(row.property_id);
        threshold = map[sensor.type] ?? null;
      }
    }
    return {
      id: row.id,
      sensorId: row.sensor_id ?? null,
      sensorType: sensor?.type ?? null,
      readingValue,
      readingAt,
      unit: sensor?.unit ?? null,
      threshold,
      lastSeenAt: sensor?.last_seen_at ? shift(sensor.last_seen_at) : null,
      title: row.title,
      description: row.description,
      recommendation: row.recommendation,
      severity: row.severity,
      status: row.status,
      category: row.category,
      triggeredAt: row.triggered_at,
      sensorName: sensor?.name ?? null,
      areaName: first(sensor?.planting_areas)?.name ?? null,
    };
  } catch (e) {
    if (e instanceof ServiceError) throw e;
    throw new ServiceError(MSG_LOAD, e);
  }
}

export async function listAlerts(propertyId: string): Promise<AlertListItem[]> {
  if (!UUID_RE.test(propertyId)) return [];
  try {
    const now = Date.now();
    const res = await supabase
      .from('alerts')
      .select(
        'id,property_id,sensor_id,category,severity,status,title,description,recommendation,triggered_at,is_demo,sensors(name,planting_areas(name))',
      )
      .eq('property_id', propertyId)
      .order('triggered_at', { ascending: false })
      .limit(200);
    if (res.error) throw new ServiceError(MSG_LOAD_LIST, res.error);
    const rows = (res.data ?? []) as AlertRow[];

    // One demo offset per fetch (same anchor as Início / detail).
    const offset = rows.some((r) => r.is_demo === true) ? await fetchDemoOffset(propertyId, now) : 0;

    const items: AlertListItem[] = rows.map((raw) => {
      const row = raw.is_demo === true ? shiftDemoRow(raw, ['triggered_at'], offset, now) : raw;
      const sensor = first(row.sensors);
      return {
        id: row.id,
        sensorId: row.sensor_id ?? null,
        sensorName: sensor?.name ?? null,
        areaName: first(sensor?.planting_areas)?.name ?? null,
        category: row.category,
        severity: row.severity,
        status: row.status,
        title: row.title,
        description: row.description,
        recommendation: row.recommendation,
        triggeredAt: row.triggered_at,
        isDemo: row.is_demo === true,
      };
    });
    return sortAlerts(items);
  } catch (e) {
    if (e instanceof ServiceError) throw e;
    throw new ServiceError(MSG_LOAD_LIST, e);
  }
}
