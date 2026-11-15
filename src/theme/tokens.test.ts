import { darkColors, lightColors, radius, spacing, touch, typography } from './tokens';

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

describe('tokens', () => {
  it('light and dark palettes have identical keys', () => {
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
  });

  it('every color value is a #RRGGBB or rgba() string', () => {
    for (const palette of [lightColors, darkColors]) {
      for (const [key, value] of Object.entries(palette)) {
        expect(typeof value).toBe('string');
        expect({ key, ok: /^(#[0-9A-Fa-f]{6}|rgba\(.+\))$/.test(value) }).toEqual({ key, ok: true });
      }
    }
  });

  it('includes chart series 1..8 and other', () => {
    for (const palette of [lightColors, darkColors]) {
      for (const k of ['series1', 'series2', 'series3', 'series4', 'series5', 'series6', 'series7', 'series8', 'seriesOther']) {
        expect(palette).toHaveProperty(k);
      }
    }
  });

  it('map overlay tokens exist in both themes as valid colours; halo and vertex are shared', () => {
    const keys = ['mapBoundary', 'mapBoundaryFill', 'mapHalo', 'mapVertex', 'mapSensor', 'mapSensorFill', 'mapSensorExisting', 'mapInvalid'] as const;
    for (const k of keys) {
      expect(lightColors[k]).toMatch(/^(#[0-9A-Fa-f]{6}|rgba\(.+\))$/);
      expect(darkColors[k]).toMatch(/^(#[0-9A-Fa-f]{6}|rgba\(.+\))$/);
    }
    expect(lightColors.mapHalo).toBe(darkColors.mapHalo);
    expect(lightColors.mapVertex).toBe(darkColors.mapVertex);
    for (const k of ['mapBoundary', 'mapBoundaryFill', 'mapSensor', 'mapSensorFill', 'mapSensorExisting', 'mapInvalid'] as const) {
      expect(lightColors[k]).not.toBe(darkColors[k]);
    }
  });

  it('weather icon tokens exist in both themes', () => {
    const expected = {
      weatherSun: ['#B45309', '#F5C04A'],
      weatherCloud: ['#5A6B78', '#A7B4BD'],
      weatherRain: ['#2563EB', '#6EA8F5'],
      weatherStorm: ['#6250D6', '#9085E9'],
      weatherSnow: ['#0E7490', '#8FD0EA'],
    } as const;
    for (const [k, [l, d]] of Object.entries(expected)) {
      expect(lightColors[k as keyof typeof lightColors]).toBe(l);
      expect(darkColors[k as keyof typeof darkColors]).toBe(d);
    }
  });

  it('exposes the declared spacing, radius and touch values', () => {
    expect(spacing).toEqual({ xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 });
    expect(radius).toEqual({ button: 12, card: 12, cardLg: 16, pill: 999 });
    expect(touch.min).toBe(48);
  });

  it('exposes the single display type size (28/36)', () => {
    expect(typography.display).toEqual({ fontSize: 28, lineHeight: 36 });
  });
});

describe.each([
  ['light', lightColors],
  ['dark', darkColors],
] as const)('WCAG contrast (%s)', (_name, c) => {
  it.each([
    ['text', 'card'],
    ['textMuted', 'card'],
    ['primaryText', 'card'],
    ['onPrimary', 'primary'],
    ['onPrimary', 'errorFill'],
  ] as const)('%s on %s >= 4.5', (fg, bg) => {
    expect(contrast(c[fg], c[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it('inputBorder on card >= 3', () => {
    expect(contrast(c.inputBorder, c.card)).toBeGreaterThanOrEqual(3);
  });
});
