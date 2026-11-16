import { auditTextRows, reconcileResolved } from './audit';
import { fingerprintOf } from './taint/events';
import { formatCpf, makeCpf, makeRng } from './pii/fixtures';

const CPF = formatCpf(makeCpf(makeRng(21)));
const CPF2 = formatCpf(makeCpf(makeRng(22)));

describe('auditTextRows', () => {
  it('returns one masked event per finding', () => {
    const events = auditTextRows([{ origin: 'sensors.name', text: `Sensor ${CPF}` }]);
    expect(events).toHaveLength(1);
    const e = events[0];
    expect(e.ruleId).toBe('cpf');
    expect(e.sink).toBe('db_at_rest');
    expect(e.action).toBe('detected');
    expect(e.origin).toBe('sensors.name');
    expect(e.fingerprint).toBe(fingerprintOf('cpf', 'db_at_rest', 'sensors.name'));
    expect(e.preview).not.toBe('');
    expect(JSON.stringify(e)).not.toContain(CPF);
    expect(JSON.stringify(e)).not.toContain(CPF.replace(/\D/g, ''));
  });

  it('returns [] for clean rows', () => {
    expect(auditTextRows([{ origin: 'properties.name', text: 'Fazenda Boa Vista' }])).toEqual([]);
  });

  it('merges the same rule across rows of one origin', () => {
    const events = auditTextRows([
      { origin: 'sensors.name', text: `A ${CPF}` },
      { origin: 'sensors.name', text: `B ${CPF2}` },
      { origin: 'sensors.name', text: `C ${CPF}` },
    ]);
    expect(events).toHaveLength(1);
    expect(events[0].occurrences).toBe(3);
  });

  it('ignores address-category findings (cep)', () => {
    expect(auditTextRows([{ origin: 'properties.address', text: 'CEP 37130-000' }])).toEqual([]);
  });
});

describe('reconcileResolved', () => {
  it('resolves detected at-rest findings that vanished', () => {
    const [prev] = auditTextRows([{ origin: 'sensors.name', text: `A ${CPF}` }]);
    const resolved = reconcileResolved([prev], []);
    expect(resolved).toHaveLength(1);
    expect(resolved[0]).toMatchObject({ action: 'resolved', fingerprint: prev.fingerprint, preview: '' });
    expect(reconcileResolved([prev], [prev])).toEqual([]);
  });

  it('ignores non at-rest and non detected events', () => {
    const [prev] = auditTextRows([{ origin: 'sensors.name', text: `A ${CPF}` }]);
    expect(reconcileResolved([{ ...prev, sink: 'db_write' }], [])).toEqual([]);
    expect(reconcileResolved([{ ...prev, action: 'resolved' }], [])).toEqual([]);
  });
});
