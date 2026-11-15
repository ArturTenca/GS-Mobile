import { ServiceError } from './ServiceError';

/**
 * Open-Meteo forecast endpoint. The free tier is for non-commercial use; switching
 * to a paid plan (customer host plus an access key) is a change to this constant
 * and the query params only.
 */
export const WEATHER_BASE_URL = 'https://api.open-meteo.com/v1/forecast';

const TIMEOUT_MS = 8000;
const ERROR_MESSAGE = 'Não foi possível carregar a previsão.';

const CURRENT_FIELDS = 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation';
const DAILY_FIELDS = 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max';

export type ForecastCurrent = {
  temperatureC: number;
  humidityPct: number;
  windKmh: number;
  precipitationMm: number;
  weatherCode: number;
  time: string;
};

export type ForecastDay = {
  date: string;
  weatherCode: number;
  maxC: number;
  minC: number;
  rainProbabilityPct: number | null;
};

export type Forecast = {
  current: ForecastCurrent;
  days: ForecastDay[];
  timezone: string;
};

/** Rounds to 2 decimals (about 1 km) so precise farm coordinates never leave the device (T-02.2-19). */
export function roundCoord(n: number): number {
  return Math.round(n * 100) / 100;
}

class InvalidPayload extends Error {}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function finite(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new InvalidPayload('non-finite number');
  return v;
}

function str(v: unknown): string {
  if (typeof v !== 'string') throw new InvalidPayload('expected string');
  return v;
}

function arr(v: unknown, length: number): unknown[] {
  if (!Array.isArray(v) || v.length !== length) throw new InvalidPayload('bad daily array');
  return v;
}

function parseForecast(json: unknown): Forecast {
  if (!isRecord(json) || !isRecord(json.current) || !isRecord(json.daily)) {
    throw new InvalidPayload('missing blocks');
  }
  const c = json.current;
  const d = json.daily;
  if (!Array.isArray(d.time) || d.time.length === 0) throw new InvalidPayload('missing daily.time');
  const n = d.time.length;
  const codes = arr(d.weather_code, n);
  const max = arr(d.temperature_2m_max, n);
  const min = arr(d.temperature_2m_min, n);
  const rain = arr(d.precipitation_probability_max, n);

  return {
    timezone: typeof json.timezone === 'string' ? json.timezone : '',
    current: {
      temperatureC: finite(c.temperature_2m),
      humidityPct: finite(c.relative_humidity_2m),
      windKmh: finite(c.wind_speed_10m),
      precipitationMm: finite(c.precipitation),
      weatherCode: finite(c.weather_code),
      time: str(c.time),
    },
    days: d.time.map((date, i) => ({
      date: str(date),
      weatherCode: finite(codes[i]),
      maxC: finite(max[i]),
      minC: finite(min[i]),
      rainProbabilityPct: rain[i] === null ? null : finite(rain[i]),
    })),
  };
}

/**
 * Current conditions + 7-day forecast for a point. Always Celsius and km/h (the UI
 * converts). Only rounded coordinates and forecast params are sent; no key, no user data.
 */
export async function getForecast(lat: number, lng: number): Promise<Forecast> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new ServiceError(ERROR_MESSAGE, new Error('invalid coordinates'));
  }
  const params = new URLSearchParams({
    latitude: String(roundCoord(lat)),
    longitude: String(roundCoord(lng)),
    current: CURRENT_FIELDS,
    daily: DAILY_FIELDS,
    timezone: 'auto',
    forecast_days: '7',
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${WEATHER_BASE_URL}?${params.toString()}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json: unknown = await res.json();
    return parseForecast(json);
  } catch (e) {
    throw new ServiceError(ERROR_MESSAGE, e);
  } finally {
    clearTimeout(timer);
  }
}
