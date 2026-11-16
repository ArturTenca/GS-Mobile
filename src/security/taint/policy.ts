import type { Category } from '../pii/engine.ts';

// Politica por sink (D-04): o que acontece quando dado pessoal chega a cada saida.
export const SINK_IDS = [
  'console',
  'geocode_http',
  'weather_http',
  'service_error',
  'ui_error',
  'push_payload',
  'llm_prompt',
  'open_url',
  'db_write',
  'db_at_rest',
] as const;

export type SinkId = (typeof SINK_IDS)[number];
export type SinkAction = 'block' | 'redact' | 'allow';
export type SinkRule = { action: SinkAction; categories: Category[] };

const ALL: Category[] = ['identity', 'contact', 'financial', 'credential', 'health', 'location', 'address'];
const PERSONAL: Category[] = ['identity', 'contact', 'financial', 'credential', 'health'];

export const SINK_POLICY: Record<SinkId, SinkRule> = {
  console: { action: 'redact', categories: ALL },
  // Rua, cidade, bairro e CEP sao legitimos aqui (categoria address fica de fora).
  geocode_http: { action: 'block', categories: [...PERSONAL, 'location'] },
  weather_http: { action: 'block', categories: PERSONAL },
  service_error: { action: 'redact', categories: ALL },
  ui_error: { action: 'redact', categories: ALL },
  push_payload: { action: 'redact', categories: PERSONAL },
  llm_prompt: { action: 'block', categories: ALL },
  open_url: { action: 'block', categories: ['credential', 'identity', 'contact'] },
  db_write: { action: 'block', categories: PERSONAL },
  db_at_rest: { action: 'allow', categories: [] },
};
