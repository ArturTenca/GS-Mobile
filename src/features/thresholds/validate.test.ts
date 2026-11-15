import { validateThresholds, type ThresholdInput } from '@/features/thresholds/validate';

function base(over: Partial<ThresholdInput> = {}): ThresholdInput {
  return {
    temperature: { min: '', max: '35' },
    air_humidity: { min: '', max: '90' },
    soil_moisture: { min: '30', max: '' },
    ...over,
  };
}

describe('validateThresholds', () => {
  it('accepts a valid Celsius set and stores unchanged', () => {
    const r = validateThresholds(base(), 'c');
    expect(r.valid).toBe(true);
    expect(r.values).toEqual({
      temperature: { min: null, max: 35 },
      air_humidity: { min: null, max: 90 },
      soil_moisture: { min: 30, max: null },
    });
  });

  it('accepts comma and dot decimals', () => {
    const a = validateThresholds(base({ temperature: { min: '', max: '25,5' } }), 'c');
    const b = validateThresholds(base({ temperature: { min: '', max: '25.5' } }), 'c');
    expect(a.values?.temperature.max).toBe(25.5);
    expect(b.values?.temperature.max).toBe(25.5);
  });

  it('empty optional side becomes null', () => {
    const r = validateThresholds(base({ soil_moisture: { min: '30', max: ' ' } }), 'c');
    expect(r.values?.soil_moisture.max).toBeNull();
  });

  it('flags empty required sides', () => {
    const r = validateThresholds(
      { temperature: { min: '', max: '' }, air_humidity: { min: '', max: '' }, soil_moisture: { min: '', max: '' } },
      'c',
    );
    expect(r.valid).toBe(false);
    expect(r.errors['temperature.max']).toBe('Informe um valor.');
    expect(r.errors['air_humidity.max']).toBe('Informe um valor.');
    expect(r.errors['soil_moisture.min']).toBe('Informe um valor.');
    expect(r.errors['temperature.min']).toBeUndefined();
    expect(r.values).toBeNull();
  });

  it('rejects non-numbers', () => {
    const r = validateThresholds(base({ temperature: { min: 'abc', max: '35' } }), 'c');
    expect(r.errors['temperature.min']).toBe('Use só números, como 25 ou 25,5.');
  });

  it('rejects min >= max on the max field', () => {
    const r = validateThresholds(base({ temperature: { min: '35', max: '35' } }), 'c');
    expect(r.errors['temperature.max']).toBe('O mínimo precisa ser menor que o máximo.');
    const r2 = validateThresholds(base({ air_humidity: { min: '95', max: '90' } }), 'c');
    expect(r2.errors['air_humidity.max']).toBe('O mínimo precisa ser menor que o máximo.');
  });

  it('rejects temperature out of range in Celsius', () => {
    const r = validateThresholds(base({ temperature: { min: '', max: '61' } }), 'c');
    expect(r.errors['temperature.max']).toBe('Use um valor entre -20 e 60 °C.');
    const r2 = validateThresholds(base({ temperature: { min: '-21', max: '35' } }), 'c');
    expect(r2.errors['temperature.min']).toBe('Use um valor entre -20 e 60 °C.');
  });

  it('rejects temperature out of range in Fahrenheit using the user unit', () => {
    const r = validateThresholds(base({ temperature: { min: '', max: '141' } }), 'f');
    expect(r.errors['temperature.max']).toBe('Use um valor entre -4 e 140 °F.');
  });

  it('rejects humidity out of range', () => {
    const r = validateThresholds(base({ air_humidity: { min: '', max: '101' } }), 'c');
    expect(r.errors['air_humidity.max']).toBe('Use um valor entre 0 e 100 %.');
    const r2 = validateThresholds(base({ soil_moisture: { min: '-1', max: '' } }), 'c');
    expect(r2.errors['soil_moisture.min']).toBe('Use um valor entre 0 e 100 %.');
  });

  it('converts Fahrenheit to Celsius with 1 decimal', () => {
    const r = validateThresholds(base({ temperature: { min: '50', max: '95' } }), 'f');
    expect(r.values?.temperature).toEqual({ min: 10, max: 35 });
    const r2 = validateThresholds(base({ temperature: { min: '', max: '90' } }), 'f');
    expect(r2.values?.temperature.max).toBe(32.2);
  });

  it('does not convert humidity in Fahrenheit mode', () => {
    const r = validateThresholds(base(), 'f');
    expect(r.values?.air_humidity.max).toBe(90);
  });
});
