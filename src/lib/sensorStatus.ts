/** A sensor with no activity for longer than this is offline (D-05). */
export const SENSOR_OFFLINE_AFTER_MS = 2 * 60 * 60 * 1000;

/** Exactly 2 h of silence is still online; null (no data at all) is offline. */
export function isSensorOffline(lastActivityMs: number | null, now: number): boolean {
  return lastActivityMs == null || now - lastActivityMs > SENSOR_OFFLINE_AFTER_MS;
}

export interface Range {
  min: number | null;
  max: number | null;
}

/** Values equal to a limit are in range; a missing side never violates. */
export function rangeViolation(value: number, range?: Range | null): 'low' | 'high' | null {
  if (!range) return null;
  if (range.min != null && value < range.min) return 'low';
  if (range.max != null && value > range.max) return 'high';
  return null;
}
