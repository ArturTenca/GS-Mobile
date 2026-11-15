import { Platform } from 'react-native';

import { ServiceError } from '@/services/ServiceError';

// CEP lookup + geocoding chain (D-06): BrasilAPI v2 -> ViaCEP -> Nominatim.
// Only CEP, street, city and UF leave the device. No user id, email or farm name.
// Nominatim policy: max 1 req/s, no autocomplete -> calls are sequenced and cached.

export const GEOCODING_CONFIG = {
  brasilApi: 'https://brasilapi.com.br/api/cep/v2/',
  viaCep: 'https://viacep.com.br/ws/',
  nominatim: 'https://nominatim.openstreetmap.org/search',
  timeoutMs: 8000,
} as const;

export type LocationPrecision = 'street' | 'approx' | 'postcode' | 'city' | 'none';

export interface CepResult {
  found: boolean;
  cep: string;
  street: string | null;
  neighborhood: string | null;
  city: string;
  state: string;
  lat: number | null;
  lng: number | null;
  precision: LocationPrecision;
}

export interface LocationResult {
  lat: number | null;
  lng: number | null;
  precision: LocationPrecision;
}

export interface LocationInput {
  cep?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
}

const NETWORK_MESSAGE = 'Não foi possível buscar o CEP. Verifique sua internet.';
const CEP_PATTERN = /^\d{8}$/;

type FetchOutcome = { kind: 'ok'; data: unknown } | { kind: 'notfound' } | { kind: 'error' };

const cepCache = new Map<string, CepResult>();
const locationCache = new Map<string, LocationResult>();
let nominatimQueue: Promise<unknown> = Promise.resolve();

/** Test helper: clears module caches. */
export function resetGeocodingCache(): void {
  cepCache.clear();
  locationCache.clear();
  nominatimQueue = Promise.resolve();
}

async function fetchJson(url: string): Promise<FetchOutcome> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEOCODING_CONFIG.timeoutMs);
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (Platform.OS !== 'web') headers['User-Agent'] = 'AgroAlerta/1.0';
    const response = await fetch(url, { method: 'GET', headers, signal: controller.signal });
    if (response.status === 404) return { kind: 'notfound' };
    if (!response.ok) return { kind: 'error' };
    return { kind: 'ok', data: (await response.json()) as unknown };
  } catch {
    return { kind: 'error' };
  } finally {
    clearTimeout(timeoutId);
  }
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null;
}

function coord(v: unknown, min: number, max: number): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

interface Address {
  street: string | null;
  neighborhood: string | null;
  city: string;
  state: string;
  lat: number | null;
  lng: number | null;
}

function parseBrasilApi(data: unknown): Address | null {
  const r = asRecord(data);
  if (!r) return null;
  const city = str(r.city);
  const state = str(r.state);
  if (!city || !state) return null;
  const coordinates = asRecord(asRecord(r.location)?.coordinates);
  return {
    street: str(r.street),
    neighborhood: str(r.neighborhood),
    city,
    state,
    lat: coordinates ? coord(coordinates.latitude, -90, 90) : null,
    lng: coordinates ? coord(coordinates.longitude, -180, 180) : null,
  };
}

function parseViaCep(data: unknown): Address | null {
  const r = asRecord(data);
  if (!r || r.erro !== undefined) return null;
  const city = str(r.localidade);
  const state = str(r.uf);
  if (!city || !state) return null;
  return { street: str(r.logradouro), neighborhood: str(r.bairro), city, state, lat: null, lng: null };
}

/** One Nominatim request at a time (policy), failures resolve to null. */
function nominatim(params: Record<string, string>): Promise<{ lat: number; lng: number } | null> {
  const run = async (): Promise<{ lat: number; lng: number } | null> => {
    const query = new URLSearchParams({ format: 'jsonv2', limit: '1', country: 'Brazil', ...params });
    const outcome = await fetchJson(`${GEOCODING_CONFIG.nominatim}?${query.toString()}`);
    if (outcome.kind !== 'ok' || !Array.isArray(outcome.data) || outcome.data.length === 0) return null;
    const first = asRecord(outcome.data[0]);
    if (!first) return null;
    const lat = coord(first.lat, -90, 90);
    const lng = coord(first.lon, -180, 180);
    return lat === null || lng === null ? null : { lat, lng };
  };
  const next = nominatimQueue.then(run, run);
  nominatimQueue = next.catch(() => undefined);
  return next;
}

interface ChainInput {
  cep: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  approx: { lat: number; lng: number } | null;
}

async function coordinateChain(input: ChainInput): Promise<LocationResult> {
  // Sequential on purpose (never Promise.all): Nominatim allows 1 request per second.
  if (input.street && input.city) {
    const hit = await nominatim({ street: input.street, city: input.city, state: input.state ?? '' });
    if (hit) return { ...hit, precision: 'street' };
  }
  if (input.approx) return { ...input.approx, precision: 'approx' };
  if (input.cep) {
    const hit = await nominatim({ postalcode: input.cep });
    if (hit) return { ...hit, precision: 'postcode' };
  }
  if (input.city) {
    const hit = await nominatim({ city: input.city, state: input.state ?? '' });
    if (hit) return { ...hit, precision: 'city' };
  }
  return { lat: null, lng: null, precision: 'none' };
}

export async function lookupCep(cep: string): Promise<CepResult> {
  if (!CEP_PATTERN.test(cep)) throw new ServiceError('Digite os 8 números do CEP.');
  const cached = cepCache.get(cep);
  if (cached) return cached;

  const brasil = await fetchJson(`${GEOCODING_CONFIG.brasilApi}${encodeURIComponent(cep)}`);
  let address = brasil.kind === 'ok' ? parseBrasilApi(brasil.data) : null;

  if (!address) {
    const via = await fetchJson(`${GEOCODING_CONFIG.viaCep}${encodeURIComponent(cep)}/json/`);
    if (via.kind === 'error' && brasil.kind !== 'ok') throw new ServiceError(NETWORK_MESSAGE);
    address = via.kind === 'ok' ? parseViaCep(via.data) : null;
  }

  if (!address) {
    const miss: CepResult = {
      found: false,
      cep,
      street: null,
      neighborhood: null,
      city: '',
      state: '',
      lat: null,
      lng: null,
      precision: 'none',
    };
    cepCache.set(cep, miss);
    return miss;
  }

  const approx = address.lat !== null && address.lng !== null ? { lat: address.lat, lng: address.lng } : null;
  const location = await coordinateChain({
    cep,
    street: address.street,
    city: address.city,
    state: address.state,
    approx,
  });
  const result: CepResult = {
    found: true,
    cep,
    street: address.street,
    neighborhood: address.neighborhood,
    city: address.city,
    state: address.state,
    lat: location.lat,
    lng: location.lng,
    precision: location.precision,
  };
  cepCache.set(cep, result);
  return result;
}

export async function resolveLocation(input: LocationInput): Promise<LocationResult> {
  try {
    const cep = input.cep && CEP_PATTERN.test(input.cep) ? input.cep : null;
    const street = input.street?.trim() || null;
    const city = input.city?.trim() || null;
    const state = input.state?.trim() || null;
    const key = [cep, street, city, state].map((p) => (p ?? '').toLowerCase()).join('|');
    const cached = locationCache.get(key);
    if (cached) return cached;
    const result = await coordinateChain({ cep, street, city, state, approx: null });
    locationCache.set(key, result);
    return result;
  } catch {
    return { lat: null, lng: null, precision: 'none' };
  }
}
