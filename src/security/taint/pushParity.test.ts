// Paridade: o redator compacto do push e o motor de PII concordam no corpus sintetico.
import { redactForPush } from '../../../supabase/functions/push-alert/logic';
import { hasPii } from '../pii/engine.ts';
import {
  NEGATIVES,
  fakeEmail,
  fakeJwt,
  fakePhone,
  fakeSupabaseSecret,
  formatCnpj,
  formatCpf,
  makeCnpj,
  makeCpf,
  makeLuhn,
  makeRng,
} from '../pii/fixtures.ts';

const rng = makeRng(2026);
const POSITIVES: string[] = [
  `Sitio ${formatCpf(makeCpf(rng))}`,
  `Doc ${makeCpf(rng)}`,
  `Empresa ${formatCnpj(makeCnpj(rng))}`,
  `Contato ${fakeEmail()}`,
  `Fone ${fakePhone()}`,
  'Sítio 11 99999-8888',
  `Cartao ${makeLuhn(rng)}`,
  `Token ${fakeJwt()}`,
  `Chave ${fakeSupabaseSecret()}`,
  `Chave sk-${'Zq8Lm2Xv9TrKp4Wd7NcHj3Bf6Ys1Ge5U'}`,
];

// O redator do push cobre identidade, contato, financeiro e credenciais.
const SCOPE = ['identity', 'contact', 'financial', 'credential'] as const;

describe('push redactor vs PII engine', () => {
  it('agree on every positive: both detect and redaction removes the finding', () => {
    for (const text of POSITIVES) {
      expect(hasPii(text, [...SCOPE])).toBe(true);
      expect(redactForPush(text)).not.toBe(text);
      expect(hasPii(redactForPush(text), [...SCOPE])).toBe(false);
    }
  });

  it('agree on negatives: neither flags nor changes the text', () => {
    for (const text of NEGATIVES) {
      expect(hasPii(text, [...SCOPE])).toBe(false);
      expect(redactForPush(text)).toBe(text);
    }
  });
});
