# Phase 2: Onboarding & Início - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-11-12
**Phase:** 2-Onboarding & Início
**Areas discussed:** Regra Normal/Atenção/Crítico (+ demo data in time, raised during discussion)
**Areas offered but not selected:** Fluxo do onboarding, Layout do Início + selo demo (→ Claude's discretion)

---

## Regra Normal/Atenção/Crítico

### Crítico
| Option | Selected |
|--------|----------|
| Alerta crítico não resolvido | ✓ |
| Alerta crítico OU leitura muito fora do limite | |
| Contar alertas (2+ críticos / 3+ avisos) | |

### Atenção
| Option | Selected |
|--------|----------|
| Aviso aberto, leitura fora do limite ou sensor offline | ✓ |
| Só alertas de aviso abertos | |
| Avisos + leituras, sem offline | |

### Alertas visualizados contam?
| Option | Selected |
|--------|----------|
| Sim, até resolver | ✓ |
| Não, só "novo" conta | |

### Explicação no Início
| Option | Selected |
|--------|----------|
| Motivo principal + ação | ✓ |
| Lista curta de motivos | |
| Só o rótulo | |

### Offline após
| Option | Selected |
|--------|----------|
| 2 horas | ✓ |
| 6 horas | |
| 24 horas | |

### Alertas "info" mudam a condição?
| Option | Selected |
|--------|----------|
| Não, só aparecem na lista (recommended) | |
| Sim, contam como Atenção | ✓ |

### Texto quando Normal
| Option | Selected |
|--------|----------|
| Frase curta tranquila | ✓ |
| Frase + próxima checagem | |

---

## Dados demo no tempo (raised by Claude: frozen seed + 2 h offline rule would make every sensor offline)

| Option | Selected |
|--------|----------|
| Deslocar o tempo na leitura (service-layer anchoring) | ✓ |
| Gerar leituras novas no banco (pg_cron) | |
| Atualizar ao abrir o app (DB function backfill) | |

---

## Claude's Discretion

- Onboarding flow: rename demo property + create first non-demo area; not skippable; guard on onboarding_completed_at
- Início layout order, number of recent alerts (3), indicator aggregation
- Minimal read-only alert detail screen (status changes stay in Phase 4)

## Deferred Ideas

- Final demo-labeling policy (pending since Phase 1)
- pg_cron demo data generation
