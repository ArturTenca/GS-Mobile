import {
  extraReasonsLabel,
  formatDecimal,
  formatHumidity,
  pendingAlertsLabel,
  sensorsActiveLabel,
} from './formatNumber';

describe('formatNumber', () => {
  it('formatDecimal uses comma', () => {
    expect(formatDecimal(27.44, 1)).toBe('27,4');
    expect(formatDecimal(27, 1)).toBe('27,0');
    expect(formatDecimal(5, 0)).toBe('5');
  });
  it('formatHumidity rounds to integer', () => {
    expect(formatHumidity(73.6)).toBe('74');
    expect(formatHumidity(73.4)).toBe('73');
  });
  it('sensorsActiveLabel', () => {
    expect(sensorsActiveLabel(1)).toBe('1 sensor ativo');
    expect(sensorsActiveLabel(5)).toBe('5 sensores ativos');
  });
  it('pendingAlertsLabel', () => {
    expect(pendingAlertsLabel(1)).toBe('1 alerta pendente');
    expect(pendingAlertsLabel(3)).toBe('3 alertas pendentes');
  });
  it('extraReasonsLabel singular/plural', () => {
    expect(extraReasonsLabel(1)).toBe('+1 outro ponto de atenção');
    expect(extraReasonsLabel(3)).toBe('+3 outros pontos de atenção');
  });
});
