import {
  inBrazilBbox,
  isValidCnpj,
  isValidCpf,
  isValidDdd,
  luhn,
  shannonEntropy,
} from './validators.ts';

function makeCpf(base: number[]): string {
  const d = [...base];
  for (let t = 9; t < 11; t += 1) {
    let sum = 0;
    for (let i = 0; i < t; i += 1) sum += d[i] * (t + 1 - i);
    d.push(((sum * 10) % 11) % 10);
  }
  return d.join('');
}

function makeCnpj(base: number[]): string {
  const d = [...base];
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

function makeLuhn(base: number[]): string {
  const d = [...base];
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

describe('isValidCpf', () => {
  it('aceita CPF gerado', () => {
    expect(isValidCpf(makeCpf([3, 9, 2, 1, 4, 7, 8, 5, 6]))).toBe(true);
  });
  it('rejeita digitos iguais e digito verificador errado', () => {
    expect(isValidCpf('111.111.111-11')).toBe(false);
    const ok = makeCpf([3, 9, 2, 1, 4, 7, 8, 5, 6]);
    const bad = ok.slice(0, 10) + String((Number(ok[10]) + 1) % 10);
    expect(isValidCpf(bad)).toBe(false);
  });
});

describe('isValidCnpj', () => {
  it('aceita CNPJ gerado', () => {
    expect(isValidCnpj(makeCnpj([1, 2, 3, 4, 5, 6, 7, 8, 0, 0, 0, 1]))).toBe(true);
  });
  it('rejeita digitos iguais', () => {
    expect(isValidCnpj('00000000000000')).toBe(false);
    expect(isValidCnpj('11.111.111/1111-11')).toBe(false);
  });
});

describe('luhn', () => {
  it('aceita numero de 16 digitos gerado e rejeita alterado', () => {
    const n = makeLuhn([4, 5, 3, 9, 1, 4, 8, 8, 0, 3, 4, 3, 6, 4, 6]);
    expect(n).toHaveLength(16);
    expect(luhn(n)).toBe(true);
    const alt = n.slice(0, 5) + String((Number(n[5]) + 1) % 10) + n.slice(6);
    expect(luhn(alt)).toBe(false);
  });
});

describe('isValidDdd', () => {
  it('valida DDDs', () => {
    expect(isValidDdd('11')).toBe(true);
    expect(isValidDdd('10')).toBe(false);
    expect(isValidDdd('20')).toBe(false);
  });
});

describe('inBrazilBbox', () => {
  it('dentro e fora do Brasil', () => {
    expect(inBrazilBbox(-21.12345, -45.01234)).toBe(true);
    expect(inBrazilBbox(48.85, 2.35)).toBe(false);
  });
});

describe('shannonEntropy', () => {
  it('baixa para repeticao, alta para mistura', () => {
    expect(shannonEntropy('aaaaaaaa')).toBeLessThan(1);
    expect(shannonEntropy('aB3xZ9qL2mK7pR4tW8yN5cV1')).toBeGreaterThan(3.5);
  });
});
