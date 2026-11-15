export function formatDecimal(n: number, digits: number): string {
  return n.toFixed(digits).replace('.', ',');
}

export function formatHumidity(n: number): string {
  return String(Math.round(n));
}

export function sensorsActiveLabel(n: number): string {
  return n === 1 ? '1 sensor ativo' : `${n} sensores ativos`;
}

export function pendingAlertsLabel(n: number): string {
  return n === 1 ? '1 alerta pendente' : `${n} alertas pendentes`;
}

export function extraReasonsLabel(n: number): string {
  return n === 1 ? '+1 outro ponto de atenção' : `+${n} outros pontos de atenção`;
}
