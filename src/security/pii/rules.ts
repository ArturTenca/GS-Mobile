import { inBrazilBbox, isValidCnpj, isValidCpf, isValidDdd, luhn, shannonEntropy } from './validators.ts';
import type { Rule } from './types.ts';

// Regras declarativas. Todos os padroes sao lineares e limitados (sem
// quantificadores aninhados); o motor ainda corta a entrada em maxLength.

const CODE_WORDS = new Set([
  'string', 'number', 'boolean', 'undefined', 'null', 'true', 'false', 'void', 'any', 'unknown',
  'required', 'optional', 'value', 'input', 'text', 'password', 'secret', 'token',
]);

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

function validPhone(matched: string): boolean {
  let digits = digitsOnly(matched);
  if (/^\+?55/.test(matched.trim()) && digits.length >= 12) digits = digits.slice(2);
  if (digits.length !== 10 && digits.length !== 11) return false;
  if (!isValidDdd(digits.slice(0, 2))) return false;
  if (digits.length === 11 && digits[2] !== '9') return false;
  return true;
}

function validCard(matched: string): boolean {
  const digits = digitsOnly(matched);
  if (!luhn(digits)) return false;
  if (isValidCpf(digits) || isValidCnpj(digits)) return false;
  const p2 = Number(digits.slice(0, 2));
  const p4 = Number(digits.slice(0, 4));
  if (digits[0] === '4') return true; // Visa e Elo
  if (p2 >= 51 && p2 <= 55) return true; // Mastercard
  if (p4 >= 2221 && p4 <= 2720) return true; // Mastercard
  if (p2 === 34 || p2 === 37) return true; // Amex
  if (p2 === 36 || p2 === 38 || p2 === 35) return true; // Diners, JCB
  if (p2 === 50 || p2 === 65 || p4 === 6011 || p2 === 63) return true; // Elo, Discover, Hipercard
  return false;
}

function validJwt(matched: string): boolean {
  const head = matched.split('.')[0];
  const b64 = head.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  if (typeof atob !== 'function') return true;
  try {
    const parsed: unknown = JSON.parse(atob(padded));
    return typeof parsed === 'object' && parsed !== null && 'alg' in parsed;
  } catch {
    return false;
  }
}

function validGenericSecret(matched: string): boolean {
  if (matched.startsWith('sk-')) {
    return shannonEntropy(matched.replace(/^sk-(?:proj-)?/, '')) >= 3.5;
  }
  return true;
}

function validPasswordValue(matched: string): boolean {
  const value = matched.replace(/^[^:=]*[:=][ ]*["']?/, '');
  if (value.length < 4) return false;
  if (/^[<{$[]/.test(value)) return false; // placeholders e templates
  if (/^[x*•.]+$/i.test(value)) return false;
  if (/process\.env|import\.meta|\(|\)/.test(value)) return false;
  if (CODE_WORDS.has(value.toLowerCase())) return false;
  if (/^[A-Za-z_]+(?:\.[A-Za-z_]+)+$/.test(value)) return false; // acesso a propriedade
  return true;
}

function validEmail(matched: string): boolean {
  const tld = matched.slice(matched.lastIndexOf('.') + 1);
  return /^[A-Za-z]{2,}$/.test(tld);
}

function validCepPlain(matched: string, ctx: { before: string }): boolean {
  if (matched.includes('-')) return true;
  return /cep/i.test(ctx.before.slice(-12));
}

function validGeoPrecise(matched: string): boolean {
  const nums = matched.match(/[-+]?\d{1,3}\.\d+/g);
  if (!nums || nums.length < 2) return false;
  return inBrazilBbox(Number(nums[0]), Number(nums[1]));
}

export const RULES: Rule[] = [
  {
    id: 'cpf',
    category: 'identity',
    severity: 'critical',
    pattern: /(?<!\d)\d{3}[. ]?\d{3}[. ]?\d{3}[- ]?\d{2}(?!\d)/g,
    validate: (m) => isValidCpf(m),
    redact: 'mask-keep-last2',
  },
  {
    id: 'cpf_masked',
    category: 'identity',
    severity: 'low',
    pattern: /[*•]{3}\.[*•]{3}\.[*•]{3}-\d{2}|[*•]{3}\.\d{3}\.\d{3}-[*•]{2}/g,
    redact: 'tag',
  },
  {
    id: 'cnpj',
    category: 'identity',
    severity: 'high',
    pattern: /(?<!\d)\d{2}[. ]?\d{3}[. ]?\d{3}[/ ]?\d{4}[- ]?\d{2}(?!\d)/g,
    validate: (m) => isValidCnpj(m),
    redact: 'tag',
  },
  {
    id: 'rg',
    category: 'identity',
    severity: 'medium',
    pattern: /(?<![\d.])\d{1,2}\.?\d{3}\.?\d{3}-?[0-9Xx](?![\w])/g,
    contextWords: { words: /(?:\brg\b|identidade|registro geral)/i, window: 25, required: true },
    redact: 'tag',
  },
  {
    id: 'email',
    category: 'contact',
    severity: 'medium',
    pattern: /[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]{1,63}(?:\.[A-Za-z0-9-]{1,63}){1,3}/g,
    validate: (m) => validEmail(m),
    redact: 'mask-email',
  },
  {
    id: 'br_phone',
    category: 'contact',
    severity: 'medium',
    pattern: /(?<!\d)(?:\+?55[ ]?)?\(?[1-9][0-9]\)?[ ]?9?\d{4}[- ]?\d{4}(?!\d)/g,
    validate: (m) => validPhone(m),
    redact: 'mask-phone',
  },
  {
    id: 'cep',
    category: 'address',
    severity: 'low',
    pattern: /(?<!\d)(?:\d{5}-\d{3}|\d{8})(?!\d)/g,
    validate: (m, ctx) => validCepPlain(m, ctx),
    redact: 'tag',
  },
  {
    id: 'card',
    category: 'financial',
    severity: 'critical',
    pattern: /(?<!\d)(?:\d[ -]?){12,18}\d(?!\d)/g,
    validate: (m) => validCard(m),
    redact: 'tag',
  },
  {
    id: 'jwt',
    category: 'credential',
    severity: 'critical',
    pattern: /eyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,
    validate: (m) => validJwt(m),
    redact: 'drop',
  },
  {
    id: 'anthropic_key',
    category: 'credential',
    severity: 'critical',
    pattern: /sk-ant-[A-Za-z0-9_-]{20,}/g,
    validate: () => true,
    redact: 'drop',
  },
  {
    id: 'generic_secret_key',
    category: 'credential',
    severity: 'critical',
    pattern: /\bsk-(?:proj-)?[A-Za-z0-9]{20,}\b|\bAKIA[0-9A-Z]{16}\b|-----BEGIN [A-Z ]{0,20}PRIVATE KEY-----/g,
    validate: (m) => validGenericSecret(m),
    redact: 'drop',
  },
  {
    id: 'supabase_secret',
    category: 'credential',
    severity: 'critical',
    pattern: /\bsb_secret_[A-Za-z0-9_-]{20,}/g,
    validate: () => true,
    redact: 'drop',
  },
  {
    id: 'supabase_publishable',
    category: 'credential',
    severity: 'low',
    pattern: /\bsb_publishable_[A-Za-z0-9_-]{20,}/g,
    validate: () => true,
    redact: 'drop',
  },
  {
    id: 'expo_push_token',
    category: 'credential',
    severity: 'medium',
    pattern: /Expo(?:nent)?PushToken\[[A-Za-z0-9_-]{10,}\]/g,
    validate: () => true,
    redact: 'drop',
  },
  {
    id: 'password_kv',
    category: 'credential',
    severity: 'high',
    pattern: /\b(?:senha|password|passwd|pwd|secret|token|api[_-]?key)\b[ ]{0,3}[:=][ ]{0,3}["']?[^\s"',;]{4,}/gi,
    validate: (m) => validPasswordValue(m),
    redact: 'drop',
  },
  {
    id: 'cid10',
    category: 'health',
    severity: 'high',
    pattern: /\b[A-TV-Z]\d{2}(?:\.\d{1,2})?\b/g,
    contextWords: { words: /(?:\bcid\b|diagn[oó]stico|laudo|doen[cç]a)/i, window: 30, required: true },
    redact: 'tag',
  },
  {
    id: 'health_keyword',
    category: 'health',
    severity: 'medium',
    pattern:
      /(?<![\p{L}])(?:diagn[oó]stico|laudo|atestado|receita m[eé]dica|prontu[aá]rio|hipertens\p{L}*|diabet\p{L}*|hiv|aids|c[aâ]ncer|tumor|depress[aã]o|ansiedade|gestante|gr[aá]vida|internad\p{L}*|cirurgia|medicamento controlado)(?![\p{L}])/giu,
    redact: 'tag',
  },
  {
    id: 'geo_precise',
    category: 'location',
    severity: 'high',
    pattern: /(?<![\d.])[-+]?\d{1,2}\.\d{4,}(?:[ ]{0,2}[,;/][ ]{0,2}|[ ]{1,3})[-+]?\d{1,3}\.\d{4,}/g,
    validate: (m) => validGeoPrecise(m),
    redact: 'tag',
  },
  {
    id: 'geo_single',
    category: 'location',
    severity: 'medium',
    pattern: /\b(?:latitude|longitude|lat|lng|lon)\b[ ]{0,2}[:=]?[ ]{0,2}[-+]?\d{1,3}\.\d{5,}/gi,
    validate: () => true,
    redact: 'tag',
  },
];
