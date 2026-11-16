import { validateField } from '@/lib/security/fieldPolicies';
import { circleAreaHa, pointInPolygon, type LatLng } from '@/lib/geo';
import type { SensorType } from '@/types/database';

export const RADIUS_PRESETS = [10, 25, 50, 100, 150, 200, 300, 500] as const;
export const DEFAULT_RADIUS_M = 50;
export const MAX_NAME_LENGTH = 120;

export const SENSOR_TYPE_LABELS: Record<SensorType, string> = {
  temperature: 'Temperatura',
  air_humidity: 'Umidade do ar',
  soil_moisture: 'Umidade do solo',
};

export const SENSOR_TYPES: SensorType[] = ['temperature', 'air_humidity', 'soil_moisture'];

/** Moves one preset up (+1) or down (-1); values off the list snap to the nearest preset first. */
export function stepRadius(current: number, direction: 1 | -1): number {
  let nearest = 0;
  for (let i = 1; i < RADIUS_PRESETS.length; i++) {
    if (Math.abs(RADIUS_PRESETS[i] - current) < Math.abs(RADIUS_PRESETS[nearest] - current)) nearest = i;
  }
  const next = Math.min(RADIUS_PRESETS.length - 1, Math.max(0, nearest + direction));
  return RADIUS_PRESETS[next];
}

export function defaultSensorName(type: SensorType, existing: { type: SensorType }[] | undefined): string {
  const count = (existing ?? []).filter((s) => s.type === type).length;
  return `${SENSOR_TYPE_LABELS[type]} ${count + 1}`;
}

export type NameValidation = { valid: true; value: string } | { valid: false; error: string };

export function validateSensorName(raw: string): NameValidation {
  const value = raw.trim();
  if (value.length === 0) return { valid: false, error: 'Informe o nome do sensor.' };
  if (value.length > MAX_NAME_LENGTH) return { valid: false, error: 'Nome muito longo.' };
  const checked = validateField('sensorName', value);
  if (!checked.ok) return { valid: false, error: checked.error };
  return { valid: true, value: checked.value };
}

export function isPointAllowed(point: LatLng, ring: LatLng[]): boolean {
  if (ring.length < 3) return false;
  return pointInPolygon(point, ring);
}

export function coverageSummary(radiusM: number): string {
  const ha = circleAreaHa(radiusM).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `Cobre cerca de ${ha} ha da fazenda`;
}
