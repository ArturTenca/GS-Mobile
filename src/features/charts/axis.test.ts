import { buildXLabels } from '@/features/charts/axis';

const H = 3_600_000;

function hourly(start: Date, count: number, stepH = 1) {
  const out: { t: number; v: number }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate(), start.getHours() + i * stepH);
    out.push({ t: d.getTime(), v: i });
  }
  return out;
}

describe('buildXLabels 24h', () => {
  it('labels hours multiple of 6 with HHh and blanks elsewhere', () => {
    const pts = hourly(new Date(2026, 10, 10, 3), 24);
    const labels = buildXLabels(pts, '24h');
    expect(labels).toHaveLength(24);
    const nonEmpty = labels.filter((l) => l !== '');
    expect(nonEmpty).toEqual(['06h', '12h', '18h', '00h']);
    expect(labels[3]).toBe('06h');
    expect(labels[0]).toBe('');
  });
  it('labels only the first point of a given hour', () => {
    const base = new Date(2026, 10, 10, 6).getTime();
    const pts = [
      { t: base, v: 1 },
      { t: base + 30 * 60_000, v: 2 },
      { t: base + H, v: 3 },
    ];
    expect(buildXLabels(pts, '24h')).toEqual(['06h', '', '']);
  });
  it('handles empty input', () => {
    expect(buildXLabels([], '24h')).toEqual([]);
  });
});

describe('buildXLabels 7d', () => {
  it('labels the first point of each local day with the short weekday', () => {
    // 2026-11-10 is a Tuesday (Ter).
    const pts = hourly(new Date(2026, 10, 10, 18), 20, 3);
    const labels = buildXLabels(pts, '7d');
    expect(labels).toHaveLength(20);
    expect(labels[0]).toBe('Ter');
    // 18h, 21h, then 00h next day at index 2.
    expect(labels[1]).toBe('');
    expect(labels[2]).toBe('Qua');
    expect(labels[10]).toBe('Qui');
    expect(labels[18]).toBe('Sex');
    expect(labels.filter((l) => l !== '')).toEqual(['Ter', 'Qua', 'Qui', 'Sex']);
  });
  it('uses the full weekday set including Sáb and Dom', () => {
    // 2026-11-14 is a Saturday.
    const pts = [new Date(2026, 10, 14, 12), new Date(2026, 10, 15, 12)].map((d, i) => ({ t: d.getTime(), v: i }));
    expect(buildXLabels(pts, '7d')).toEqual(['Sáb', 'Dom']);
  });
});

describe('buildXLabels 30d', () => {
  it('labels the first point of every 7th local day with dd/MM', () => {
    const pts = hourly(new Date(2026, 9, 1, 0), 30 * 4, 6);
    const labels = buildXLabels(pts, '30d');
    expect(labels).toHaveLength(120);
    expect(labels.filter((l) => l !== '')).toEqual(['01/10', '08/10', '15/10', '22/10', '29/10']);
    expect(labels[0]).toBe('01/10');
    expect(labels[28]).toBe('08/10');
    expect(labels[29]).toBe('');
  });
});
