import { formatDateTime, formatRelative, formatUpdatedAgo } from './formatTime';

const now = new Date(2026, 10, 12, 15, 0).getTime();
const min = 60_000;

describe('formatRelative', () => {
  it('agora under a minute', () => {
    expect(formatRelative(now - 30_000, now)).toBe('agora');
  });
  it('negative diff clamps to agora', () => {
    expect(formatRelative(now + 5 * min, now)).toBe('agora');
  });
  it('minutes boundary: 59 min vs 1 h', () => {
    expect(formatRelative(now - 59 * min, now)).toBe('há 59 min');
    expect(formatRelative(now - 60 * min, now)).toBe('há 1 h');
  });
  it('hours up to 23 h', () => {
    expect(formatRelative(now - 23 * 60 * min, now)).toBe('há 23 h');
  });
  it('24 h or more uses date', () => {
    const t = new Date(2026, 10, 10, 9, 5).getTime();
    expect(formatRelative(t, now)).toBe('em 10/11 às 09:05');
  });
  it('accepts ISO strings', () => {
    expect(formatRelative(new Date(now - 5 * min).toISOString(), now)).toBe('há 5 min');
  });
});

describe('formatUpdatedAgo', () => {
  it('variants', () => {
    expect(formatUpdatedAgo(now - 10_000, now)).toBe('Atualizado agora');
    expect(formatUpdatedAgo(now - 3 * min, now)).toBe('Atualizado há 3 min');
    expect(formatUpdatedAgo(now - 120 * min, now)).toBe('Atualizado há 2 h');
    expect(formatUpdatedAgo(new Date(2026, 10, 9, 8, 30).getTime(), now)).toBe(
      'Atualizado em 09/11 às 08:30',
    );
  });
  it('null -> Sem leituras recentes', () => {
    expect(formatUpdatedAgo(null, now)).toBe('Sem leituras recentes');
  });
});

describe('formatDateTime', () => {
  it('dd/MM/yyyy às HH:mm', () => {
    expect(formatDateTime(new Date(2026, 0, 5, 7, 3).getTime())).toBe('05/01/2026 às 07:03');
  });
});
