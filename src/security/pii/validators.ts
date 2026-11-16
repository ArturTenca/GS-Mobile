import { BR_BBOX, DDD_CODES } from './constants.ts';

export const SPIKE_MARKER = 'pii-ts-extension-spike';

function digitsOf(value: string): number[] {
  const only = value.replace(/\D/g, '');
  return only.length === 0 ? [] : only.split('').map(Number);
}

function allEqual(d: number[]): boolean {
  return d.every((x) => x === d[0]);
}

export function isValidCpf(value: string): boolean {
  const d = digitsOf(value);
  if (d.length !== 11 || allEqual(d)) return false;
  for (let t = 9; t < 11; t += 1) {
    let sum = 0;
    for (let i = 0; i < t; i += 1) sum += d[i] * (t + 1 - i);
    const check = ((sum * 10) % 11) % 10;
    if (check !== d[t]) return false;
  }
  return true;
}

const CNPJ_W1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_W2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

export function isValidCnpj(value: string): boolean {
  const d = digitsOf(value);
  if (d.length !== 14 || allEqual(d)) return false;
  const calc = (weights: number[]): number => {
    let sum = 0;
    for (let i = 0; i < weights.length; i += 1) sum += d[i] * weights[i];
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(CNPJ_W1) === d[12] && calc(CNPJ_W2) === d[13];
}

export function luhn(value: string): boolean {
  const d = digitsOf(value);
  if (d.length < 13 || d.length > 19) return false;
  let sum = 0;
  let dbl = false;
  for (let i = d.length - 1; i >= 0; i -= 1) {
    let x = d[i];
    if (dbl) {
      x *= 2;
      if (x > 9) x -= 9;
    }
    sum += x;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

export function isValidDdd(ddd: string): boolean {
  return DDD_CODES.includes(ddd);
}

export function inBrazilBbox(lat: number, lng: number): boolean {
  return lat >= BR_BBOX.latMin && lat <= BR_BBOX.latMax && lng >= BR_BBOX.lngMin && lng <= BR_BBOX.lngMax;
}

export function shannonEntropy(value: string): number {
  if (value.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const ch of value) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  let h = 0;
  for (const c of counts.values()) {
    const p = c / value.length;
    h -= p * Math.log2(p);
  }
  return h;
}
