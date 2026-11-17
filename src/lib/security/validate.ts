import { INPUT_LIMITS } from './limits';
import { validateField } from './fieldPolicies';
import { sanitizeTextField, stripControlCharacters } from './sanitize';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type LoginValidationResult =
  | { ok: true; email: string; password: string }
  | { ok: false; error: string };

export type SignupField = 'name' | 'email' | 'password';

export type SignupValidationResult =
  | { ok: true; name: string; email: string; password: string }
  | { ok: false; field: SignupField; error: string };

export type NewPasswordValidationResult = { ok: true; password: string } | { ok: false; error: string };

export type PasswordStrengthResult = { ok: true } | { ok: false; error: string };

const ERR_EMAIL = 'Informe um e-mail válido.';
const ERR_MIN = `A senha precisa ter no mínimo ${INPUT_LIMITS.PASSWORD_MIN} caracteres.`;
const ERR_LONG = 'Senha muito longa.';
const ERR_NO_DIGIT = 'A senha precisa ter pelo menos um número.';
const ERR_NO_LETTER = 'A senha precisa ter pelo menos uma letra.';
const ERR_HAS_EMAIL = 'A senha não pode conter seu e-mail.';
const ERR_COMMON = 'Essa senha é muito comum. Escolha outra.';

/** Senhas muito comuns (BR/pt-BR e globais); comparação em minúsculas. */
const COMMON_PASSWORDS = new Set([
  '12345678',
  '123456789',
  '1234567890',
  '11111111',
  '00000000',
  'senha123',
  'senha1234',
  'senha12345',
  'brasil123',
  'brasil2024',
  'brasil2025',
  'agroalerta',
  'agroalerta1',
  'agro12345',
  'agrovigia',
  'qwerty123',
  'qwertyui',
  'password',
  'password1',
  'password123',
  'mudar123',
  'abc12345',
  'abcd1234',
  'fazenda123',
  'trator123',
  'iloveyou1',
]);

function isValidEmailFormat(email: string): boolean {
  return email.length <= INPUT_LIMITS.EMAIL_MAX && EMAIL_PATTERN.test(email);
}

/** E-mail: remove controles e espaços nas pontas, sem truncar (excesso vira erro). */
function cleanEmail(email: string): string {
  return stripControlCharacters(email).trim();
}

/** Regra de força para cadastro/redefinição (login não usa: contas existentes). */
export function validatePasswordStrength(password: string, email?: string): PasswordStrengthResult {
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) return { ok: false, error: ERR_COMMON };
  if (!/[0-9]/.test(password)) return { ok: false, error: ERR_NO_DIGIT };
  if (!/[A-Za-zÀ-ÿ]/.test(password)) return { ok: false, error: ERR_NO_LETTER };
  const local = (email ?? '').split('@')[0]?.toLowerCase() ?? '';
  if (local.length >= 3 && lower.includes(local)) return { ok: false, error: ERR_HAS_EMAIL };
  return { ok: true };
}

/** Login não aplica o mínimo de 8 caracteres nem a regra de força (contas existentes). */
export function validateLoginCredentials(email: string, password: string): LoginValidationResult {
  const e = cleanEmail(email);
  if (!e || !password) return { ok: false, error: 'Preencha e-mail e senha.' };
  if (!isValidEmailFormat(e)) return { ok: false, error: ERR_EMAIL };
  if (password.length > INPUT_LIMITS.PASSWORD_MAX) return { ok: false, error: ERR_LONG };
  return { ok: true, email: e.toLowerCase(), password };
}

export function validateSignup(name: string, email: string, password: string): SignupValidationResult {
  const n = sanitizeTextField(name, INPUT_LIMITS.NAME_MAX + 1).trim();
  if (!n) return { ok: false, field: 'name', error: 'Informe seu nome.' };
  if (n.length > INPUT_LIMITS.NAME_MAX) return { ok: false, field: 'name', error: 'Nome muito longo.' };
  const nameCheck = validateField('name', n);
  if (!nameCheck.ok) return { ok: false, field: 'name', error: nameCheck.error };
  const e = cleanEmail(email);
  if (!isValidEmailFormat(e)) return { ok: false, field: 'email', error: ERR_EMAIL };
  if (password.length > INPUT_LIMITS.PASSWORD_MAX) return { ok: false, field: 'password', error: ERR_LONG };
  if (password.length < INPUT_LIMITS.PASSWORD_MIN) return { ok: false, field: 'password', error: ERR_MIN };
  const strength = validatePasswordStrength(password, e);
  if (!strength.ok) return { ok: false, field: 'password', error: strength.error };
  return { ok: true, name: nameCheck.value, email: e.toLowerCase(), password };
}

export function validateNewPassword(password: string): NewPasswordValidationResult {
  if (password.length > INPUT_LIMITS.PASSWORD_MAX) return { ok: false, error: ERR_LONG };
  if (password.length < INPUT_LIMITS.PASSWORD_MIN) return { ok: false, error: ERR_MIN };
  const strength = validatePasswordStrength(password);
  if (!strength.ok) return { ok: false, error: strength.error };
  return { ok: true, password };
}
