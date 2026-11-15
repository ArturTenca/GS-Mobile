import {
  convertTemperature,
  firstName,
  formatDegrees,
  formatSensorsLine,
  formatTemperature,
  initials,
} from '@/lib/format';

describe('firstName', () => {
  it('returns the first word', () => {
    expect(firstName('Maria da Silva')).toBe('Maria');
  });
  it('falls back for blank or missing', () => {
    expect(firstName('  ')).toBe('produtor(a)');
    expect(firstName(undefined)).toBe('produtor(a)');
    expect(firstName(42)).toBe('produtor(a)');
  });
});

describe('initials', () => {
  it('uses first and last word', () => {
    expect(initials('Maria da Silva')).toBe('MS');
  });
  it('handles single word and empty', () => {
    expect(initials('joao')).toBe('J');
    expect(initials('')).toBe('?');
  });
});

describe('formatSensorsLine', () => {
  it('singular', () => {
    expect(formatSensorsLine(1, 1)).toBe('1 sensor · 1 alerta pendente');
  });
  it('plural', () => {
    expect(formatSensorsLine(6, 3)).toBe('6 sensores · 3 alertas pendentes');
  });
  it('zero', () => {
    expect(formatSensorsLine(0, 0)).toBe('0 sensores · 0 alertas pendentes');
  });
});

describe('temperature formatting', () => {
  it('convertTemperature', () => {
    expect(convertTemperature(25, 'c')).toBe(25);
    expect(convertTemperature(25, 'f')).toBe(77);
    expect(convertTemperature(0, 'f')).toBe(32);
    expect(convertTemperature(null, 'c')).toBeNull();
  });
  it('formatTemperature', () => {
    expect(formatTemperature(24.5, 'c', 1)).toBe('24,5 °C');
    expect(formatTemperature(25, 'f', 0)).toBe('77 °F');
    expect(formatTemperature(null, 'c')).toBe('—');
    expect(formatTemperature(24.6, 'c')).toBe('25 °C');
  });
  it('formatDegrees', () => {
    expect(formatDegrees(27.4, 'c')).toBe('27°');
    expect(formatDegrees(27.4, 'f')).toBe('81°');
    expect(formatDegrees(null, 'c')).toBe('—');
  });
});
