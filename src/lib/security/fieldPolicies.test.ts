import { formatCpf, makeCpf, makeRng } from '@/security/pii/fixtures';
import { ERR_FIELD_CHARS, ERR_FIELD_PII, validateField } from './fieldPolicies';
import type { FieldName } from './fieldPolicies';
import { clearEvents, peekEvents } from '@/security/taint/events';

const CPF = formatCpf(makeCpf(makeRng(7)));

const ACCEPTED: [FieldName, string][] = [
  ['name', "João D'Ávila"],
  ['name', 'Maria da Silva'],
  ['farmName', 'Sítio São José – Km 12'],
  ['farmName', 'Fazenda Boa Vista (Norte)'],
  ['street', 'R. 7 de Setembro, nº 45'],
  ['street', 'CEP 37130-000'],
  ['neighborhood', 'Jardim América'],
  ['city', 'São Paulo'],
  ['mainCrop', 'Café arábica'],
  ['sensorName', 'Sensor Estufa 1'],
];

const REJECTED_CHARS: [FieldName, string][] = [
  ['farmName', 'javascript:alert(1)'],
  ['farmName', "'; DROP TABLE sensors;--"],
  ['farmName', "' OR '1'='1"],
  ['farmName', '${7*7}'],
  ['farmName', '{{7*7}}'],
  ['farmName', '`rm -rf`'],
  ['farmName', 'a=b'],
  ['sensorName', '<img src=x onerror=alert(1)>'],
  ['name', 'João; select 1'],
  ['city', 'a|b'],
];

const REJECTED_PII: [FieldName, string][] = [
  ['farmName', CPF],
  ['sensorName', '11 99999-8888'],
  ['name', 'a@b.com'],
  ['street', `Rua X ${CPF}`],
];

describe('validateField', () => {
  it.each(ACCEPTED)('accepts %s: %s', (field, value) => {
    expect(validateField(field, value)).toEqual({ ok: true, value });
  });

  it.each(REJECTED_CHARS)('rejects %s: %s', (field, value) => {
    expect(validateField(field, value)).toEqual({ ok: false, error: ERR_FIELD_CHARS });
  });

  it.each(REJECTED_PII)('blocks PII in %s: %s', (field, value) => {
    expect(validateField(field, value)).toEqual({ ok: false, error: ERR_FIELD_PII });
  });

  it('never lets angle brackets survive', () => {
    const r = validateField('farmName', '<script>alert(1)</script>');
    if (r.ok) expect(r.value).not.toMatch(/[<>]/);
    else expect(r.error).toBeTruthy();
  });

  it('strips bidi, zero-width and null bytes', () => {
    expect(validateField('name', 'Jo‮ão​\u0000')).toEqual({ ok: true, value: 'João' });
  });

  it('rejects text above the field max with a pt-BR error', () => {
    const r = validateField('city', 'a'.repeat(81));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/muito longo/);
  });
});

describe('validateField security events', () => {
  beforeEach(() => clearEvents());

  it('records one blocked db_write event for PII, without the raw value', () => {
    validateField('farmName', CPF);
    const events = peekEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      ruleId: 'cpf',
      sink: 'db_write',
      action: 'blocked',
      origin: 'form.farmName',
    });
    expect(events[0].preview).not.toBe('');
    expect(JSON.stringify(events[0])).not.toContain(CPF);
  });

  it('records nothing for valid input', () => {
    validateField('farmName', 'Fazenda Boa Vista');
    expect(peekEvents()).toEqual([]);
  });
});
