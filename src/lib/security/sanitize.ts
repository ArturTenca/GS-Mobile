import { INPUT_LIMITS } from './limits';

/** Remove caracteres de controle e null bytes. */
export function stripControlCharacters(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

export function sanitizeEmailInput(value: string): string {
  return stripControlCharacters(value).trim().slice(0, INPUT_LIMITS.EMAIL_MAX);
}

export function sanitizePasswordInput(value: string): string {
  return stripControlCharacters(value).slice(0, INPUT_LIMITS.PASSWORD_MAX);
}

export function sanitizeTextField(value: string, maxLength: number): string {
  return stripControlCharacters(value).slice(0, maxLength);
}

const INVISIBLE_CHARS = /[​-‏‪-‮⁦-⁩﻿]/g;
const C1_CONTROLS = /[\u0080-\u009F]/g;
const ANGLE_BRACKETS = /[<>]/g;

/** Remove caracteres invisíveis/bidi/zero-width, controles C0/C1 e null bytes. */
export function stripInvisible(value: string): string {
  return stripControlCharacters(value).replace(C1_CONTROLS, '').replace(INVISIBLE_CHARS, '');
}

/** Higienização ao digitar: sem trim final, para permitir "João ". */
export function sanitizeLiveInput(value: string, max?: number): string {
  const cleaned = stripInvisible(value.normalize('NFC'))
    .replace(ANGLE_BRACKETS, '')
    .replace(/\s+/g, ' ')
    .replace(/^ /, '');
  return max === undefined ? cleaned : cleaned.slice(0, max);
}

/** Higienização final de texto livre: colapsa espaços, trim e limite. */
export function sanitizeFreeText(value: string, opts: { max: number; multiline?: boolean }): string {
  let v = stripInvisible(value.normalize('NFC')).replace(ANGLE_BRACKETS, '');
  v = opts.multiline ? v.replace(/[^\S\n]+/g, ' ').replace(/ ?\n ?/g, '\n') : v.replace(/\s+/g, ' ');
  return v.trim().slice(0, opts.max);
}
