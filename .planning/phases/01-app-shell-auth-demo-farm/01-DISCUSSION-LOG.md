# Phase 1: App Shell, Auth & Demo Farm - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-11-11
**Phase:** 1-App Shell, Auth & Demo Farm
**Areas discussed:** Fluxo de login, Visual e marca
**Areas offered but not selected:** A fazenda demo, Abas antes das fases 2-5 (→ Claude's discretion)

---

## Fluxo de login

### Telas de auth
| Option | Description | Selected |
|--------|-------------|----------|
| Boas-vindas + telas separadas | Welcome screen with Entrar / Criar conta buttons leading to separate screens | |
| Uma tela com abas | Login and signup on one screen, switching via tabs | ✓ |
| Login direto + link | Opens on login; "Criar conta" link below | |

### Confirmação de e-mail
| Option | Description | Selected |
|--------|-------------|----------|
| Não, entra direto | Logged in right after signup | ✓ |
| Sim, confirmar antes | Must click e-mail link before access | |

### Recuperação de senha
| Option | Description | Selected |
|--------|-------------|----------|
| Link abre o app para nova senha | Deep link to branded "Definir nova senha" screen | ✓ |
| Só "e-mail enviado" | Reset on Supabase default page | |

### Campos do cadastro
| Option | Description | Selected |
|--------|-------------|----------|
| Só nome, e-mail e senha | Property data in Phase 2 onboarding | ✓ |
| Incluir propriedade e local | Collect property name/location at signup | |

---

## Visual e marca

### Tema
| Option | Description | Selected |
|--------|-------------|----------|
| Só claro | Single high-contrast light theme | |
| Claro + escuro automático | Follows device setting | ✓ |
| Claro + escolha no Perfil | Light default, dark toggle in settings | |

### Fonte
| Option | Description | Selected |
|--------|-------------|----------|
| Inter | Highly legible, clear numerals | ✓ |
| Manrope / Plus Jakarta | Geometric, more "tech" personality | |
| Nunito | Rounded, friendly | |

### Selo "Dados demonstrativos"
| Option | Description | Selected |
|--------|-------------|----------|
| Faixa fina no topo + chip nos cards | Discreet banner + Demo chips | |
| Só chip nos cards | Chips next to data only | |
| Faixa fixa e bem visível | Strong banner on every screen | |

**User's choice (free text):** "deixe apenas na parte do usuário, explico mais sobre depois" — show only in the user area (Perfil); will explain the policy later.
**Notes:** Conflicts with FND-09 / RISK-05; flagged in CONTEXT.md D-10 as pending clarification.

### Ícones e marca
| Option | Description | Selected |
|--------|-------------|----------|
| Lucide + logotipo simples | Stroke icons; leaf + signal-wave SVG logotype | ✓ |
| Material Symbols arredondados | Filled Android-style icons | |
| Você decide | Decide in UI phase | |

---

## Claude's Discretion

- Exact tokens (shades, spacing, radius) → /gsd:ui-phase 1
- Placeholder content of the four non-Perfil tabs in Phase 1
- Demo farm narrative (name, city, crops, sensors, offline/out-of-threshold cases)
- Password rules and error copy

## Deferred Ideas

- Final demo-labeling policy (user to explain later)
