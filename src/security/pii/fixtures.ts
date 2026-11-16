// Fixtures sinteticas do motor de PII. Nada aqui e um documento real:
// numeros sao gerados por algoritmo e credenciais montadas em tempo de
// execucao (concatenacao), para o scanner do repositorio nao as sinalizar.

export type Rng = () => number;

// LCG deterministico (Numerical Recipes). Retorna valores em [0, 1).
export function makeRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function randomDigits(rng: Rng, n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i += 1) out.push(Math.floor(rng() * 10));
  return out;
}

function distinct(d: number[]): boolean {
  return d.some((x) => x !== d[0]);
}

export function makeCpf(rng: Rng): string {
  let base = randomDigits(rng, 9);
  while (!distinct(base)) base = randomDigits(rng, 9);
  const d = [...base];
  for (let t = 9; t < 11; t += 1) {
    let sum = 0;
    for (let i = 0; i < t; i += 1) sum += d[i] * (t + 1 - i);
    d.push(((sum * 10) % 11) % 10);
  }
  return d.join('');
}

export function formatCpf(d: string): string {
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function makeCnpj(rng: Rng): string {
  const d = randomDigits(rng, 12);
  d[11] = 1;
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  for (const w of [w1, w2]) {
    let sum = 0;
    for (let i = 0; i < w.length; i += 1) sum += d[i] * w[i];
    const r = sum % 11;
    d.push(r < 2 ? 0 : 11 - r);
  }
  return d.join('');
}

export function formatCnpj(d: string): string {
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

// 16 digitos com prefixo Visa (4) e digito de Luhn valido.
export function makeLuhn(rng: Rng): string {
  const d = [4, ...randomDigits(rng, 14)];
  let sum = 0;
  let dbl = true;
  for (let i = d.length - 1; i >= 0; i -= 1) {
    let x = d[i];
    if (dbl) {
      x *= 2;
      if (x > 9) x -= 9;
    }
    sum += x;
    dbl = !dbl;
  }
  d.push((10 - (sum % 10)) % 10);
  return d.join('');
}

const ZW = String.fromCharCode(0x200b);

export function zeroWidthObfuscate(value: string): string {
  return value.split('').join(ZW);
}

function b64url(value: string): string {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Credenciais falsas montadas em tempo de execucao.
export function fakeJwt(): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({ sub: 'demo-user-0001', role: 'authenticated' }));
  return `${header}.${payload}.${b64url('fake-signature-for-tests')}`;
}

export function fakeAnthropicKey(): string {
  return ['sk', 'ant', 'api03', 'Zq8Lm2Xv9TrKp4Wd7NcHj3Bf6'].join('-');
}

export function fakeGenericKey(): string {
  return 'sk-' + 'Zq8Lm2Xv9TrKp4Wd7NcHj3Bf6Ys1Ge5U';
}

export function fakePasswordKv(): string {
  return 'sen' + 'ha=abc12345';
}

export function fakeEmail(): string {
  return ['joao.silva', 'gmail.com'].join('@');
}

export function fakePhone(): string {
  return '(' + '11' + ') 98765-4321';
}

export function fakeSupabaseSecret(): string {
  return 'sb_' + 'secret_' + 'Zq8Lm2Xv9TrKp4Wd7NcHj3Bf6';
}

// Textos que NUNCA devem gerar achado (app + seeds das migracoes).
export const NEGATIVES: string[] = [
  '23,5 C',
  '23,5°C',
  '2026-11-16T10:00:00Z',
  '2026-11-16 10:00:00+00',
  '123e4567-e89b-12d3-a456-426614174000',
  'lat -21.12 lng -45.01',
  'Há 80% de chance de chuva forte nas próximas horas.',
  'Adie adubação e pulverização; confira o escoamento nas áreas baixas.',
  'risco de doenças nas plantas',
  'Melhore a ventilação e observe sinais de fungo nas folhas.',
  'praga na lavoura',
  'A01',
  'Temperatura da Horta',
  'Temperatura acima do limite',
  'Sensor sem comunicação',
  'Verifique a bateria, o sinal e a conexão do sensor.',
  'Programe a irrigação desta área hoje, de preferência no início da manhã.',
  'Análise demonstrativa baseada em regras.',
  'Umidade do solo da horta registrou 18,4% abaixo do mínimo de 30%.',
  '111.111.111-11',
  '123.456.789-00',
  'ExponentPushToken[xxx]',
  'Fazenda Boa Vista, Rua das Palmeiras 120',
];
