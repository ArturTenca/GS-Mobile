import { AppState, Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import { ServiceError } from '@/services/ServiceError';
import type { AuditRow } from '@/security/audit';
import { templateFor } from '@/security/remediation/templates';
import type { RuleLevel, TemplateResult } from '@/security/remediation/templates';
import { flushEvents, peekEvents, recordEvent, setEventFlusher } from '@/security/taint/events';
import type { SecurityEvent } from '@/security/taint/events';
import { safeLog } from '@/security/taint/sinks';

const MSG_LOAD = 'Não foi possível carregar os dados de segurança.';
const MSG_SAVE = 'Não foi possível registrar os eventos de segurança.';
const MSG_AUDIT = 'Não foi possível ler seus dados para a auditoria.';

const CHUNK = 50;
const LIST_LIMIT = 200;
const FLUSH_INTERVAL_MS = 30_000;
const STORAGE_KEY = 'agroalerta.security.pending';
const LEVELS: readonly RuleLevel[] = ['baixo', 'moderado', 'alto', 'critico'];

export interface SecurityEventRow {
  id: string;
  ruleId: string;
  category: string;
  severity: string;
  sink: string;
  origin: string;
  action: string;
  fingerprint: string;
  preview: string;
  occurrences: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

interface DbRow {
  id: string;
  rule_id: string;
  category: string;
  severity: string;
  sink: string;
  origin: string;
  action: string;
  fingerprint: string;
  preview: string | null;
  occurrences: number;
  first_seen_at: string;
  last_seen_at: string;
}

export interface ExplainInput {
  rule_id: string;
  severity: string;
  sink: string;
  action: string;
  count: number;
}

export type ExplainItem = Omit<TemplateResult, 'source'> & { source: 'ai' | 'template' };

function toRow(r: DbRow): SecurityEventRow {
  return {
    id: r.id,
    ruleId: r.rule_id,
    category: r.category,
    severity: r.severity,
    sink: r.sink,
    origin: r.origin,
    action: r.action,
    fingerprint: r.fingerprint,
    preview: r.preview ?? '',
    occurrences: r.occurrences,
    firstSeenAt: r.first_seen_at,
    lastSeenAt: r.last_seen_at,
  };
}

export async function listSecurityEvents(): Promise<SecurityEventRow[]> {
  try {
    const { data, error } = await supabase
      .from('security_events')
      .select(
        'id,rule_id,category,severity,sink,origin,action,fingerprint,preview,occurrences,first_seen_at,last_seen_at',
      )
      .order('last_seen_at', { ascending: false })
      .limit(LIST_LIMIT);
    if (error) throw new ServiceError(MSG_LOAD, error);
    return ((data as DbRow[] | null) ?? []).map(toRow);
  } catch (e) {
    if (e instanceof ServiceError) throw e;
    throw new ServiceError(MSG_LOAD, e);
  }
}

export async function recordSecurityEvents(events: readonly SecurityEvent[]): Promise<void> {
  if (events.length === 0) return;
  try {
    for (let i = 0; i < events.length; i += CHUNK) {
      const p_events = events.slice(i, i + CHUNK).map((e) => ({
        rule_id: e.ruleId,
        category: e.category,
        severity: e.severity,
        sink: e.sink,
        origin: e.origin,
        action: e.action,
        fingerprint: e.fingerprint,
        preview: e.preview,
        occurrences: e.occurrences,
      }));
      const { error } = await supabase.rpc('record_security_events', { p_events });
      if (error) throw new ServiceError(MSG_SAVE, error);
    }
  } catch (e) {
    if (e instanceof ServiceError) throw e;
    throw new ServiceError(MSG_SAVE, e);
  }
}

function pushRows(rows: AuditRow[], origin: string, values: (string | null | undefined)[]): void {
  for (const text of values) {
    if (typeof text === 'string' && text.length > 0) rows.push({ origin, text });
  }
}

export async function fetchAuditRows(): Promise<AuditRow[]> {
  try {
    const [producers, properties, sensors] = await Promise.all([
      supabase.from('producers').select('full_name'),
      supabase.from('properties').select('name,address,neighborhood,city,main_crop'),
      supabase.from('sensors').select('name'),
    ]);
    if (producers.error || properties.error || sensors.error) {
      throw new ServiceError(MSG_AUDIT, producers.error ?? properties.error ?? sensors.error);
    }
    const rows: AuditRow[] = [];
    for (const p of (producers.data as { full_name: string | null }[] | null) ?? []) {
      pushRows(rows, 'producers.full_name', [p.full_name]);
    }
    type Prop = {
      name: string | null;
      address: string | null;
      neighborhood: string | null;
      city: string | null;
      main_crop: string | null;
    };
    for (const p of (properties.data as Prop[] | null) ?? []) {
      pushRows(rows, 'properties.name', [p.name]);
      pushRows(rows, 'properties.address', [p.address]);
      pushRows(rows, 'properties.neighborhood', [p.neighborhood]);
      pushRows(rows, 'properties.city', [p.city]);
      pushRows(rows, 'properties.main_crop', [p.main_crop]);
    }
    for (const s of (sensors.data as { name: string | null }[] | null) ?? []) {
      pushRows(rows, 'sensors.name', [s.name]);
    }
    return rows;
  } catch (e) {
    if (e instanceof ServiceError) throw e;
    throw new ServiceError(MSG_AUDIT, e);
  }
}

function templates(items: readonly ExplainInput[]): ExplainItem[] {
  return items.map((i) => templateFor({ rule_id: i.rule_id, severity: i.severity }));
}

function isText(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

function validItems(data: unknown): ExplainItem[] | null {
  if (!data || typeof data !== 'object') return null;
  const list = (data as { items?: unknown }).items;
  if (!Array.isArray(list) || list.length === 0) return null;
  const out: ExplainItem[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;
    if (!isText(r.rule_id) || !isText(r.titulo) || !isText(r.risco_real) || !isText(r.o_que_fazer)) return null;
    if (!LEVELS.includes(r.nivel as RuleLevel)) return null;
    out.push({
      rule_id: r.rule_id,
      titulo: r.titulo,
      risco_real: r.risco_real,
      o_que_fazer: r.o_que_fazer,
      nivel: r.nivel as RuleLevel,
      source: r.source === 'ai' ? 'ai' : 'template',
    });
  }
  return out;
}

/** Never throws: any failure falls back to the client templates (D-08). */
export async function explainRisk(items: readonly ExplainInput[]): Promise<ExplainItem[]> {
  if (items.length === 0) return [];
  try {
    const { data, error } = await supabase.functions.invoke('explain-risk', { body: { items } });
    if (error) return templates(items);
    return validItems(data) ?? templates(items);
  } catch {
    return templates(items);
  }
}

// ---------------------------------------------------------------------------
// Flush do buffer de eventos (taint): guarda, intervalo, background e persistencia
// ---------------------------------------------------------------------------

type StorageLike = { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void };

function storage(): StorageLike | null {
  try {
    const s = (globalThis as { localStorage?: StorageLike }).localStorage;
    return s ?? null;
  } catch {
    return null;
  }
}

function persistPending(): void {
  try {
    const s = storage();
    if (!s) return;
    const pending = peekEvents();
    if (pending.length === 0) s.removeItem(STORAGE_KEY);
    else s.setItem(STORAGE_KEY, JSON.stringify(pending));
  } catch {
    // melhor esforco
  }
}

function restorePending(): void {
  try {
    const s = storage();
    const raw = s?.getItem(STORAGE_KEY);
    if (!raw) return;
    const list = JSON.parse(raw) as SecurityEvent[];
    if (!Array.isArray(list)) return;
    for (const e of list.slice(0, 100)) {
      if (e && typeof e.ruleId === 'string' && typeof e.origin === 'string') {
        recordEvent({
          ruleId: e.ruleId,
          category: e.category,
          severity: e.severity,
          sink: e.sink,
          origin: e.origin,
          action: e.action,
          preview: typeof e.preview === 'string' ? e.preview : '',
        });
      }
    }
    s?.removeItem(STORAGE_KEY);
  } catch {
    // melhor esforco
  }
}

/** Drains the taint buffer into the database. On failure the events stay buffered. */
export async function flushPendingSecurityEvents(): Promise<void> {
  await flushEvents();
  persistPending();
}

let loopStarted = false;

function startBackgroundFlush(): void {
  if (loopStarted) return;
  loopStarted = true;
  restorePending();
  const tick = () => {
    flushPendingSecurityEvents().catch(() => {
      safeLog('warn', 'security flush adiado');
    });
  };
  const timer = setInterval(tick, FLUSH_INTERVAL_MS) as unknown as { unref?: () => void };
  if (typeof timer === 'object' && typeof timer.unref === 'function') timer.unref();
  if (Platform.OS !== 'web') {
    AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        persistPending();
        tick();
      }
    });
  }
}

setEventFlusher(async (events) => {
  startBackgroundFlush();
  await recordSecurityEvents(events);
});
startBackgroundFlush();
