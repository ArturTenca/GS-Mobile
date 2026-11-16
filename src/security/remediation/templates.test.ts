import { RULES, scan } from '../pii/engine.ts';
import { TEMPLATES } from './templates';

describe('remediation templates vs PII engine', () => {
  it('has a template for every engine rule and no extras', () => {
    const ruleIds = RULES.map((r) => r.id).sort();
    expect(Object.keys(TEMPLATES).sort()).toEqual(ruleIds);
  });

  it('every template text scans clean with the engine', () => {
    for (const [id, t] of Object.entries(TEMPLATES)) {
      for (const text of [t.titulo, t.risco_real, t.o_que_fazer]) {
        const findings = scan(text);
        expect({ id, text, findings: findings.map((f) => f.ruleId) }).toEqual({ id, text, findings: [] });
      }
    }
  });
});
