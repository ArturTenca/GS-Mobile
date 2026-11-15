export type SeriesPoint = { t: number; v: number };

export interface SeriesStats {
  min: number;
  max: number;
  mean: number;
  latest: number;
}

/**
 * Mean per bucket floor(t / bucketMs), keeping the first timestamp of each bucket.
 * Buckets are for drawing only; stats and counts use the raw values (D-13).
 */
export function downsample(points: SeriesPoint[], bucketMs: number): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  let key = Number.NaN;
  let sum = 0;
  let n = 0;
  let t0 = 0;
  for (const p of points) {
    const k = Math.floor(p.t / bucketMs);
    if (k !== key) {
      if (n) out.push({ t: t0, v: sum / n });
      key = k;
      sum = 0;
      n = 0;
      t0 = p.t;
    }
    sum += p.v;
    n++;
  }
  if (n) out.push({ t: t0, v: sum / n });
  return out;
}

export function seriesStats(values: number[]): SeriesStats | null {
  if (values.length === 0) return null;
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }
  return { min, max, mean: sum / values.length, latest: values[values.length - 1] };
}

/** Same semantics as rangeViolation: equal to a bound is inside, null bounds are ignored. */
export function countOutOfRange(
  values: number[],
  range: { min: number | null; max: number | null } | null | undefined,
): number {
  if (!range) return 0;
  let n = 0;
  for (const v of values) {
    if ((range.min != null && v < range.min) || (range.max != null && v > range.max)) n++;
  }
  return n;
}
