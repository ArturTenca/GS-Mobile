// Logica pura da funcao explain-risk (sem Deno/jsr/npm, sem imports): testada via jest.
// O prompt so recebe ids permitidos + texto de catalogo fixo. Nenhum texto do usuario entra.

export const PROMPT_VERSION = 1;
export const MODEL = 'claude-opus-5-5';
export const MAX_ITEMS = 12;
export const MAX_AI_ITEMS = 6;

export const RULE_IDS = [
  'cpf', 'cpf_masked', 'cnpj', 'rg', 'email', 'br_phone', 'cep', 'card', 'jwt', 'anthropic_key',
  'generic_secret_key', 'supabase_secret', 'supabase_publishable', 'expo_push_token', 'password_kv',
  'cid10', 'health_keyword', 'geo_precise', 'geo_single',
] as const;
export const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export const SINK_IDS = [
  'console', 'geocode_http', 'weather_http', 'service_error', 'ui_error', 'push_payload',
  'llm_prompt', 'open_url', 'db_write', 'db_at_rest',
] as const;
export const ACTIONS = ['blocked', 'redacted', 'detected', 'resolved'] as const;
export const LEVELS = ['baixo', 'moderado', 'alto', 'critico'] as const;

export type RuleId = (typeof RULE_IDS)[number];
export type Severity = (typeof SEVERITIES)[number];
export type Level = (typeof LEVELS)[number];
export type RuleItem = { rule_id: RuleId; severity: Severity; sink: string; action: string; count: number };
export type ExplainItem = {
  rule_id: string;
  titulo: string;
  risco_real: string;
  o_que_fazer: string;
  nivel: Level;
  source: 'ai' | 'template';
};
export type TemplateText = { titulo: string; risco_real: string; o_que_fazer: string };

const LEVEL_BY_SEVERITY: Record<string, Level> = {
  low: 'baixo',
  medium: 'moderado',
  high: 'alto',
  critical: 'critico',
};

export const RULE_CATALOG: Record<RuleId, string> = {
  cpf: 'documento pessoal de identificacao fiscal completo',
  cpf_masked: 'documento pessoal de identificacao fiscal parcialmente mascarado',
  cnpj: 'registro fiscal de empresa',
  rg: 'documento de identidade',
  email: 'endereco de contato digital',
  br_phone: 'telefone de contato',
  cep: 'codigo postal de endereco',
  card: 'dado de cartao de pagamento',
  jwt: 'chave de sessao de usuario',
  anthropic_key: 'chave de servico de inteligencia artificial',
  generic_secret_key: 'chave secreta generica de servico',
  supabase_secret: 'chave administrativa do banco de dados',
  supabase_publishable: 'chave publica do banco de dados',
  expo_push_token: 'endereco de notificacao do aparelho',
  password_kv: 'credencial de acesso escrita em texto',
  cid10: 'codigo de classificacao de saude',
  health_keyword: 'termo de saude em texto livre',
  geo_precise: 'par de coordenadas de localizacao exata',
  geo_single: 'valor isolado de coordenada',
};

// TEMPLATES-BEGIN
export const TEMPLATES: Record<string, TemplateText> = {
  cpf: {
    titulo: 'Documento pessoal exposto',
    risco_real: 'Um documento pessoal completo pode ser usado por golpistas para abrir contas ou pedir credito em seu nome.',
    o_que_fazer: 'Remova esse documento do texto e compartilhe so quando for realmente necessario, em canais seguros.',
  },
  cpf_masked: {
    titulo: 'Documento pessoal parcialmente visivel',
    risco_real: 'Mesmo mascarado, o documento pode ser juntado a outros dados para identificar voce.',
    o_que_fazer: 'Evite escrever documentos pessoais, mesmo parciais, em campos livres do aplicativo.',
  },
  cnpj: {
    titulo: 'Registro da empresa exposto',
    risco_real: 'O registro da empresa permite ligar o nome do negocio a dados publicos e facilita fraudes de identidade.',
    o_que_fazer: 'Nao digite o registro da empresa em campos de texto livre. Use apenas onde ele for exigido.',
  },
  rg: {
    titulo: 'Documento de identidade exposto',
    risco_real: 'O documento de identidade pode ser copiado e usado para falsificar cadastros.',
    o_que_fazer: 'Retire o numero do campo e guarde o documento fora do aplicativo.',
  },
  email: {
    titulo: 'Endereco de contato digital exposto',
    risco_real: 'Esse endereco pode receber mensagens falsas e tentativas de golpe.',
    o_que_fazer: 'Nao coloque contatos pessoais em nomes ou descricoes. Use apenas os campos de conta.',
  },
  br_phone: {
    titulo: 'Telefone exposto',
    risco_real: 'Um telefone visivel pode receber ligacoes e mensagens de golpistas.',
    o_que_fazer: 'Tire o telefone do texto e informe-o somente nos campos de contato previstos.',
  },
  cep: {
    titulo: 'Codigo postal exposto',
    risco_real: 'Junto com outros dados, o codigo postal ajuda a localizar sua propriedade.',
    o_que_fazer: 'Informe o codigo postal apenas no campo de endereco e evite repetir em outros textos.',
  },
  card: {
    titulo: 'Dado de cartao exposto',
    risco_real: 'Dados de cartao em texto aberto podem gerar compras indevidas e prejuizo financeiro.',
    o_que_fazer: 'Apague o dado agora. Se ele foi compartilhado, avise seu banco e peca um novo cartao.',
  },
  jwt: {
    titulo: 'Chave de sessao exposta',
    risco_real: 'Quem tiver essa chave pode agir como se fosse voce dentro do sistema.',
    o_que_fazer: 'Saia da conta e entre de novo para invalidar a sessao. Nunca cole chaves em campos de texto.',
  },
  anthropic_key: {
    titulo: 'Chave de servico de IA exposta',
    risco_real: 'Quem obtiver essa chave pode usar o servico por sua conta e gerar custos.',
    o_que_fazer: 'Revogue a chave no painel do fornecedor e crie outra. Guarde-a apenas em variavel segura.',
  },
  generic_secret_key: {
    titulo: 'Chave secreta exposta',
    risco_real: 'Uma chave secreta visivel da acesso a servicos e dados que deveriam ser privados.',
    o_que_fazer: 'Troque a chave no servico de origem e mantenha-a fora de textos e de codigo.',
  },
  supabase_secret: {
    titulo: 'Chave administrativa do banco exposta',
    risco_real: 'Essa chave ignora as regras de acesso e permite ler ou apagar todos os dados.',
    o_que_fazer: 'Gere uma chave nova no painel do banco agora e nao use mais a antiga.',
  },
  supabase_publishable: {
    titulo: 'Chave publica do banco em texto',
    risco_real: 'Essa chave e feita para o aplicativo, mas mostrada em textos ou registros facilita abusos.',
    o_que_fazer: 'Mantenha a chave apenas na configuracao do aplicativo e nao a escreva em mensagens ou registros.',
  },
  expo_push_token: {
    titulo: 'Endereco de notificacao exposto',
    risco_real: 'Com esse endereco, terceiros podem enviar avisos falsos ao seu aparelho.',
    o_que_fazer: 'Nao exiba esse endereco. Se vazou, saia da conta e entre de novo para gerar outro.',
  },
  password_kv: {
    titulo: 'Credencial escrita em texto',
    risco_real: 'Uma credencial em texto aberto pode ser lida por qualquer pessoa que veja a tela ou o registro.',
    o_que_fazer: 'Troque a credencial agora e nunca a digite fora dos campos de acesso.',
  },
  cid10: {
    titulo: 'Codigo de saude exposto',
    risco_real: 'Informacao de saude e sensivel e pode causar constrangimento ou discriminacao.',
    o_que_fazer: 'Retire o codigo do texto. O aplicativo nao precisa de informacao de saude.',
  },
  health_keyword: {
    titulo: 'Informacao de saude no texto',
    risco_real: 'Dados de saude sao sensiveis e a lei exige cuidado extra com eles.',
    o_que_fazer: 'Nao escreva detalhes de saude em nomes ou descricoes. Mantenha isso fora do aplicativo.',
  },
  geo_precise: {
    titulo: 'Localizacao exata exposta',
    risco_real: 'A posicao exata mostra onde fica sua propriedade e quando ela pode estar sozinha.',
    o_que_fazer: 'Prefira informar so a cidade. Compartilhe a posicao exata apenas com quem precisa.',
  },
  geo_single: {
    titulo: 'Parte de uma coordenada no texto',
    risco_real: 'Um valor de coordenada isolado pode ser somado a outros e revelar o local da propriedade.',
    o_que_fazer: 'Retire valores de coordenadas dos textos livres e use o mapa do aplicativo.',
  },
};
// TEMPLATES-END

export const SYSTEM_PT_BR =
  'Voce explica riscos de privacidade em portugues do Brasil, em linguagem simples, para um produtor rural sem formacao tecnica. ' +
  'Use somente os rule_id fornecidos, nunca invente dados, numeros, links ou fatos. ' +
  'Responda apenas pelo esquema estruturado: titulo curto, risco_real e o_que_fazer objetivos, e o nivel de risco.';

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const inList = (list: readonly string[], v: unknown): v is string => typeof v === 'string' && list.includes(v);

export type ParseResult = { ok: true; items: RuleItem[] } | { ok: false; error: string };

export function parseRequest(body: unknown): ParseResult {
  if (!isObj(body) || !Array.isArray(body.items)) return { ok: false, error: 'corpo invalido' };
  if (body.items.length === 0 || body.items.length > MAX_ITEMS) return { ok: false, error: 'quantidade de itens invalida' };
  const seen = new Set<string>();
  const items: RuleItem[] = [];
  for (const raw of body.items) {
    if (!isObj(raw)) return { ok: false, error: 'item invalido' };
    const { rule_id, severity, sink, action, count } = raw;
    if (!inList(RULE_IDS, rule_id)) return { ok: false, error: 'rule_id invalido' };
    if (!inList(SEVERITIES, severity)) return { ok: false, error: 'severity invalida' };
    if (!inList(SINK_IDS, sink)) return { ok: false, error: 'sink invalido' };
    if (!inList(ACTIONS, action)) return { ok: false, error: 'action invalida' };
    if (typeof count !== 'number' || !Number.isInteger(count) || count < 1 || count > 100000) {
      return { ok: false, error: 'count invalido' };
    }
    const k = `${rule_id}|${severity}|${sink}|${action}|${count}`;
    if (seen.has(k)) continue;
    seen.add(k);
    items.push({ rule_id: rule_id as RuleId, severity: severity as Severity, sink, action, count });
  }
  return { ok: true, items };
}

// FNV-1a de 64 bits como duas metades de 32 bits (sincrono, sem crypto) -> 16 hex.
export function cacheKey(item: { rule_id: string; severity: string; sink: string; action: string }): string {
  const s = `${PROMPT_VERSION}|${item.rule_id}|${item.severity}|${item.sink}|${item.action}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x9747b28c;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x85ebca6b) >>> 0;
    h2 = (h2 ^ (h2 >>> 13)) >>> 0;
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

export function buildPrompt(items: RuleItem[]): string {
  const lines = items.map(
    (it) =>
      `- rule_id=${it.rule_id}; gravidade=${it.severity}; destino=${it.sink}; acao=${it.action}; ocorrencias=${it.count}; tipo=${RULE_CATALOG[it.rule_id]}`,
  );
  return (
    'Explique, para cada item abaixo, o risco e o que fazer. Responda com um alerta por rule_id, sem repetir.\n' +
    lines.join('\n')
  );
}

export const SCHEMA = {
  type: 'object',
  properties: {
    alertas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          rule_id: { type: 'string', enum: [...RULE_IDS] },
          titulo: { type: 'string' },
          risco_real: { type: 'string' },
          o_que_fazer: { type: 'string' },
          nivel: { type: 'string', enum: [...LEVELS] },
        },
        required: ['rule_id', 'titulo', 'risco_real', 'o_que_fazer', 'nivel'],
        additionalProperties: false,
      },
    },
  },
  required: ['alertas'],
  additionalProperties: false,
} as const;

export function containsSensitive(text: string): boolean {
  return (
    /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/.test(text) ||
    /\d{9,}/.test(text.replace(/[\s.\-/]/g, '')) ||
    /http/i.test(text) ||
    text.includes('<') ||
    text.includes('eyJ') ||
    /sk-/i.test(text) ||
    text.includes('@')
  );
}

export function validateModelJson(text: string, items: { rule_id: string }[]): ExplainItem[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObj(parsed) || !Array.isArray(parsed.alertas)) return null;
  const expected = new Set(items.map((i) => i.rule_id));
  const out: ExplainItem[] = [];
  const got = new Set<string>();
  for (const a of parsed.alertas) {
    if (!isObj(a)) return null;
    const { rule_id, titulo, risco_real, o_que_fazer, nivel } = a;
    if (!inList(RULE_IDS, rule_id) || !expected.has(rule_id) || got.has(rule_id)) return null;
    if (!inList(LEVELS, nivel)) return null;
    if (typeof titulo !== 'string' || typeof risco_real !== 'string' || typeof o_que_fazer !== 'string') return null;
    if (titulo.length < 1 || titulo.length > 80) return null;
    if (risco_real.length < 1 || risco_real.length > 280) return null;
    if (o_que_fazer.length < 1 || o_que_fazer.length > 280) return null;
    if (containsSensitive(titulo) || containsSensitive(risco_real) || containsSensitive(o_que_fazer)) return null;
    if (/\d{9,}/.test(titulo + risco_real + o_que_fazer)) return null;
    got.add(rule_id);
    out.push({ rule_id, titulo, risco_real, o_que_fazer, nivel: nivel as Level, source: 'ai' });
  }
  if (got.size !== expected.size) return null;
  return out;
}

export function templateFor(item: { rule_id: string; severity: string }): ExplainItem {
  const t: TemplateText = (TEMPLATES as Record<string, TemplateText>)[item.rule_id] ?? {
    titulo: 'Dado sensivel detectado',
    risco_real: 'Um dado sensivel foi encontrado e pode ser usado de forma indevida.',
    o_que_fazer: 'Retire esse dado do texto e compartilhe so quando for realmente necessario.',
  };
  return {
    rule_id: item.rule_id,
    ...t,
    nivel: LEVEL_BY_SEVERITY[item.severity] ?? 'moderado',
    source: 'template',
  };
}
