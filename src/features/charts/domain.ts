export interface ChartDomain {
  min: number;
  max: number;
  sections: number;
}

const SECTIONS = 4;
const NICE = [1, 2, 2.5, 5, 10];

function clean(n: number): number {
  return Number(n.toFixed(10));
}

/** Smallest "nice" step (1, 2, 2.5, 5 x 10^k) >= raw. */
function niceStep(raw: number): number {
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const f of NICE) {
    const s = clean(f * mag);
    if (s >= raw) return s;
  }
  return clean(10 * mag);
}

function nextNice(step: number): number {
  return niceStep(clean(step * 1.000001));
}

/**
 * Y domain: data plus thresholds, 10% padding per side, rounded to a clean step
 * so 4 sections give readable labels. Unit-agnostic: convert °C to °F before calling.
 */
export function chartDomain(
  values: number[],
  range: { min: number | null; max: number | null } | null | undefined,
  opts?: { clampPercent?: boolean },
): ChartDomain {
  const all = values.filter((v) => Number.isFinite(v));
  if (range?.min != null && Number.isFinite(range.min)) all.push(range.min);
  if (range?.max != null && Number.isFinite(range.max)) all.push(range.max);

  if (all.length === 0) {
    return opts?.clampPercent ? { min: 0, max: 100, sections: SECTIONS } : { min: 0, max: 4, sections: SECTIONS };
  }

  let lo = Math.min(...all);
  let hi = Math.max(...all);
  const span = hi - lo;
  const pad = span > 0 ? span * 0.1 : Math.max(Math.abs(hi) * 0.1, 1);
  lo -= pad;
  hi += pad;

  if (opts?.clampPercent) {
    lo = Math.max(0, lo);
    hi = Math.min(100, hi);
    if (hi <= lo) {
      lo = Math.max(0, hi - 1);
      hi = Math.min(100, lo + 2);
    }
  }

  let step = niceStep((hi - lo) / SECTIONS);
  let min = clean(Math.floor(lo / step) * step);
  let max = clean(min + SECTIONS * step);
  while (max < hi) {
    step = nextNice(step);
    min = clean(Math.floor(lo / step) * step);
    max = clean(min + SECTIONS * step);
  }

  if (opts?.clampPercent && max > 100) {
    // step <= 25 here because the clamped span is <= 100, so the shift stays >= 0.
    max = 100;
    min = Math.max(0, clean(100 - SECTIONS * step));
  }

  return { min, max, sections: SECTIONS };
}
