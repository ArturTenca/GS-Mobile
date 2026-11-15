import { formatDecimal, formatHumidity } from '@/lib/formatNumber';
import { isSensorOffline, rangeViolation } from '@/lib/sensorStatus';
import type { SensorType } from '@/types/database';

import { lastActivityMs, violationMagnitude } from './reasons';
import type { DeriveSensor, ThresholdMap } from './types';

export interface MetricResult {
  value: number | null;
  /** Formatted PT-BR number, or "—" when there is no data. */
  display: string;
  unit: string;
  status: 'normal' | 'atencao' | 'semDados';
  context: string;
}

const UNIT: Record<SensorType, string> = {
  temperature: '°C',
  air_humidity: '%',
  soil_moisture: '%',
};

function fmt(type: SensorType, v: number): string {
  return type === 'temperature' ? formatDecimal(v, 1) : formatHumidity(v);
}

/** Tile value for a sensor type (UI-SPEC B4): worst out-of-range, else mean of online. */
export function selectMetric(
  type: SensorType,
  sensors: DeriveSensor[],
  thresholds: ThresholdMap,
  now: number,
): MetricResult {
  const online = sensors.filter(
    (s) => s.type === type && s.latest && !isSensorOffline(lastActivityMs(s), now),
  );
  if (online.length === 0) {
    return {
      value: null,
      display: '—',
      unit: '',
      status: 'semDados',
      context: 'Nenhum sensor online',
    };
  }

  const range = thresholds[type];
  let worst: { s: DeriveSensor; magnitude: number } | null = null;
  for (const s of online) {
    const dir = rangeViolation(s.latest!.value, range);
    if (!dir || !range) continue;
    const magnitude = violationMagnitude(s.latest!.value, dir, range);
    if (!worst || magnitude > worst.magnitude) worst = { s, magnitude };
  }
  if (worst) {
    const v = worst.s.latest!.value;
    return {
      value: v,
      display: fmt(type, v),
      unit: UNIT[type],
      status: 'atencao',
      context: worst.s.areaName || worst.s.name,
    };
  }

  const mean = online.reduce((sum, s) => sum + s.latest!.value, 0) / online.length;
  return {
    value: mean,
    display: fmt(type, mean),
    unit: UNIT[type],
    status: 'normal',
    context:
      online.length === 1
        ? online[0].areaName || online[0].name
        : `Média de ${online.length} sensores`,
  };
}
