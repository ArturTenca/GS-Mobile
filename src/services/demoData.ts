import { supabase } from '@/lib/supabase';
import { ServiceError } from '@/services/ServiceError';

export type DemoDataErrorKind = 'rate' | 'notFound' | 'migration' | 'generic';

const MESSAGES: Record<DemoDataErrorKind, string> = {
  rate: 'Os dados acabaram de ser gerados. Aguarde um minuto para gerar de novo.',
  notFound: 'Não encontramos esta fazenda. Volte e escolha a fazenda de novo.',
  migration: 'Atualize o banco de dados (migração 007).',
  generic: 'Não foi possível gerar os dados. Verifique sua internet e tente de novo.',
};

const CODE_KIND: Record<string, DemoDataErrorKind> = {
  AG429: 'rate',
  '42501': 'notFound',
  PGRST202: 'migration',
};

export class DemoDataError extends ServiceError {
  readonly kind: DemoDataErrorKind;

  constructor(kind: DemoDataErrorKind, cause?: unknown) {
    super(MESSAGES[kind], cause);
    this.name = 'DemoDataError';
    this.kind = kind;
  }
}

/** Only fixed PT-BR copy reaches the UI; raw database text never does. */
export function mapDemoDataError(error: unknown): { kind: DemoDataErrorKind; message: string } {
  const code =
    error && typeof error === 'object' && 'code' in error ? (error as { code?: unknown }).code : undefined;
  const kind: DemoDataErrorKind = (typeof code === 'string' && CODE_KIND[code]) || 'generic';
  return { kind, message: MESSAGES[kind] };
}

function count(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Regenerates the farm's 30-day demo dataset server-side (D-12). Owner check and throttle live in SQL. */
export async function generateDemoDataset(
  propertyId: string,
): Promise<{ sensors: number; readings: number }> {
  try {
    const { data, error } = await supabase.rpc('generate_demo_dataset', { p_property_id: propertyId });
    if (error) throw new DemoDataError(mapDemoDataError(error).kind, error);
    const body = (data ?? {}) as { sensors?: unknown; readings?: unknown };
    return { sensors: count(body.sensors), readings: count(body.readings) };
  } catch (e) {
    if (e instanceof DemoDataError) throw e;
    throw new DemoDataError('generic', e);
  }
}
