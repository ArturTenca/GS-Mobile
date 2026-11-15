import { sanitizeEmailInput, sanitizePasswordInput, sanitizeTextField } from './sanitize';
import { validateLoginCredentials, validateNewPassword, validateSignup } from './validate';

describe('sanitize', () => {
  it('strips control chars and trims e-mail', () => {
    expect(sanitizeEmailInput('  a\u0000@b.com\u0007 ')).toBe('a@b.com');
  });
  it('caps e-mail at 254', () => {
    expect(sanitizeEmailInput('a'.repeat(300))).toHaveLength(254);
  });
  it('does not trim password, caps at 128', () => {
    expect(sanitizePasswordInput(' pw\u0001 ')).toBe(' pw ');
    expect(sanitizePasswordInput('x'.repeat(200))).toHaveLength(128);
  });
  it('sanitizeTextField caps', () => {
    expect(sanitizeTextField('ab\u0000cd', 3)).toBe('abc');
  });
});

describe('validateLoginCredentials', () => {
  it('rejects empty', () => {
    expect(validateLoginCredentials('', 'x')).toEqual({ ok: false, error: 'Preencha e-mail e senha.' });
    expect(validateLoginCredentials('a@b.com', '')).toEqual({ ok: false, error: 'Preencha e-mail e senha.' });
  });
  it('rejects bad format', () => {
    expect(validateLoginCredentials('abc', 'x')).toEqual({ ok: false, error: 'Informe um e-mail válido.' });
  });
  it('lowercases e-mail and accepts short password', () => {
    expect(validateLoginCredentials(' A@B.com ', '123')).toEqual({ ok: true, email: 'a@b.com', password: '123' });
  });
});

describe('validateSignup', () => {
  it('requires name', () => {
    expect(validateSignup('   ', 'a@b.com', '12345678')).toEqual({ ok: false, error: 'Informe seu nome.' });
  });
  it('rejects long name', () => {
    expect(validateSignup('n'.repeat(121), 'a@b.com', '12345678')).toEqual({ ok: false, error: 'Nome muito longo.' });
  });
  it('rejects bad e-mail', () => {
    expect(validateSignup('Ana', 'x', '12345678')).toEqual({ ok: false, error: 'Informe um e-mail válido.' });
  });
  it('rejects short password', () => {
    expect(validateSignup('Ana', 'a@b.com', '1234567')).toEqual({ ok: false, error: 'Use pelo menos 8 caracteres.' });
  });
  it('accepts valid', () => {
    expect(validateSignup(' Ana ', 'A@B.com', '12345678')).toEqual({
      ok: true,
      name: 'Ana',
      email: 'a@b.com',
      password: '12345678',
    });
  });
});

describe('validateNewPassword', () => {
  it('rejects short and long', () => {
    expect(validateNewPassword('123')).toEqual({ ok: false, error: 'Use pelo menos 8 caracteres.' });
    expect(validateNewPassword('x'.repeat(129))).toEqual({ ok: false, error: 'Senha muito longa.' });
  });
  it('accepts valid', () => {
    expect(validateNewPassword('12345678')).toEqual({ ok: true, password: '12345678' });
  });
});
