import { sanitizeFreeText } from './sanitize';
import { scan } from '@/security/pii/engine';
import type { Category } from '@/security/pii/engine';

// A defesa contra SQL injection são as chamadas parametrizadas (supabase-js/RPC).
// A allowlist abaixo é defesa em profundidade na borda do formulário.

export type FieldName = 'name' | 'farmName' | 'street' | 'neighborhood' | 'city' | 'mainCrop' | 'sensorName';

export type FieldPolicy = { max: number; allow: RegExp; blockCategories: Category[] };

const ALLOW = /^[\p{L}\p{M}\p{N} .,'’\-–_()&/ºª]*$/u;
const BLOCK: Category[] = ['identity', 'contact', 'financial', 'credential', 'health', 'location'];

function policy(max: number): FieldPolicy {
  return { max, allow: ALLOW, blockCategories: BLOCK };
}

export const FIELD_POLICIES: Record<FieldName, FieldPolicy> = {
  name: policy(120),
  farmName: policy(120),
  street: policy(160),
  neighborhood: policy(120),
  city: policy(80),
  mainCrop: policy(60),
  sensorName: policy(120),
};

export const ERR_FIELD_CHARS = 'Use apenas letras, números e pontuação comum.';
export const ERR_FIELD_PII = 'Não coloque CPF, telefone ou outros dados pessoais neste campo.';
export const ERR_FIELD_LONG = 'Texto muito longo.';

export type FieldValidation = { ok: true; value: string } | { ok: false; error: string };

export function validateField(field: FieldName, raw: string): FieldValidation {
  const p = FIELD_POLICIES[field];
  const value = sanitizeFreeText(raw, { max: Number.MAX_SAFE_INTEGER });
  if (value.length > p.max) return { ok: false, error: ERR_FIELD_LONG };
  if (scan(value, { categories: p.blockCategories }).length > 0) return { ok: false, error: ERR_FIELD_PII };
  if (!p.allow.test(value)) return { ok: false, error: ERR_FIELD_CHARS };
  return { ok: true, value };
}
