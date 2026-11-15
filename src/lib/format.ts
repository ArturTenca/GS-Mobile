import { formatDecimal } from './formatNumber';

const FALLBACK_NAME = 'produtor(a)';

function words(name: unknown): string[] {
  return typeof name === 'string' ? name.trim().split(/\s+/).filter(Boolean) : [];
}

export function firstName(name: unknown): string {
  return words(name)[0] ?? FALLBACK_NAME;
}

export function initials(name: unknown): string {
  const parts = words(name);
  if (parts.length === 0) return '?';
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
  return (first + last).toUpperCase();
}

export function formatSensorsLine(sensors: number, pendingAlerts: number): string {
  const s = sensors === 1 ? 'sensor' : 'sensores';
  const a = pendingAlerts === 1 ? 'alerta pendente' : 'alertas pendentes';
  return `${sensors} ${s} · ${pendingAlerts} ${a}`;
}

type TemperatureUnit = 'c' | 'f';

export function convertTemperature(celsius: number | null, unit: TemperatureUnit): number | null {
  if (celsius === null || celsius === undefined || !Number.isFinite(celsius)) return null;
  return unit === 'f' ? celsius * 1.8 + 32 : celsius;
}

export function formatTemperature(celsius: number | null, unit: TemperatureUnit, digits = 0): string {
  const v = convertTemperature(celsius, unit);
  if (v === null) return '—';
  return `${formatDecimal(v, digits)} °${unit === 'f' ? 'F' : 'C'}`;
}

export function formatDegrees(celsius: number | null, unit: TemperatureUnit, digits = 0): string {
  const v = convertTemperature(celsius, unit);
  if (v === null) return '—';
  return `${formatDecimal(v, digits)}°`;
}
