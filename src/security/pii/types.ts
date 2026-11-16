import type { CATEGORIES, SEVERITIES } from './constants.ts';

export type Category = (typeof CATEGORIES)[number];
export type Severity = (typeof SEVERITIES)[number];

export type RuleId =
  | 'cpf'
  | 'cpf_masked'
  | 'cnpj'
  | 'rg'
  | 'email'
  | 'br_phone'
  | 'cep'
  | 'card'
  | 'jwt'
  | 'anthropic_key'
  | 'generic_secret_key'
  | 'supabase_secret'
  | 'supabase_publishable'
  | 'expo_push_token'
  | 'password_kv'
  | 'cid10'
  | 'health_keyword'
  | 'geo_precise'
  | 'geo_single';

export type RedactionStrategy = 'mask-keep-last2' | 'mask-email' | 'mask-phone' | 'tag' | 'drop';

export type MatchContext = { before: string; after: string };

export type ContextWords = {
  // Palavras que precisam aparecer na janela anterior ao match.
  words: RegExp;
  window: number;
  required: boolean;
};

export type Rule = {
  id: RuleId;
  category: Category;
  severity: Severity;
  // Regex global, linear, sem quantificadores aninhados.
  pattern: RegExp;
  validate?: (matched: string, ctx: MatchContext) => boolean;
  contextWords?: ContextWords;
  redact: RedactionStrategy;
};

// Resultado publico do motor. Nao existe campo com o trecho original:
// somente posicao e uma previa ja mascarada.
export type Finding = {
  ruleId: RuleId;
  category: Category;
  severity: Severity;
  start: number;
  end: number;
  preview: string;
  validated: boolean;
};

export type ScanOptions = {
  categories?: Category[];
  maxLength?: number;
};
