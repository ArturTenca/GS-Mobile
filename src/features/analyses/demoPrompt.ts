/** Demo-data prompt gating and copy for Análises (D-11, UI-SPEC S5). */

export type DemoPromptInput = {
  sensorsLoaded: boolean;
  sensorCount: number;
  /** properties.demo_data_generated_at; undefined is treated as null (row predates migration 007). */
  generatedAt: string | null | undefined;
  farmId: string | null | undefined;
  /** Farms whose prompt was dismissed with "Agora não" in the current visit. */
  dismissedFarmIds: readonly string[];
};

export function shouldPromptDemo({
  sensorsLoaded,
  sensorCount,
  generatedAt,
  farmId,
  dismissedFarmIds,
}: DemoPromptInput): boolean {
  if (!farmId) return false;
  if (!sensorsLoaded) return false;
  if (sensorCount <= 0) return false;
  if (typeof generatedAt === 'string' && generatedAt.length > 0) return false;
  return !dismissedFarmIds.includes(farmId);
}

export type DialogCopy = {
  title: string;
  message: string;
  confirm: string;
  loading: string;
  cancel: string;
};

export function promptCopy(farmName: string): DialogCopy {
  return {
    title: 'Gerar dados demonstrativos?',
    message: `Vamos criar 30 dias de leituras simuladas para todos os sensores de ${farmName}, para você ver os gráficos. Os dados ficam marcados como demonstrativos.`,
    confirm: 'Gerar dados',
    loading: 'Gerando dados…',
    cancel: 'Agora não',
  };
}

export function regenerateCopy(): DialogCopy {
  return {
    title: 'Gerar os dados de novo?',
    message:
      'Os dados demonstrativos atuais dos sensores serão trocados por novos. Leituras reais não são alteradas.',
    confirm: 'Regerar dados',
    loading: 'Gerando dados…',
    cancel: 'Manter dados atuais',
  };
}

export function generatedNotice(count: number): string {
  return count === 1
    ? 'Dados demonstrativos gerados para 1 sensor.'
    : `Dados demonstrativos gerados para ${count} sensores.`;
}
