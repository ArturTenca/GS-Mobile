import { INPUT_LIMITS } from './limits';
import { sanitizeEmailInput, sanitizePasswordInput, sanitizeTextField } from './sanitize';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type LoginValidationResult =
  | { ok: true; email: string; password: string }
  | { ok: false; error: string };

export type SignupValidationResult =
  | { ok: true; name: string; email: string; password: string }
  | { ok: false; error: string };

export type NewPasswordValidationResult = { ok: true; password: string } | { ok: false; error: string };

const ERR_EMAIL = 'Informe um e-mail válido.';
const ERR_MIN = `Use pelo menos ${INPUT_LIMITS.PASSWORD_MIN} caracteres.`;

function isValidEmailFormat(email: string): boolean {
  return email.length <= INPUT_LIMITS.EMAIL_MAX && EMAIL_PATTERN.test(email);
}

/** Login não aplica o mínimo de 8 caracteres (contas existentes). */
export function validateLoginCredentials(email: string, password: string): LoginValidationResult {
  const e = sanitizeEmailInput(email);
  const p = sanitizePasswordInput(password);
  if (!e || !p) return { ok: false, error: 'Preencha e-mail e senha.' };
  if (!isValidEmailFormat(e)) return { ok: false, error: ERR_EMAIL };
  return { ok: true, email: e.toLowerCase(), password: p };
}

export function validateSignup(name: string, email: string, password: string): SignupValidationResult {
  const n = sanitizeTextField(name, INPUT_LIMITS.NAME_MAX + 1).trim();
  if (!n) return { ok: false, error: 'Informe seu nome.' };
  if (n.length > INPUT_LIMITS.NAME_MAX) return { ok: false, error: 'Nome muito longo.' };
  const e = sanitizeEmailInput(email);
  if (!isValidEmailFormat(e)) return { ok: false, error: ERR_EMAIL };
  const p = sanitizePasswordInput(password);
  if (p.length < INPUT_LIMITS.PASSWORD_MIN) return { ok: false, error: ERR_MIN };
  return { ok: true, name: n, email: e.toLowerCase(), password: p };
}

export function validateNewPassword(password: string): NewPasswordValidationResult {
  if (password.length > INPUT_LIMITS.PASSWORD_MAX) return { ok: false, error: 'Senha muito longa.' };
  const p = sanitizePasswordInput(password);
  if (p.length < INPUT_LIMITS.PASSWORD_MIN) return { ok: false, error: ERR_MIN };
  return { ok: true, password: p };
}
