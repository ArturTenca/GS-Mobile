import { weekdayLabel, weekdayLong } from './forecast';

describe('weekdayLabel', () => {
  it('returns Hoje for the first entry', () => {
    expect(weekdayLabel('2026-11-12', 0)).toBe('Hoje');
  });
  it('returns short PT-BR weekdays from the plain date', () => {
    expect(weekdayLabel('2026-11-13', 1)).toBe('Sex');
    expect(weekdayLabel('2026-11-14', 2)).toBe('Sáb');
    expect(weekdayLabel('2026-11-15', 3)).toBe('Dom');
    expect(weekdayLabel('2026-11-16', 4)).toBe('Seg');
    expect(weekdayLabel('2026-11-17', 5)).toBe('Ter');
    expect(weekdayLabel('2026-11-18', 6)).toBe('Qua');
    expect(weekdayLabel('2026-11-19', 7)).toBe('Qui');
  });
  it('returns an empty string for malformed dates', () => {
    expect(weekdayLabel('not-a-date', 2)).toBe('');
  });
});

describe('weekdayLong', () => {
  it('returns the long weekday name', () => {
    expect(weekdayLong('2026-11-13')).toBe('sexta-feira');
    expect(weekdayLong('2026-11-15')).toBe('domingo');
    expect(weekdayLong('2026-11-14')).toBe('sábado');
  });
});
