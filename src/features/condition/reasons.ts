import type { AlertCategory, SensorType } from '@/types/database';

import type { ConditionAlert, DeriveSensor } from './types';

export const NORMAL_COPY = {
  line: 'Tudo certo na sua propriedade.',
  action: 'Sensores funcionando e sem alertas pendentes.',
} as const;

export const NO_SENSORS_COPY = {
  line: 'Nenhum alerta pendente.',
  action: 'Adicione sensores no mapa da fazenda para acompanhar as leituras.',
} as const;

export const OFFLINE_ACTION = 'Verifique a bateria, o sinal e a conexão do sensor.';
export const ALERT_ACTION_FALLBACK = 'Acompanhe a situação e verifique a área afetada.';

export const RANK = { critical: 0, warning: 1, info: 2, reading: 3, offline: 4 } as const;

const MEASURE_LABEL: Record<SensorType, string> = {
  temperature: 'Temperatura',
  air_humidity: 'Umidade do ar',
  soil_moisture: 'Umidade do solo',
};

const READING_ACTION: Record<SensorType, Record<'low' | 'high', string>> = {
  temperature: {
    high: 'Evite trabalhos pesados nas horas mais quentes e reforce a irrigação.',
    low: 'Proteja as plantas mais sensíveis do frio e acompanhe a temperatura.',
  },
  air_humidity: {
    high: 'Melhore a ventilação e observe sinais de fungo nas folhas.',
    low: 'Reforce a irrigação e evite pulverizar nas horas mais quentes.',
  },
  soil_moisture: {
    low: 'Verifique a necessidade de irrigação.',
    high: 'Suspenda a irrigação e confira a drenagem da área.',
  },
};

/** Alert categories that report a sensor measurement (used for dedup). */
const MEASUREMENT_CATEGORIES: readonly AlertCategory[] = [
  'temperature_high',
  'soil_moisture_low',
  'air_humidity_high',
];

export function isMeasurementCategory(c: AlertCategory): boolean {
  return MEASUREMENT_CATEGORIES.includes(c);
}

export function readingLine(type: SensorType, dir: 'low' | 'high', place: string): string {
  const where = dir === 'high' ? 'acima do limite' : 'abaixo do mínimo';
  return `${MEASURE_LABEL[type]} ${where} — ${place}`;
}

export function readingAction(type: SensorType, dir: 'low' | 'high'): string {
  return READING_ACTION[type][dir];
}

export function offlineLine(sensorName: string): string {
  return `Sensor sem comunicação — ${sensorName}`;
}

export function alertLine(alert: ConditionAlert, areaName: string | null): string {
  return areaName ? `${alert.title} — ${areaName}` : alert.title;
}

export function alertAction(alert: ConditionAlert): string {
  return alert.recommendation && alert.recommendation.trim() !== ''
    ? alert.recommendation
    : ALERT_ACTION_FALLBACK;
}

/** Latest activity (ms) of a sensor: max(latest reading, last_seen_at); null if neither. */
export function lastActivityMs(s: DeriveSensor): number | null {
  const times = [s.latest?.recordedAt, s.lastSeenAt]
    .map((v) => (v ? Date.parse(v) : NaN))
    .filter((n) => Number.isFinite(n));
  return times.length ? Math.max(...times) : null;
}

/** How far beyond the violated limit, as a fraction of that limit (for ranking). */
export function violationMagnitude(
  value: number,
  dir: 'low' | 'high',
  range: { min: number | null; max: number | null },
): number {
  const limit = dir === 'low' ? range.min : range.max;
  if (limit == null) return 0;
  const gap = dir === 'low' ? limit - value : value - limit;
  return gap / (Math.abs(limit) || 1);
}
