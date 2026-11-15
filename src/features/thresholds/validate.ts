import type { SensorType } from '@/types/database';

export const TEMP_MIN_C = -20;
export const TEMP_MAX_C = 60;
export const HUMIDITY_MIN = 0;
export const HUMIDITY_MAX = 100;

const TEMP_MIN_F = -4;
const TEMP_MAX_F = 140;

export type ThresholdSide = 'min' | 'max';
export type ThresholdFieldKey = `${SensorType}.${ThresholdSide}`;
export type ThresholdUnit = 'c' | 'f';

export const SENSOR_TYPES: SensorType[] = ['temperature', 'air_humidity', 'soil_moisture'];

/** Which side must be filled for each sensor type. */
export const REQUIRED_SIDE: Record<SensorType, ThresholdSide> = {
  temperature: 'max',
  air_humidity: 'max',
  soil_moisture: 'min',
};

export type ThresholdInput = Record<SensorType, { min: string; max: string }>;
export type ThresholdValues = Record<SensorType, { min: number | null; max: number | null }>;

export type ThresholdValidation = {
  valid: boolean;
  errors: Partial<Record<ThresholdFieldKey, string>>;
  values: ThresholdValues | null;
};

const MSG_REQUIRED = 'Informe um valor.';
const MSG_NAN = 'Use só números, como 25 ou 25,5.';
const MSG_ORDER = 'O mínimo precisa ser menor que o máximo.';
const MSG_HUMIDITY = 'Use um valor entre 0 e 100 %.';

function rangeMessage(type: SensorType, unit: ThresholdUnit): string {
  if (type !== 'temperature') return MSG_HUMIDITY;
  return unit === 'f'
    ? `Use um valor entre ${TEMP_MIN_F} e ${TEMP_MAX_F} °F.`
    : `Use um valor entre ${TEMP_MIN_C} e ${TEMP_MAX_C} °C.`;
}

function inRange(type: SensorType, unit: ThresholdUnit, v: number): boolean {
  if (type === 'temperature') {
    return unit === 'f' ? v >= TEMP_MIN_F && v <= TEMP_MAX_F : v >= TEMP_MIN_C && v <= TEMP_MAX_C;
  }
  return v >= HUMIDITY_MIN && v <= HUMIDITY_MAX;
}

/** Returns a number, null (empty) or NaN (invalid text). Accepts comma or dot. */
function parse(raw: string): number | null {
  const s = raw.trim().replace(',', '.');
  if (s === '') return null;
  if (!/^-?\d+(\.\d+)?$/.test(s)) return Number.NaN;
  return Number(s);
}

function toCelsius(v: number, unit: ThresholdUnit): number {
  const c = unit === 'f' ? (v - 32) / 1.8 : v;
  return Math.round(c * 10) / 10;
}

export function validateThresholds(input: ThresholdInput, unit: ThresholdUnit): ThresholdValidation {
  const errors: Partial<Record<ThresholdFieldKey, string>> = {};
  const parsed = {} as Record<SensorType, { min: number | null; max: number | null }>;

  for (const type of SENSOR_TYPES) {
    parsed[type] = { min: null, max: null };
    for (const side of ['min', 'max'] as const) {
      const key: ThresholdFieldKey = `${type}.${side}`;
      const n = parse(input[type][side]);
      if (n === null) {
        if (REQUIRED_SIDE[type] === side) errors[key] = MSG_REQUIRED;
      } else if (Number.isNaN(n)) {
        errors[key] = MSG_NAN;
      } else if (!inRange(type, unit, n)) {
        errors[key] = rangeMessage(type, unit);
      } else {
        parsed[type][side] = n;
      }
    }
    const { min, max } = parsed[type];
    if (min !== null && max !== null && min >= max && !errors[`${type}.max`]) {
      errors[`${type}.max`] = MSG_ORDER;
    }
  }

  if (Object.keys(errors).length > 0) return { valid: false, errors, values: null };

  const values = {} as ThresholdValues;
  for (const type of SENSOR_TYPES) {
    const { min, max } = parsed[type];
    const conv = (v: number | null) => (v === null ? null : type === 'temperature' ? toCelsius(v, unit) : v);
    values[type] = { min: conv(min), max: conv(max) };
  }
  return { valid: true, errors, values };
}
