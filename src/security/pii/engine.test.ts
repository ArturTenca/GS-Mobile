import {
  CATEGORIES,
  RULES,
  SEVERITIES,
  hasPii,
  redact,
  redactDeep,
  scan,
} from './engine.ts';
import {
  NEGATIVES,
  fakeAnthropicKey,
  fakeEmail,
  fakeGenericKey,
  fakeJwt,
  fakePasswordKv,
  fakePhone,
  fakeSupabaseSecret,
  formatCnpj,
  formatCpf,
  makeCnpj,
  makeCpf,
  makeLuhn,
  makeRng,
  randomDigits,
  zeroWidthObfuscate,
} from './fixtures.ts';

const rng = makeRng(20261116);
const CPF = makeCpf(rng);
const CNPJ = makeCnpj(rng);
const CARD = makeLuhn(rng);

const CANONICAL = [
  'cpf', 'cpf_masked', 'cnpj', 'rg', 'email', 'br_phone', 'cep', 'card', 'jwt', 'anthropic_key',
  'generic_secret_key', 'supabase_secret', 'supabase_publishable', 'expo_push_token', 'password_kv',
  'cid10', 'health_keyword', 'geo_precise', 'geo_single',
];

function ids(text: string): string[] {
  return scan(text).map((f) => f.ruleId);
}

describe('catalogo de regras', () => {
  it('tem exatamente as 19 regras canonicas', () => {
    expect(RULES.map((r) => r.id).sort()).toEqual([...CANONICAL].sort());
  });
  it('exporta categorias e severidades', () => {
    expect(CATEGORIES).toContain('identity');
    expect(SEVERITIES).toEqual(['low', 'medium', 'high', 'critical']);
  });
});

describe('CPF', () => {
  it.each([
    ['simples', CPF],
    ['pontuado', formatCpf(CPF)],
    ['com espacos', `${CPF.slice(0, 3)} ${CPF.slice(3, 6)} ${CPF.slice(6, 9)} ${CPF.slice(9)}`],
    ['com caracteres invisiveis', zeroWidthObfuscate(formatCpf(CPF))],
  ])('detecta CPF %s como critical', (_label, value) => {
    const found = scan(`cliente: ${value} ok`).filter((f) => f.ruleId === 'cpf');
    expect(found).toHaveLength(1);
    expect(found[0].severity).toBe('critical');
    expect(found[0].category).toBe('identity');
  });

  it('nao reporta CPF como telefone nem cartao', () => {
    const r = ids(formatCpf(CPF));
    expect(r).toEqual(['cpf']);
    expect(ids(CPF)).toEqual(['cpf']);
  });

  it('nao reporta CPF invalido nem sequencias', () => {
    expect(ids('111.111.111-11')).toEqual([]);
    expect(ids('123.456.789-00')).toEqual([]);
  });

  it('previa mantem apenas os 2 ultimos digitos', () => {
    const [f] = scan(formatCpf(CPF));
    expect(f.preview).toBe(`***.***.***-${CPF.slice(-2)}`);
  });

  it('detecta CPF mascarado como low', () => {
    const [f] = scan('***.***.***-12');
    expect(f.ruleId).toBe('cpf_masked');
    expect(f.severity).toBe('low');
  });
});

describe('CNPJ, cartao e telefone', () => {
  it('detecta CNPJ valido', () => {
    expect(ids(formatCnpj(CNPJ))).toEqual(['cnpj']);
    expect(ids(CNPJ)).toEqual(['cnpj']);
  });
  it('detecta cartao Luhn com separadores', () => {
    const spaced = CARD.replace(/(\d{4})(?=\d)/g, '$1 ');
    expect(ids(CARD)).toEqual(['card']);
    expect(ids(spaced)).toEqual(['card']);
    expect(scan(CARD)[0].severity).toBe('critical');
  });
  it('detecta telefone BR com DDD valido e ignora DDD invalido', () => {
    const [f] = scan(`ligue ${fakePhone()}`);
    expect(f.ruleId).toBe('br_phone');
    expect(f.preview).toBe('(**) *****-4321');
    expect(ids('(10) 98765-4321')).toEqual([]);
  });
});

describe('e-mail, RG e CEP', () => {
  it('mascara e-mail', () => {
    const [f] = scan(`contato ${fakeEmail()}`);
    expect(f.ruleId).toBe('email');
    expect(f.preview).toBe('j***@g***.com');
  });
  it('RG so com palavra de contexto', () => {
    expect(ids('rg 12.345.678-9')).toEqual(['rg']);
    expect(ids('12.345.678-9')).toEqual([]);
  });
  it('CEP hifenizado e CEP puro com contexto', () => {
    expect(ids('Rua A, 37500-000')).toEqual(['cep']);
    expect(ids('cep 37500000')).toEqual(['cep']);
    expect(ids('codigo 37500000')).toEqual([]);
    expect(scan('37500-000')[0].category).toBe('address');
  });
});

describe('credenciais', () => {
  it.each([
    ['senha=...', fakePasswordKv(), 'password_kv'],
    ['jwt', fakeJwt(), 'jwt'],
    ['chave anthropic', fakeAnthropicKey(), 'anthropic_key'],
    ['chave generica', fakeGenericKey(), 'generic_secret_key'],
    ['supabase secret', fakeSupabaseSecret(), 'supabase_secret'],
  ])('%s e mascarada sem manter nenhum caractere', (_label, secret, rule) => {
    const found = scan(`valor ${secret} fim`);
    expect(found.map((f) => f.ruleId)).toContain(rule);
    const target = found.find((f) => f.ruleId === rule);
    expect(target?.category).toBe('credential');
    expect(['high', 'critical']).toContain(target?.severity);
    expect(target?.preview).toBe('[REDACTED:secret]');
    const redacted = redact(`valor ${secret} fim`);
    expect(redacted).toBe('valor [REDACTED:secret] fim');
  });
  it('ignora placeholders', () => {
    expect(ids('senha=<sua-senha>')).toEqual([]);
    expect(ids('password: string')).toEqual([]);
    expect(ids('token=process.env.TOKEN')).toEqual([]);
  });
  it('publishable key e low', () => {
    const key = 'sb_' + 'publishable_' + 'Zq8Lm2Xv9TrKp4Wd7NcHj3Bf6';
    expect(scan(key)[0].severity).toBe('low');
  });
  it('token Expo real e medium, placeholder nao', () => {
    const tok = 'Exponent' + 'PushToken[' + 'Zq8Lm2Xv9TrKp4Wd7N' + ']';
    expect(scan(tok)[0].ruleId).toBe('expo_push_token');
    expect(ids('ExponentPushToken[xxx]')).toEqual([]);
  });
});

describe('saude', () => {
  it('CID so com contexto', () => {
    expect(ids('CID J45')).toEqual(['cid10']);
    expect(ids('diagnóstico')).toEqual(['health_keyword']);
    expect(ids('A01')).toEqual([]);
  });
  it('vocabulario agronomico nao dispara', () => {
    for (const t of ['doenças nas plantas', 'fungo', 'praga']) expect(ids(t)).toEqual([]);
  });
});

describe('geolocalizacao', () => {
  it('coordenada precisa dentro do Brasil', () => {
    expect(ids('-21.12345, -45.01234')).toEqual(['geo_precise']);
    expect(ids('-21.12345 -45.01234')).toEqual(['geo_precise']);
  });
  it('2 casas decimais nao dispara', () => {
    expect(ids('-21.12, -45.01')).toEqual([]);
  });
  it('fora do Brasil nao dispara geo_precise', () => {
    expect(ids('48.85660, 2.35220')).toEqual([]);
  });
  it('lat/lng isolados com 5 casas', () => {
    expect(ids('lat=-21.12345')).toEqual(['geo_single']);
  });
});

describe('negativos', () => {
  it.each(NEGATIVES.map((t) => [t]))('sem achados em %s', (text) => {
    expect(scan(text)).toEqual([]);
  });
});

describe('vazamento e redacao', () => {
  it('JSON dos achados nao contem o valor original', () => {
    const text = `cpf ${formatCpf(CPF)} e ${fakeEmail()} e ${fakeJwt()}`;
    const json = JSON.stringify(scan(text));
    expect(json).not.toContain(CPF);
    expect(json).not.toContain(formatCpf(CPF));
    expect(json).not.toContain('joao.silva');
    expect(json).not.toContain(fakeJwt().slice(0, 20));
  });
  it('redact troca os trechos pela previa', () => {
    const out = redact(`CPF ${formatCpf(CPF)}.`);
    expect(out).toBe(`CPF ***.***.***-${CPF.slice(-2)}.`);
  });
  it('redactDeep copia e mascara strings aninhadas', () => {
    const input = { a: [`x ${fakeEmail()}`], b: { c: 3, d: formatCpf(CPF) }, e: null };
    const out = redactDeep(input);
    expect(JSON.stringify(out)).not.toContain('joao.silva');
    expect(JSON.stringify(out)).not.toContain(CPF);
    expect(out.b.c).toBe(3);
    expect(input.b.d).toBe(formatCpf(CPF));
  });
  it('hasPii respeita categorias', () => {
    expect(hasPii(formatCpf(CPF))).toBe(true);
    expect(hasPii(formatCpf(CPF), ['contact'])).toBe(false);
    expect(hasPii('tudo normal')).toBe(false);
  });
  it('filtra por categorias', () => {
    const text = `${formatCpf(CPF)} ${fakeEmail()}`;
    expect(scan(text, { categories: ['contact'] }).map((f) => f.ruleId)).toEqual(['email']);
  });
});

describe('propriedades e robustez', () => {
  it('1000 CPFs validos sao todos detectados', () => {
    const r = makeRng(7);
    let hits = 0;
    for (let i = 0; i < 1000; i += 1) {
      const cpf = makeCpf(r);
      if (scan(i % 2 ? cpf : formatCpf(cpf)).some((f) => f.ruleId === 'cpf')) hits += 1;
    }
    expect(hits).toBe(1000);
  });
  it('1000 numeros de 11 digitos aleatorios geram cerca de 1% de CPF', () => {
    const r = makeRng(11);
    let hits = 0;
    for (let i = 0; i < 1000; i += 1) {
      const digits = randomDigits(r, 11).join('');
      if (scan(digits).some((f) => f.ruleId === 'cpf')) hits += 1;
    }
    expect(hits).toBeLessThan(30);
  });
  it('1000 CNPJs e cartoes validos sao detectados', () => {
    const r = makeRng(13);
    for (let i = 0; i < 1000; i += 1) {
      expect(ids(makeCnpj(r))).toContain('cnpj');
      expect(ids(makeLuhn(r))).toContain('card');
    }
  });
  it('entradas adversariais longas terminam rapido', () => {
    const inputs = [
      '1'.repeat(10000),
      '1 '.repeat(5000),
      'a@'.repeat(5000),
      `${'a'.repeat(9999)}@`,
      '-'.repeat(10000),
      ' '.repeat(10000) + '1',
      'senha '.repeat(1600),
      '1.1234 '.repeat(1400),
      'a.'.repeat(5000),
    ];
    const t0 = Date.now();
    for (const text of inputs) scan(text);
    expect(Date.now() - t0).toBeLessThan(3000);
  });
  it('respeita maxLength', () => {
    const text = `${'x'.repeat(50)} ${formatCpf(CPF)}`;
    expect(scan(text, { maxLength: 20 })).toEqual([]);
    expect(scan(text)).toHaveLength(1);
  });
  it('entrada vazia ou invalida nao quebra', () => {
    expect(scan('')).toEqual([]);
    expect(redact('')).toBe('');
  });
});
