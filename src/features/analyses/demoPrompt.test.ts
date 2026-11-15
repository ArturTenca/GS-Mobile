import { generatedNotice, promptCopy, regenerateCopy, shouldPromptDemo } from '@/features/analyses/demoPrompt';

const base = {
  sensorsLoaded: true,
  sensorCount: 2,
  generatedAt: null as string | null | undefined,
  farmId: 'f1',
  dismissedFarmIds: [] as string[],
};

describe('shouldPromptDemo', () => {
  it('prompts when sensors exist, no data was generated and the farm was not dismissed', () => {
    expect(shouldPromptDemo(base)).toBe(true);
  });

  it('treats an undefined generatedAt as never generated', () => {
    expect(shouldPromptDemo({ ...base, generatedAt: undefined })).toBe(true);
  });

  it('does not prompt while sensors are loading', () => {
    expect(shouldPromptDemo({ ...base, sensorsLoaded: false })).toBe(false);
  });

  it('does not prompt for a farm without sensors', () => {
    expect(shouldPromptDemo({ ...base, sensorCount: 0 })).toBe(false);
  });

  it('does not prompt once data was generated', () => {
    expect(shouldPromptDemo({ ...base, generatedAt: '2026-11-10T12:00:00Z' })).toBe(false);
  });

  it('does not prompt for a farm dismissed in this visit', () => {
    expect(shouldPromptDemo({ ...base, dismissedFarmIds: ['f1'] })).toBe(false);
    expect(shouldPromptDemo({ ...base, dismissedFarmIds: ['f2'] })).toBe(true);
  });

  it('does not prompt without a farm', () => {
    expect(shouldPromptDemo({ ...base, farmId: null })).toBe(false);
  });
});

describe('promptCopy', () => {
  it('returns the final prompt copy with the farm name', () => {
    expect(promptCopy('Fazenda Boa Vista')).toEqual({
      title: 'Gerar dados demonstrativos?',
      message:
        'Vamos criar 30 dias de leituras simuladas para todos os sensores de Fazenda Boa Vista, para você ver os gráficos. Os dados ficam marcados como demonstrativos.',
      confirm: 'Gerar dados',
      loading: 'Gerando dados…',
      cancel: 'Agora não',
    });
  });
});

describe('regenerateCopy', () => {
  it('returns the final regenerate copy', () => {
    expect(regenerateCopy()).toEqual({
      title: 'Gerar os dados de novo?',
      message:
        'Os dados demonstrativos atuais dos sensores serão trocados por novos. Leituras reais não são alteradas.',
      confirm: 'Regerar dados',
      loading: 'Gerando dados…',
      cancel: 'Manter dados atuais',
    });
  });
});

describe('generatedNotice', () => {
  it('uses singular for one sensor and plural otherwise', () => {
    expect(generatedNotice(1)).toBe('Dados demonstrativos gerados para 1 sensor.');
    expect(generatedNotice(3)).toBe('Dados demonstrativos gerados para 3 sensores.');
  });
});
