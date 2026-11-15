/**
 * Read-time anchoring of the seeded demo farm (D-08). Pure helpers: services call
 * these once after fetching, never the UI. Non-demo rows are never shifted.
 */
export const DEMO_FRESHNESS_MS = 3 * 60_000;

/** Offset (ms) to ADD to demo timestamps. 0 when there is no demo reading. */
export function computeDemoOffset(
  latestDemoRecordedAt: string | null | undefined,
  now: number,
): number {
  const t = latestDemoRecordedAt ? Date.parse(latestDemoRecordedAt) : NaN;
  return Number.isFinite(t) ? Math.max(0, now - DEMO_FRESHNESS_MS - t) : 0;
}

export function shiftTs(iso: string | null, offset: number, now: number): string | null {
  if (iso == null) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(Math.min(t + offset, now)).toISOString();
}

export function shiftDemoRow<T extends { is_demo: boolean }>(
  row: T,
  fields: (keyof T)[],
  offset: number,
  now: number,
): T {
  if (row.is_demo !== true) return row;
  const next = { ...row };
  for (const f of fields) {
    const v = row[f];
    if (typeof v === 'string' || v === null) {
      (next as Record<keyof T, unknown>)[f] = shiftTs(v as string | null, offset, now);
    }
  }
  return next;
}
