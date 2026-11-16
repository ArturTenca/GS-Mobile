import {
  coverageSummary,
  DEFAULT_RADIUS_M,
  defaultSensorName,
  isPointAllowed,
  RADIUS_PRESETS,
  SENSOR_TYPE_LABELS,
  stepRadius,
  validateSensorName,
} from './sensorFlow';

const ring = [
  { lat: 0, lng: 0 },
  { lat: 0, lng: 1 },
  { lat: 1, lng: 1 },
  { lat: 1, lng: 0 },
];

describe('sensorFlow', () => {
  it('has the radius presets and default', () => {
    expect(RADIUS_PRESETS).toEqual([10, 25, 50, 100, 150, 200, 300, 500]);
    expect(DEFAULT_RADIUS_M).toBe(50);
  });

  it('steps the radius over presets', () => {
    expect(stepRadius(50, 1)).toBe(100);
    expect(stepRadius(50, -1)).toBe(25);
    expect(stepRadius(500, 1)).toBe(500);
    expect(stepRadius(10, -1)).toBe(10);
    expect(stepRadius(60, 1)).toBe(100);
    expect(stepRadius(260, -1)).toBe(200);
  });

  it('builds the default name', () => {
    expect(defaultSensorName('soil_moisture', [{ type: 'soil_moisture' }, { type: 'soil_moisture' }, { type: 'temperature' }])).toBe(
      'Umidade do solo 3',
    );
    expect(defaultSensorName('temperature', [{ type: 'soil_moisture' }])).toBe('Temperatura 1');
    expect(defaultSensorName('temperature', undefined)).toBe('Temperatura 1');
  });

  it('labels types', () => {
    expect(SENSOR_TYPE_LABELS).toEqual({
      temperature: 'Temperatura',
      air_humidity: 'Umidade do ar',
      soil_moisture: 'Umidade do solo',
    });
  });

  it('validates the name', () => {
    expect(validateSensorName('   ')).toEqual({ valid: false, error: 'Informe o nome do sensor.' });
    expect(validateSensorName('a'.repeat(121))).toEqual({ valid: false, error: 'Nome muito longo.' });
    expect(validateSensorName('  Sensor  ')).toEqual({ valid: true, value: 'Sensor' });
  });

  it('checks the point inside the ring', () => {
    expect(isPointAllowed({ lat: 0.5, lng: 0.5 }, ring)).toBe(true);
    expect(isPointAllowed({ lat: 2, lng: 2 }, ring)).toBe(false);
    expect(isPointAllowed({ lat: 0.5, lng: 0.5 }, ring.slice(0, 2))).toBe(false);
  });

  it('summarizes coverage', () => {
    expect(coverageSummary(50)).toBe('Cobre cerca de 0,79 ha da fazenda');
  });
});

describe('validateSensorName security', () => {
  it('rejects PII and script payloads', () => {
    expect(validateSensorName('11 99999-8888')).toEqual({
      valid: false,
      error: 'Não coloque CPF, telefone ou outros dados pessoais neste campo.',
    });
    expect(validateSensorName('a=b')).toMatchObject({ valid: false });
  });
});
