# Relatorio do scanner de PII

Gerado em 2026-11-16T21:53:14.109Z. Arquivos varridos: 298. Achados: 86 (informativos: 0). Criticos fora da allowlist: 0.

Este relatorio mostra apenas arquivo, linha, regra e previa mascarada. Nenhum valor original e gravado.

### Por categoria

| Item | Achados |
| --- | ---: |
| contact | 31 |
| address | 24 |
| health | 15 |
| identity | 7 |
| location | 6 |
| credential | 3 |

### Por severidade

| Item | Achados |
| --- | ---: |
| medium | 47 |
| low | 28 |
| high | 9 |
| critical | 2 |

### Por arquivo

| Item | Achados |
| --- | ---: |
| src/lib/security/security.test.ts | 20 |
| src/security/pii/rules.ts | 13 |
| src/services/geocoding.test.ts | 12 |
| src/security/pii/engine.test.ts | 10 |
| src/features/farm/validate.test.ts | 6 |
| src/lib/security/fieldPolicies.test.ts | 3 |
| src/services/security.test.ts | 3 |
| docs/seguranca/README-cybersecurity.md | 1 |
| src/components/farm/FarmFormStep.tsx | 1 |
| src/features/auth/authLinks.test.ts | 1 |
| src/features/farm/validate.ts | 1 |
| src/features/profile/validateName.test.ts | 1 |
| src/features/sensor/sensorFlow.test.ts | 1 |
| src/lib/security/validate.ts | 1 |
| src/lib/supabase.ts | 1 |
| src/security/audit.test.ts | 1 |
| src/security/pii/fixtures.ts | 1 |
| src/security/pii/validators.test.ts | 1 |
| src/security/score.test.ts | 1 |
| src/security/taint/events.ts | 1 |
| src/security/taint/pushParity.test.ts | 1 |
| src/security/taint/taint.inaction.test.ts | 1 |
| src/security/taint/taint.test.ts | 1 |
| src/services/farms.test.ts | 1 |
| src/services/weather.test.ts | 1 |
| supabase/functions/push-alert/logic.test.ts | 1 |

### Seeds de demonstracao

| Arquivo | Achados | Criticos |
| --- | ---: | ---: |
| supabase/migrations/003_demo_farm.sql | 0 | 0 |
| supabase/migrations/007_demo_dataset.sql | 0 | 0 |
