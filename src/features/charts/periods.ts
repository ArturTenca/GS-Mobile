export type PeriodKey = '24h' | '7d' | '30d';

export interface PeriodDef {
  key: PeriodKey;
  /** Window length in ms. */
  ms: number;
  /** Drawing bucket size in ms (mean per bucket; D8). */
  bucketMs: number;
  /** Segmented control label. */
  label: string;
  /** Screen reader text, e.g. "Temperatura, últimos 7 dias". */
  a11y: string;
  /** Data dots only when the series is short (24h). */
  showDots: boolean;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export const PERIODS: Record<PeriodKey, PeriodDef> = {
  '24h': { key: '24h', ms: DAY, bucketMs: HOUR, label: '24 horas', a11y: 'últimas 24 horas', showDots: true },
  '7d': { key: '7d', ms: 7 * DAY, bucketMs: 3 * HOUR, label: '7 dias', a11y: 'últimos 7 dias', showDots: false },
  '30d': { key: '30d', ms: 30 * DAY, bucketMs: 6 * HOUR, label: '30 dias', a11y: 'últimos 30 dias', showDots: false },
};

export const PERIOD_KEYS: PeriodKey[] = ['24h', '7d', '30d'];

export const DEFAULT_PERIOD: PeriodKey = '7d';
