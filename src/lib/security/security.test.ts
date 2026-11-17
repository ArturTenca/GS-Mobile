import {
  sanitizeEmailInput,
  sanitizeFreeText,
  sanitizeLiveInput,
  sanitizePasswordInput,
  sanitizeTextField,
} from './sanitize';
import {
  validateLoginCredentials,
  validateNewPassword,
  validatePasswordStrength,
  validateSignup,
} from './validate';

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
  it('lowercases e-mail and accepts weak existing password', () => {
    expect(validateLoginCredentials(' A@B.com ', '123')).toEqual({ ok: true, email: 'a@b.com', password: '123' });
    expect(validateLoginCredentials('a@b.com', '12345678').ok).toBe(true);
  });
  it('rejects overlong password and e-mail instead of truncating', () => {
    expect(validateLoginCredentials('a@b.com', 'x'.repeat(129))).toEqual({ ok: false, error: 'Senha muito longa.' });
    expect(validateLoginCredentials(`${'a'.repeat(250)}@b.com`, 'x')).toEqual({
      ok: false,
      error: 'Informe um e-mail válido.',
    });
  });
});

describe('validatePasswordStrength', () => {
  it.each(['12345678', 'senha123', 'abcdefgh', 'brasil123'])('rejects %s', (p) => {
    expect(validatePasswordStrength(p).ok).toBe(false);
  });
  it('rejects password containing the e-mail local part', () => {
    expect(validatePasswordStrength('ABCD1234x', 'abcd1234@x.com').ok).toBe(false);
    expect(validatePasswordStrength('Meujoao9', 'joao@x.com').ok).toBe(false);
  });
  it('accepts a strong password', () => {
    expect(validatePasswordStrength('Trator-7azul', 'ana@x.com')).toEqual({ ok: true });
  });
});

describe('validateSignup', () => {
  const STRONG = 'Trator-7azul';
  it('requires name', () => {
    expect(validateSignup('   ', 'a@b.com', STRONG)).toEqual({ ok: false, field: 'name', error: 'Informe seu nome.' });
  });
  it('rejects long name (reachable branch)', () => {
    expect(validateSignup('n'.repeat(121), 'a@b.com', STRONG)).toEqual({
      ok: false,
      field: 'name',
      error: 'Nome muito longo.',
    });
  });
  it('rejects bad e-mail', () => {
    expect(validateSignup('Ana', 'x', STRONG)).toEqual({ ok: false, field: 'email', error: 'Informe um e-mail válido.' });
  });
  it('rejects short password', () => {
    expect(validateSignup('Ana', 'a@b.com', 'ab1')).toEqual({
      ok: false,
      field: 'password',
      error: 'A senha precisa ter no mínimo 8 caracteres.',
    });
  });
  it('rejects weak and common passwords with password field', () => {
    expect(validateSignup('Ana', 'a@b.com', '12345678')).toMatchObject({ ok: false, field: 'password' });
    expect(validateSignup('Ana', 'a@b.com', 'abcdefgh')).toMatchObject({ ok: false, field: 'password' });
  });
  it('does not truncate overlong password', () => {
    expect(validateSignup('Ana', 'a@b.com', 'a1'.repeat(70))).toEqual({
      ok: false,
      field: 'password',
      error: 'Senha muito longa.',
    });
  });
  it('accepts valid', () => {
    expect(validateSignup(' Ana ', 'A@B.com', STRONG)).toEqual({
      ok: true,
      name: 'Ana',
      email: 'a@b.com',
      password: STRONG,
    });
  });
});

describe('validateNewPassword', () => {
  it('rejects short and long', () => {
    expect(validateNewPassword('123')).toEqual({ ok: false, error: 'A senha precisa ter no mínimo 8 caracteres.' });
    expect(validateNewPassword('x'.repeat(129))).toEqual({ ok: false, error: 'Senha muito longa.' });
  });
  it('rejects weak', () => {
    expect(validateNewPassword('12345678').ok).toBe(false);
    expect(validateNewPassword('abcdefgh').ok).toBe(false);
  });
  it('requires at least one number and one letter, with specific messages', () => {
    expect(validateNewPassword('Plantacao')).toEqual({ ok: false, error: 'A senha precisa ter pelo menos um número.' });
    expect(validateNewPassword('20242025')).toEqual({ ok: false, error: 'A senha precisa ter pelo menos uma letra.' });
    expect(validateNewPassword('Colheita7')).toEqual({ ok: true, password: 'Colheita7' });
  });
  it('accepts valid', () => {
    expect(validateNewPassword('Trator-7azul')).toEqual({ ok: true, password: 'Trator-7azul' });
  });
});

describe('sanitizeFreeText / sanitizeLiveInput', () => {
  it('strips angle brackets, invisibles and collapses whitespace', () => {
    expect(sanitizeFreeText('  a <b>​  c‮ ', { max: 50 })).toBe('a b c');
  });
  it('normalizes to NFC', () => {
    expect(sanitizeFreeText('João', { max: 50 })).toBe('João');
  });
  it('caps at max', () => {
    expect(sanitizeFreeText('x'.repeat(30), { max: 10 })).toHaveLength(10);
  });
  it('live input keeps the trailing space', () => {
    expect(sanitizeLiveInput('João ')).toBe('João ');
    expect(sanitizeLiveInput('a<b>c')).toBe('abc');
  });
});
