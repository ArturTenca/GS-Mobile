import {
  countPending,
  filterAlerts,
  hasActiveFilters,
  resultCountLabel,
  sortAlerts,
  type FilterableAlert,
} from './filter';

const a = (over: Partial<FilterableAlert> = {}): FilterableAlert => ({
  category: 'temperature_high',
  severity: 'warning',
  status: 'novo',
  triggeredAt: '2026-11-12T10:00:00.000Z',
  ...over,
});

describe('countPending', () => {
  it('counts novo + visualizado', () => {
    expect(countPending([a(), a({ status: 'visualizado' }), a({ status: 'resolvido' })])).toBe(2);
  });
  it('is 0 for an empty list', () => {
    expect(countPending([])).toBe(0);
  });
});

describe('filterAlerts', () => {
  const list = [
    a({ status: 'novo', category: 'soil_moisture_low' }),
    a({ status: 'visualizado', severity: 'critical' }),
    a({ status: 'resolvido', category: 'sensor_offline', severity: 'critical' }),
  ];
  const none = { category: null, severity: null };
  it('pendentes keeps novo + visualizado', () => {
    expect(filterAlerts(list, { status: 'pendentes', ...none })).toHaveLength(2);
  });
  it('resolvidos keeps resolvido', () => {
    expect(filterAlerts(list, { status: 'resolvidos', ...none })).toHaveLength(1);
  });
  it('todos keeps all', () => {
    expect(filterAlerts(list, { status: 'todos', ...none })).toHaveLength(3);
  });
  it('combines category and severity with status', () => {
    expect(
      filterAlerts(list, { status: 'todos', category: 'sensor_offline', severity: 'critical' }),
    ).toHaveLength(1);
    expect(
      filterAlerts(list, { status: 'pendentes', category: 'sensor_offline', severity: null }),
    ).toHaveLength(0);
    expect(filterAlerts(list, { status: 'todos', category: null, severity: 'critical' })).toHaveLength(2);
  });
});

describe('sortAlerts', () => {
  it('orders severity desc then triggeredAt desc without mutating', () => {
    const input = [
      a({ severity: 'info', triggeredAt: '2026-11-12T12:00:00.000Z' }),
      a({ severity: 'critical', triggeredAt: '2026-11-12T08:00:00.000Z' }),
      a({ severity: 'critical', triggeredAt: '2026-11-12T09:00:00.000Z' }),
      a({ severity: 'warning', triggeredAt: '2026-11-12T11:00:00.000Z' }),
    ];
    const copy = [...input];
    const out = sortAlerts(input);
    expect(out.map((x) => x.severity)).toEqual(['critical', 'critical', 'warning', 'info']);
    expect(out[0].triggeredAt).toBe('2026-11-12T09:00:00.000Z');
    expect(input).toEqual(copy);
  });
});

describe('resultCountLabel', () => {
  it('uses pendingAlertsLabel for pendentes', () => {
    expect(resultCountLabel(1, 'pendentes')).toBe('1 alerta pendente');
    expect(resultCountLabel(3, 'pendentes')).toBe('3 alertas pendentes');
  });
  it('uses plain labels otherwise', () => {
    expect(resultCountLabel(1, 'todos')).toBe('1 alerta');
    expect(resultCountLabel(4, 'resolvidos')).toBe('4 alertas');
    expect(resultCountLabel(0, 'todos')).toBe('0 alertas');
  });
});

describe('hasActiveFilters', () => {
  it('is true only when category or severity is set', () => {
    expect(hasActiveFilters({ category: null, severity: null })).toBe(false);
    expect(hasActiveFilters({ category: 'heavy_rain', severity: null })).toBe(true);
    expect(hasActiveFilters({ category: null, severity: 'info' })).toBe(true);
  });
});
