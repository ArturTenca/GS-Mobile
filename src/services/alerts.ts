import { supabase } from '@/lib/supabase';
import { computeDemoOffset, shiftDemoRow } from '@/services/demoTime';
import { ServiceError } from '@/services/ServiceError';
import type { AlertCategory, AlertSeverity, AlertStatus } from '@/types/database';

const MSG_LOAD = 'Não foi possível carregar o alerta.';
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
}

interface AreaEmbed {
  name: string;
}

interface SensorEmbed {
  name: string;
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

export async function getAlert(id: string): Promise<AlertDetail | null> {
  // URL param is attacker-controlled: a malformed id is simply "not found" (T-02-16).
  if (!UUID_RE.test(id)) return null;
  try {
    const now = Date.now();
    const res = await supabase
      .from('alerts')
      .select(
        'id,property_id,category,severity,status,title,description,recommendation,triggered_at,is_demo,sensors(name,planting_areas(name))',
      )
      .eq('id', id)
      .maybeSingle();
    if (res.error) throw new ServiceError(MSG_LOAD, res.error);
    if (!res.data) return null;

    let row = res.data as AlertRow;
    if (row.is_demo === true) {
      const offset = await fetchDemoOffset(row.property_id, now);
      row = shiftDemoRow(row, ['triggered_at'], offset, now);
    }
    const sensor = first(row.sensors);
    return {
      id: row.id,
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
