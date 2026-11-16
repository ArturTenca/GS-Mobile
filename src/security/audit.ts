import { scan } from './pii/engine.ts';
import { fingerprintOf } from './taint/events.ts';
import type { SecurityEvent } from './taint/events.ts';

// Auditoria em repouso (D-06): varre apenas textos do proprio usuario e gera
// eventos com previa mascarada. Funcao pura, sem I/O. Nunca guarda o texto.

export type AuditRow = { origin: string; text: string };

export const AUDIT_SINK = 'db_at_rest' as const;

export function auditTextRows(rows: readonly AuditRow[]): SecurityEvent[] {
  const byFingerprint = new Map<string, SecurityEvent>();
  for (const row of rows) {
    if (typeof row.text !== 'string' || row.text.length === 0) continue;
    // Endereco (cep) e dado esperado nas propriedades: nao e vazamento.
    for (const f of scan(row.text)) {
      if (f.category === 'address') continue;
      const fingerprint = fingerprintOf(f.ruleId, AUDIT_SINK, row.origin);
      const existing = byFingerprint.get(fingerprint);
      if (existing) {
        existing.occurrences += 1;
        continue;
      }
      byFingerprint.set(fingerprint, {
        ruleId: f.ruleId,
        category: f.category,
        severity: f.severity,
        sink: AUDIT_SINK,
        origin: row.origin,
        action: 'detected',
        fingerprint,
        preview: f.preview,
        occurrences: 1,
      });
    }
  }
  return [...byFingerprint.values()];
}

type ExistingEvent = Pick<
  SecurityEvent,
  'ruleId' | 'category' | 'severity' | 'sink' | 'origin' | 'action' | 'fingerprint'
>;

// Achados 'detected' em repouso que nao aparecem mais viram 'resolved'.
export function reconcileResolved(
  existing: readonly ExistingEvent[],
  current: readonly Pick<SecurityEvent, 'fingerprint'>[],
): SecurityEvent[] {
  const now = new Set(current.map((e) => e.fingerprint));
  const out: SecurityEvent[] = [];
  const seen = new Set<string>();
  for (const e of existing) {
    if (e.sink !== AUDIT_SINK || e.action !== 'detected') continue;
    if (now.has(e.fingerprint) || seen.has(e.fingerprint)) continue;
    seen.add(e.fingerprint);
    out.push({
      ruleId: e.ruleId,
      category: e.category,
      severity: e.severity,
      sink: e.sink,
      origin: e.origin,
      action: 'resolved',
      fingerprint: e.fingerprint,
      preview: '',
      occurrences: 1,
    });
  }
  return out;
}
