import { redact } from '@/security/pii/engine';

/**
 * Last-seen screen data kept on this device so the app opens instantly and refreshes in
 * the background. Scoped per user, versioned, expires after 7 days and is wiped on sign-out.
 * Stored at rest, so it never holds addresses, CEP, farm boundaries or precise coordinates,
 * and free-text fields go through the PII engine first (local-storage taint sink).
 */
const VERSION = 1;
const PREFIX = 'agro.screen.';
const MAX_AGE_MS = 7 * 24 * 60 * 60_000;

type Envelope<T> = { v: number; at: number; data: T };

function storage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'> | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

const keyFor = (userId: string, name: string) => `${PREFIX}${userId}.${name}`;

export function readScreenCache<T>(userId: string | null, name: string): T | undefined {
  const s = storage();
  if (!s || !userId) return undefined;
  try {
    const raw = s.getItem(keyFor(userId, name));
    if (!raw) return undefined;
    const env = JSON.parse(raw) as Envelope<T>;
    if (env.v !== VERSION || Date.now() - env.at > MAX_AGE_MS) return undefined;
    return env.data;
  } catch {
    return undefined;
  }
}

export function writeScreenCache<T>(userId: string | null, name: string, data: T): void {
  const s = storage();
  if (!s || !userId) return;
  try {
    const env: Envelope<T> = { v: VERSION, at: Date.now(), data };
    s.setItem(keyFor(userId, name), JSON.stringify(env));
  } catch {
    // Quota or blocked storage: the cache is only an optimization.
  }
}

export function clearScreenCache(userId: string | null): void {
  const s = storage();
  if (!s || !userId) return;
  try {
    const prefix = `${PREFIX}${userId}.`;
    const keys: string[] = [];
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k && k.startsWith(prefix)) keys.push(k);
    }
    for (const k of keys) s.removeItem(k);
  } catch {
    // ignore
  }
}

const coarse = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? Math.round(n * 100) / 100 : null);
const clean = (v: unknown) => (typeof v === 'string' ? redact(v) : v);

/** Farm list without address, CEP, neighborhood or boundary; coordinates rounded (~1 km). */
export function toCachedFarms<T extends Record<string, unknown>>(farms: T[]): T[] {
  return farms.map((f) => ({
    ...f,
    name: clean(f.name),
    cep: null,
    address: null,
    neighborhood: null,
    boundary: null,
    center_lat: coarse(f.center_lat),
    center_lng: coarse(f.center_lng),
  }));
}

/** Home overview with free text (sensor/area names, alert texts) passed through the PII engine. */
export function toCachedOverview<T>(overview: T): T {
  const o = overview as unknown as {
    sensors?: Record<string, unknown>[];
    alerts?: Record<string, unknown>[];
  };
  return {
    ...(overview as object),
    sensors: (o.sensors ?? []).map((s) => ({ ...s, name: clean(s.name), areaName: clean(s.areaName) })),
    alerts: (o.alerts ?? []).map((a) => ({
      ...a,
      title: clean(a.title),
      description: clean(a.description),
      recommendation: clean(a.recommendation),
    })),
  } as T;
}
