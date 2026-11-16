import {
  ACTIONS,
  LEVELS,
  MODEL,
  PROMPT_VERSION,
  RULE_IDS,
  SCHEMA,
  SEVERITIES,
  SINK_IDS,
  TEMPLATES,
  buildPrompt,
  cacheKey,
  containsSensitive,
  parseRequest,
  templateFor,
  validateModelJson,
} from './logic';
import { TEMPLATES as CLIENT_TEMPLATES, templateFor as clientTemplateFor } from '../../../src/security/remediation/templates';

const item = { rule_id: 'email', severity: 'medium', sink: 'console', action: 'redacted', count: 2 };

describe('parseRequest', () => {
  it('rejeita corpo que nao e objeto ou sem items', () => {
    expect(parseRequest(null).ok).toBe(false);
    expect(parseRequest('x').ok).toBe(false);
    expect(parseRequest([]).ok).toBe(false);
    expect(parseRequest({ items: 'x' }).ok).toBe(false);
    expect(parseRequest({ items: [] }).ok).toBe(false);
  });

  it('rejeita mais de 12 itens', () => {
    const items = Array.from({ length: 13 }, (_, i) => ({ ...item, count: i + 1 }));
    expect(parseRequest({ items }).ok).toBe(false);
  });

  it('rejeita campos fora da allowlist', () => {
    expect(parseRequest({ items: [{ ...item, rule_id: 'x' }] }).ok).toBe(false);
    expect(parseRequest({ items: [{ ...item, severity: 'x' }] }).ok).toBe(false);
    expect(parseRequest({ items: [{ ...item, sink: 'x' }] }).ok).toBe(false);
    expect(parseRequest({ items: [{ ...item, action: 'x' }] }).ok).toBe(false);
  });

  it('rejeita count invalido', () => {
    for (const count of [0, -1, 1.5, 100001, '3', null]) {
      expect(parseRequest({ items: [{ ...item, count }] }).ok).toBe(false);
    }
  });

  it('deduplica itens identicos e aceita entrada valida', () => {
    const r = parseRequest({ items: [item, { ...item }, { ...item, count: 3 }] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.items).toHaveLength(2);
  });
});

describe('buildPrompt', () => {
  it('contem somente ids permitidos e texto de catalogo', () => {
    const r = parseRequest({ items: [item, { ...item, rule_id: 'jwt', severity: 'critical' }], extra: 'segredo' });
    if (!r.ok) throw new Error('parse');
    const p = buildPrompt(r.items);
    expect(p).toContain('rule_id=email');
    expect(p).toContain('rule_id=jwt');
    expect(p).not.toContain('segredo');
    expect(containsSensitive(p)).toBe(false);
  });
});

describe('validateModelJson', () => {
  const ok = {
    alertas: [{ rule_id: 'email', titulo: 'Titulo', risco_real: 'Risco simples.', o_que_fazer: 'Faca isto.', nivel: 'moderado' }],
  };
  const items = [{ rule_id: 'email' }];
  const run = (o: unknown) => validateModelJson(JSON.stringify(o), items);
  const mut = (patch: Record<string, unknown>) => ({ alertas: [{ ...ok.alertas[0], ...patch }] });

  it('aceita saida valida', () => {
    const r = run(ok);
    expect(r).not.toBeNull();
    expect(r?.[0].source).toBe('ai');
  });

  it('rejeita JSON invalido, enum errado e rule_id faltando ou extra', () => {
    expect(validateModelJson('nao-json', items)).toBeNull();
    expect(run(mut({ nivel: 'extremo' }))).toBeNull();
    expect(run({ alertas: [] })).toBeNull();
    expect(run(mut({ rule_id: 'jwt' }))).toBeNull();
    expect(run({ alertas: [ok.alertas[0], ok.alertas[0]] })).toBeNull();
  });

  it('rejeita textos longos, links, marcacao, arroba e sequencias de digitos', () => {
    expect(run(mut({ titulo: 'a'.repeat(81) }))).toBeNull();
    expect(run(mut({ risco_real: 'a'.repeat(281) }))).toBeNull();
    expect(run(mut({ o_que_fazer: 'a'.repeat(281) }))).toBeNull();
    expect(run(mut({ risco_real: 'veja http://x.co' }))).toBeNull();
    expect(run(mut({ risco_real: '<b>oi</b>' }))).toBeNull();
    expect(run(mut({ risco_real: 'fale com a@b' }))).toBeNull();
    expect(run(mut({ risco_real: 'numero 123456789 aqui' }))).toBeNull();
  });
});

describe('templates', () => {
  it('cobre as 19 regras com pt-BR, nivel pela gravidade e source template', () => {
    expect(RULE_IDS).toHaveLength(19);
    const map = { low: 'baixo', medium: 'moderado', high: 'alto', critical: 'critico' } as const;
    for (const id of RULE_IDS) {
      for (const sev of SEVERITIES) {
        const t = templateFor({ rule_id: id, severity: sev });
        expect(t.titulo.length).toBeGreaterThan(0);
        expect(t.risco_real.length).toBeGreaterThan(0);
        expect(t.o_que_fazer.length).toBeGreaterThan(0);
        expect(t.nivel).toBe(map[sev]);
        expect(t.source).toBe('template');
      }
    }
  });

  it('nenhum texto de template contem dado sensivel', () => {
    for (const id of RULE_IDS) {
      const t = TEMPLATES[id];
      expect(t).toBeDefined();
      for (const s of [t.titulo, t.risco_real, t.o_que_fazer]) expect(containsSensitive(s)).toBe(false);
      expect(t.titulo.length).toBeLessThanOrEqual(80);
      expect(t.risco_real.length).toBeLessThanOrEqual(280);
      expect(t.o_que_fazer.length).toBeLessThanOrEqual(280);
    }
  });

  it('paridade: TEMPLATES da funcao e do cliente sao identicos', () => {
    expect(TEMPLATES).toEqual(CLIENT_TEMPLATES);
    for (const id of RULE_IDS) {
      expect(clientTemplateFor({ rule_id: id, severity: 'high' })).toEqual(templateFor({ rule_id: id, severity: 'high' }));
    }
  });
});

describe('cacheKey', () => {
  it('e deterministica, hex de 16 e ignora count', () => {
    const a = cacheKey(item);
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(cacheKey({ ...item })).toBe(a);
    expect(cacheKey({ ...item, count: 9 } as typeof item)).toBe(a);
    expect(cacheKey({ ...item, sink: 'db_write' })).not.toBe(a);
    expect(cacheKey({ ...item, action: 'blocked' })).not.toBe(a);
  });
});

describe('constantes', () => {
  it('modelo, versao e esquema coerentes', () => {
    expect(MODEL).toBe('claude-opus-5-5');
    expect(PROMPT_VERSION).toBe(1);
    expect(SINK_IDS.length).toBe(10);
    expect(ACTIONS.length).toBe(4);
    expect(LEVELS.length).toBe(4);
    expect(SCHEMA.properties.alertas.items.properties.rule_id.enum).toHaveLength(19);
  });
});
