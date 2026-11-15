import { deriveCondition } from './deriveCondition';
import type { ConditionAlert, DeriveSensor, ThresholdMap } from './types';

const now = Date.parse('2026-11-12T15:00:00.000Z');
const MIN = 60_000;
const H = 60 * MIN;
const iso = (msAgo: number) => new Date(now - msAgo).toISOString();

const thresholds: ThresholdMap = {
  temperature: { min: 10, max: 35 },
  air_humidity: { min: 30, max: 85 },
  soil_moisture: { min: 30, max: 80 },
};

function sensor(over: Partial<DeriveSensor> & { id: string }): DeriveSensor {
  return {
    name: `Sensor ${over.id}`,
    type: 'temperature',
    areaName: 'Estufa',
    lastSeenAt: iso(MIN),
    latest: { value: 25, recordedAt: iso(MIN) },
    ...over,
  };
}

function alert(over: Partial<ConditionAlert> & { id: string }): ConditionAlert {
  return {
    sensorId: null,
    category: 'heavy_rain',
    severity: 'warning',
    status: 'novo',
    title: `Alerta ${over.id}`,
    recommendation: `Faça algo ${over.id}`,
    triggeredAt: iso(10 * MIN),
    ...over,
  };
}

const run = (sensors: DeriveSensor[], alerts: ConditionAlert[] = []) =>
  deriveCondition({ now, sensors, thresholds, alerts });

const okSensors = [sensor({ id: 's1' })];

describe('deriveCondition matrix', () => {
  it('1: all fine -> normal (D-03, D-07)', () => {
    const r = run(okSensors);
    expect(r.status).toBe('normal');
    expect(r.primary).toBeNull();
    expect(r.extraCount).toBe(0);
    expect(r.normalCopy).toEqual({
      line: 'Tudo certo na sua propriedade.',
      action: 'Sensores funcionando e sem alertas pendentes.',
    });
  });

  it('2: critical novo -> critico (D-01)', () => {
    expect(run(okSensors, [alert({ id: 'a', severity: 'critical' })]).status).toBe('critico');
  });

  it('3: critical visualizado still critico (D-04)', () => {
    const r = run(okSensors, [alert({ id: 'a', severity: 'critical', status: 'visualizado' })]);
    expect(r.status).toBe('critico');
    expect(r.pendingCount).toBe(1);
  });

  it('4: only resolved critical -> normal', () => {
    const r = run(okSensors, [alert({ id: 'a', severity: 'critical', status: 'resolvido' })]);
    expect(r.status).toBe('normal');
    expect(r.pendingCount).toBe(0);
  });

  it('5: warning only -> atencao (D-02)', () => {
    expect(run(okSensors, [alert({ id: 'a' })]).status).toBe('atencao');
  });

  it('6: info only -> atencao (D-02)', () => {
    expect(run(okSensors, [alert({ id: 'a', severity: 'info' })]).status).toBe('atencao');
  });

  it('7: reading out of range -> atencao, text per direction, never critico', () => {
    const hot = run([sensor({ id: 's1', latest: { value: 40, recordedAt: iso(MIN) } })]);
    expect(hot.status).toBe('atencao');
    expect(hot.primary?.line).toBe('Temperatura acima do limite — Estufa');
    expect(hot.primary?.action).toBe(
      'Evite trabalhos pesados nas horas mais quentes e reforce a irrigação.',
    );
    const cold = run([sensor({ id: 's1', latest: { value: 5, recordedAt: iso(MIN) } })]);
    expect(cold.primary?.line).toBe('Temperatura abaixo do mínimo — Estufa');
    const dry = run([
      sensor({ id: 's2', type: 'soil_moisture', latest: { value: 10, recordedAt: iso(MIN) } }),
    ]);
    expect(dry.primary?.line).toBe('Umidade do solo abaixo do mínimo — Estufa');
    expect(dry.primary?.action).toBe('Verifique a necessidade de irrigação.');
  });

  it('8: value exactly at a limit is in range', () => {
    expect(run([sensor({ id: 's1', latest: { value: 35, recordedAt: iso(MIN) } })]).status).toBe(
      'normal',
    );
    expect(run([sensor({ id: 's1', latest: { value: 10, recordedAt: iso(MIN) } })]).status).toBe(
      'normal',
    );
  });

  it('9: missing threshold or null side never violates', () => {
    const r = deriveCondition({
      now,
      sensors: [sensor({ id: 's1', latest: { value: 999, recordedAt: iso(MIN) } })],
      thresholds: { temperature: { min: 0, max: null } },
      alerts: [],
    });
    expect(r.status).toBe('normal');
    const r2 = deriveCondition({
      now,
      sensors: [sensor({ id: 's1', latest: { value: 999, recordedAt: iso(MIN) } })],
      thresholds: {},
      alerts: [],
    });
    expect(r2.status).toBe('normal');
  });

  it('10: exactly 2h online, 2h + 1ms offline (D-05)', () => {
    const edge = sensor({ id: 's1', lastSeenAt: iso(2 * H), latest: { value: 25, recordedAt: iso(2 * H) } });
    expect(run([edge]).onlineCount).toBe(1);
    const past = sensor({
      id: 's1',
      lastSeenAt: iso(2 * H + 1),
      latest: { value: 25, recordedAt: iso(2 * H + 1) },
    });
    const r = run([past]);
    expect(r.offlineCount).toBe(1);
    expect(r.onlineCount).toBe(0);
  });

  it('11: offline sensor without alert -> atencao with offline reason (D-02)', () => {
    const r = run([
      sensor({ id: 's1', name: 'Pomar T', lastSeenAt: iso(50 * H), latest: { value: 25, recordedAt: iso(50 * H) } }),
    ]);
    expect(r.status).toBe('atencao');
    expect(r.primary?.kind).toBe('offline');
    expect(r.primary?.line).toBe('Sensor sem comunicação — Pomar T');
    expect(r.primary?.action).toBe('Verifique a bateria, o sinal e a conexão do sensor.');
  });

  it('12: offline sensor with pending sensor_offline alert -> one reason', () => {
    const r = run(
      [sensor({ id: 's1', lastSeenAt: iso(50 * H), latest: { value: 25, recordedAt: iso(50 * H) } })],
      [alert({ id: 'a', sensorId: 's1', category: 'sensor_offline', severity: 'info' })],
    );
    expect(r.reasons).toHaveLength(1);
    expect(r.extraCount).toBe(0);
    expect(r.primary?.kind).toBe('alert');
  });

  it('13: out-of-range reading with same-sensor measurement alert -> one reason', () => {
    const r = run(
      [sensor({ id: 's1', latest: { value: 40, recordedAt: iso(MIN) } })],
      [alert({ id: 'a', sensorId: 's1', category: 'temperature_high' })],
    );
    expect(r.reasons).toHaveLength(1);
    expect(r.primary?.kind).toBe('alert');
  });

  it('14: critical + warning + reading + offline -> critico, primary critical, extra 3', () => {
    const r = run(
      [
        sensor({ id: 's1', latest: { value: 40, recordedAt: iso(MIN) } }),
        sensor({ id: 's2', lastSeenAt: iso(50 * H), latest: null }),
      ],
      [alert({ id: 'c', severity: 'critical' }), alert({ id: 'w', severity: 'warning' })],
    );
    expect(r.status).toBe('critico');
    expect(r.primary?.alertId).toBe('c');
    expect(r.extraCount).toBe(3);
  });

  it('15: order warning > info > reading > offline, newest first inside equal severity (D-06)', () => {
    const r = run(
      [
        sensor({ id: 's1', latest: { value: 40, recordedAt: iso(MIN) } }),
        sensor({ id: 's2', lastSeenAt: iso(50 * H), latest: null }),
      ],
      [
        alert({ id: 'i', severity: 'info', triggeredAt: iso(1 * MIN) }),
        alert({ id: 'w-old', severity: 'warning', triggeredAt: iso(60 * MIN) }),
        alert({ id: 'w-new', severity: 'warning', triggeredAt: iso(5 * MIN) }),
      ],
    );
    expect(r.reasons.map((x) => x.alertId ?? x.kind)).toEqual([
      'w-new',
      'w-old',
      'i',
      'reading',
      'offline',
    ]);
    expect(r.reasons.map((x) => x.rank)).toEqual([1, 1, 2, 3, 4]);
  });

  it('16: offline sensor stale out-of-range value ignored', () => {
    const r = run([
      sensor({ id: 's1', lastSeenAt: iso(50 * H), latest: { value: 99, recordedAt: iso(50 * H) } }),
    ]);
    expect(r.reasons.map((x) => x.kind)).toEqual(['offline']);
  });

  it('17: zero sensors and zero alerts -> normal with alternate copy', () => {
    const r = run([]);
    expect(r.status).toBe('normal');
    expect(r.normalCopy).toEqual({
      line: 'Nenhum alerta pendente.',
      action: 'Adicione sensores no mapa da fazenda para acompanhar as leituras.',
    });
    expect(r.lastReadingAt).toBeNull();
  });

  it('18: demo-farm fixture -> critico, soil alert with area, 5 online / 1 offline', () => {
    const sensors: DeriveSensor[] = [
      sensor({ id: 'temp-estufa', name: 'Temp Estufa', areaName: 'Estufa' }),
      sensor({ id: 'umid-estufa', type: 'air_humidity', areaName: 'Estufa', latest: { value: 60, recordedAt: iso(3 * MIN) } }),
      sensor({ id: 'solo-horta', type: 'soil_moisture', areaName: 'Horta de Folhosas', latest: { value: 28, recordedAt: iso(3 * MIN) } }),
      sensor({ id: 'solo-pomar', type: 'soil_moisture', areaName: 'Pomar', latest: { value: 50, recordedAt: iso(3 * MIN) } }),
      sensor({ id: 'umid-pomar', type: 'air_humidity', areaName: 'Pomar', latest: { value: 55, recordedAt: iso(3 * MIN) } }),
      sensor({
        id: 'temp-pomar',
        name: 'Temp Pomar',
        areaName: 'Pomar',
        lastSeenAt: iso(52 * H + 3 * MIN),
        latest: { value: 24, recordedAt: iso(52 * H + 3 * MIN) },
      }),
    ];
    const alerts: ConditionAlert[] = [
      alert({
        id: 'soil',
        sensorId: 'solo-horta',
        category: 'soil_moisture_low',
        severity: 'critical',
        title: 'Umidade do solo baixa',
        recommendation: 'Verifique a necessidade de irrigação.',
      }),
      alert({ id: 'off', sensorId: 'temp-pomar', category: 'sensor_offline', severity: 'warning', title: 'Sensor sem comunicação' }),
      alert({ id: 'rain', category: 'heavy_rain', severity: 'info', title: 'Chuva forte prevista' }),
    ];
    const r = run(sensors, alerts);
    expect(r.status).toBe('critico');
    expect(r.primary?.line).toContain('— Horta de Folhosas');
    expect(r.primary?.alertId).toBe('soil');
    expect(r.onlineCount).toBe(5);
    expect(r.offlineCount).toBe(1);
    expect(r.pendingCount).toBe(3);
    expect(r.sensorCount).toBe(6);
    expect(r.lastReadingAt).toBe(iso(MIN));
  });

  it('19: pluralization of extraCount drives +N copy input', () => {
    const one = run(okSensors, [alert({ id: 'a' }), alert({ id: 'b' })]);
    expect(one.extraCount).toBe(1);
    const many = run(okSensors, [alert({ id: 'a' }), alert({ id: 'b' }), alert({ id: 'c' })]);
    expect(many.extraCount).toBe(2);
  });

  it('alert without recommendation gets a safe fallback action', () => {
    const r = run(okSensors, [alert({ id: 'a', recommendation: null })]);
    expect(r.primary?.action.length).toBeGreaterThan(0);
  });

  it('lastReadingAt is the max across sensors', () => {
    const r = run([
      sensor({ id: 'a', lastSeenAt: iso(30 * MIN), latest: { value: 25, recordedAt: iso(30 * MIN) } }),
      sensor({ id: 'b', lastSeenAt: iso(5 * MIN), latest: { value: 25, recordedAt: iso(9 * MIN) } }),
    ]);
    expect(r.lastReadingAt).toBe(iso(5 * MIN));
  });
});
