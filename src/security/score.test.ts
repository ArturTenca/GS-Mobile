import { computeRiscoCidadao, levelFor } from './score';
import type { ScoreEvent } from './score';

const crit = (action = 'detected', occurrences = 1): ScoreEvent => ({ severity: 'critical', action, occurrences });

describe('computeRiscoCidadao', () => {
  it('returns 0 baixo for no events', () => {
    expect(computeRiscoCidadao([])).toEqual({ score: 0, level: 'baixo', raw: 0 });
  });

  it('matches the documented reference values', () => {
    expect(computeRiscoCidadao([crit()]).score).toBe(34);
    expect(computeRiscoCidadao([crit()]).level).toBe('moderado');
    expect(computeRiscoCidadao([crit(), crit(), crit()]).score).toBe(71);
    expect(computeRiscoCidadao([crit(), crit(), crit()]).level).toBe('alto');
    expect(computeRiscoCidadao(Array.from({ length: 5 }, () => crit())).score).toBe(88);
    expect(computeRiscoCidadao(Array.from({ length: 5 }, () => crit())).level).toBe('critico');
  });

  it('resolved events contribute 0', () => {
    expect(computeRiscoCidadao([crit('resolved')]).score).toBe(0);
  });

  it('blocked critical contributes 25 * 0.25', () => {
    expect(computeRiscoCidadao([crit('blocked')]).raw).toBeCloseTo(6.25, 5);
  });

  it('occurrences above the cap do not add points', () => {
    expect(computeRiscoCidadao([crit('detected', 5)]).raw).toBe(computeRiscoCidadao([crit('detected', 50)]).raw);
  });

  it('is monotonic when adding non-resolved events', () => {
    const sev = ['low', 'medium', 'high', 'critical'];
    const act = ['detected', 'redacted', 'blocked'];
    let seed = 11;
    const rnd = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let t = 0; t < 50; t += 1) {
      const list: ScoreEvent[] = [];
      let prev = 0;
      for (let i = 0; i < 12; i += 1) {
        list.push({
          severity: sev[Math.floor(rnd() * 4)],
          action: act[Math.floor(rnd() * 3)],
          occurrences: 1 + Math.floor(rnd() * 9),
        });
        const next = computeRiscoCidadao(list).score;
        expect(next).toBeGreaterThanOrEqual(prev);
        prev = next;
      }
    }
  });

  it('applies the level bands', () => {
    expect(levelFor(24)).toBe('baixo');
    expect(levelFor(25)).toBe('moderado');
    expect(levelFor(49)).toBe('moderado');
    expect(levelFor(50)).toBe('alto');
    expect(levelFor(74)).toBe('alto');
    expect(levelFor(75)).toBe('critico');
  });
});
