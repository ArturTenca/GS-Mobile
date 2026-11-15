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
