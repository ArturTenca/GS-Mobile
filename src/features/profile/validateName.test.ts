import { validateFullName } from '@/features/profile/validateName';

describe('validateFullName', () => {
  it('rejects empty or blank names', () => {
    expect(validateFullName('').error).toBe('Informe seu nome.');
    expect(validateFullName('   ').error).toBe('Informe seu nome.');
  });

  it('accepts 120 characters and rejects 121', () => {
    expect(validateFullName('a'.repeat(120))).toEqual({ value: 'a'.repeat(120), error: null });
    expect(validateFullName('a'.repeat(121)).error).toBe('Nome muito longo.');
  });

  it('trims and collapses inner whitespace', () => {
    expect(validateFullName('  Maria  Silva ')).toEqual({ value: 'Maria Silva', error: null });
  });
});

describe('validateFullName security', () => {
  it('rejects PII and markup-ish payloads', () => {
    expect(validateFullName('a@b.com').error).toBe('Não coloque CPF, telefone ou outros dados pessoais neste campo.');
    expect(validateFullName('javascript:alert(1)').error).toBe('Use apenas letras, números e pontuação comum.');
  });
  it("accepts João D'Ávila", () => {
    expect(validateFullName("João D'Ávila")).toEqual({ value: "João D'Ávila", error: null });
  });
});
