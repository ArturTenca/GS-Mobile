// Risco Cidadao (D-09): indicador local de 0 a 100. Funcao pura, sem I/O.
// raw = soma, por evento, de peso(severidade) * multiplicador(acao) * (1 + 0,1 * (min(ocorrencias, CAP) - 1)).
// score = round(100 * (1 - exp(-raw / 60))): satura suavemente perto de 100.

export type RiskLevel = 'baixo' | 'moderado' | 'alto' | 'critico';

export const WEIGHTS: Record<string, number> = { low: 1, medium: 4, high: 10, critical: 25 };
export const MULTIPLIERS: Record<string, number> = { detected: 1, redacted: 0.5, blocked: 0.25, resolved: 0 };
// Limite de ocorrencias contadas por evento (evita que um unico achado domine).
export const CAP = 5;
export const SCORE_SCALE = 60;

export const LEVEL_LABEL: Record<RiskLevel, string> = {
  baixo: 'Baixo',
  moderado: 'Moderado',
  alto: 'Alto',
  critico: 'Crítico',
};

export type ScoreEvent = { severity: string; action: string; occurrences?: number };
export type RiscoCidadao = { score: number; level: RiskLevel; raw: number };

// Faixas: 0-24 baixo, 25-49 moderado, 50-74 alto, 75-100 critico.
export function levelFor(score: number): RiskLevel {
  if (score >= 75) return 'critico';
  if (score >= 50) return 'alto';
  if (score >= 25) return 'moderado';
  return 'baixo';
}

export function computeRiscoCidadao(events: readonly ScoreEvent[]): RiscoCidadao {
  let raw = 0;
  for (const e of events) {
    const w = WEIGHTS[e.severity] ?? 0;
    const m = MULTIPLIERS[e.action] ?? 0;
    const occ = Math.min(Math.max(e.occurrences ?? 1, 1), CAP);
    raw += w * m * (1 + 0.1 * (occ - 1));
  }
  const score = Math.round(100 * (1 - Math.exp(-raw / SCORE_SCALE)));
  return { score, level: levelFor(score), raw };
}
