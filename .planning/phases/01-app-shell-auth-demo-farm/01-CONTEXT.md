# Phase 1: App Shell, Auth & Demo Farm - Context

**Gathered:** 2026-11-11
**Status:** Ready for planning

<domain>
## Phase Boundary

A producer can open the app on a phone (Expo, Android/iOS) or in a browser (React Native Web), create an account, log in, recover a password, stay logged in, and log out — landing in a branded five-tab shell (Início, Monitoramento, Alertas, Análises, Perfil) backed by their own RLS-scoped demo farm cloned in Supabase.

Delivers: Expo + TypeScript project, design tokens (light + dark), reusable component library, screen states (loading / empty / error / success), service layer, Supabase schema + RLS + `clone_demo_farm(uid)` seed, auth screens, minimal Perfil with logout.

Requirements: FND-01..10, AUTH-01..05. Onboarding (property name/location/first area) is Phase 2 — not here.

</domain>

<decisions>
## Implementation Decisions

### Fluxo de login (auth UX)
- **D-01:** Login and signup live on **one screen with tabs** ("Entrar" / "Criar conta"), not separate screens. Brand/logo at the top of that screen. Keep the signup tab short so the form does not feel long.
- **D-02:** **No e-mail confirmation gate** — after signup the producer is logged in immediately (Supabase "Confirm email" disabled / auto-confirm). Low-connectivity rural users must not get stuck.
- **D-03:** Password recovery is **full in-app flow**: "Esqueci minha senha" → enter e-mail → Supabase sends link → link opens the app (native deep link via Expo scheme) or the web build on a branded **"Definir nova senha"** screen → producer sets new password → logged in. Deep link scheme must be configured in this phase (resolves STATE.md concern). If native deep linking proves blocked during execution, web route must still work and the app shows "e-mail enviado" confirmation.
- **D-04:** Signup collects **only name, e-mail, password**. Property name, location, and first planting area are collected by Phase 2 onboarding. In Phase 1, the cloned demo farm uses a provisional property name (e.g. "Minha Propriedade" / demo farm name) that Phase 2 onboarding overwrites.
- **D-05:** Session persists across app restarts and browser refresh (AUTH-04) — use the official Expo + Supabase storage approach from research.

### Visual e marca
- **D-06:** **Light + dark themes, automatic** — follows the device/browser color scheme. Every token, component, and (later) chart must have both variants. Light theme is the primary design target (outdoor readability); dark must keep the same semantic colors (dark green brand, light green positive, yellow/orange warning, red critical) with adequate contrast.
- **D-07:** Typography: **Inter** (via expo-google-fonts or equivalent), with tabular/clear numerals for readings like "24,5 °C".
- **D-08:** Icons: **Lucide** (lucide-react-native, works on native + web) — minimal stroke icons (leaf, droplet, thermometer, bell, etc.).
- **D-09:** Brand mark: simple **AgroAlerta logotype with a leaf + signal-wave symbol**, built as SVG in-repo. Used on the auth screen and app header.
- **D-10:** **"Dados demonstrativos" indicator — user decision: show it only in the user area (Perfil) for now.** Do NOT add a global top banner or per-card "Demo" chips in Phase 1. The user said they will explain the final labeling policy later.
  - ⚠ Conflicts with approved requirement **FND-09** ("visibly labeled wherever it appears") and Phase 1 success criterion 4, and later with **RISK-05** (Phase 5). Planner: implement the Perfil indicator; keep `is_demo` on every simulated row (FND-08 unchanged) and build a reusable `DemoBadge` component so the policy can be widened without refactor. Treat FND-09 as **pending user clarification** — flag it in verification rather than failing it.

### Base project: Gemma Entregas (added 2026-11-11, after discussion)
- **D-11:** Use the user's existing project **Gemma Entregas** (`Projeto_entrega-main/Projeto_entrega-main/`, React 19 + Vite + Tailwind 4 + React Router + Supabase) as the **base for login, design system, and navigation**. Stack stays **Expo + React Native + RN Web** (FND-01 unchanged) — Gemma is **ported**, not adopted as-is.
- **D-12:** **Port logic near-verbatim** (framework-agnostic TS): `src/features/auth/AuthProvider.tsx` (session, signIn/signOut, PT-BR error copy — extend with `signUp`, `resetPassword`, `updatePassword`), `src/lib/security/*` (sanitize, validateLogin, limits; drop `paths.ts` web-only parts as needed), `src/lib/supabase.ts` (client + `checkDatabaseAvailability`, adapted to Expo env vars `EXPO_PUBLIC_*` and RN session storage), `src/components/layout/DatabaseGate.tsx` + `ui/DatabaseUnavailable.tsx` (connection-error state pattern), `src/features/theme/ThemeProvider.tsx` (adapt: follow device scheme via `useColorScheme` per D-06; keep provider/hook API).
- **D-13:** **Rewrite UI components in React Native keeping Gemma's component names, props API, and visual rules**: `Button`, `Input`, `Card` (default/important variants), `Badge`, `Tabs` (reuse for the Entrar/Criar conta auth tabs — D-01), `Modal`, `LoadingState`, `EmptyState`, `ErrorBoundary`, `Select`, `Textarea`. Styling: user accepted the option proposing **NativeWind** (Tailwind classes) to stay close to Gemma; researcher must validate NativeWind on Expo SDK 58 + web against the STACK.md warning ("NativeWind … mismatch risk → StyleSheet + tokens"). If it is not solid, fall back to StyleSheet + a `theme.ts` token module — either way, tokens are the single source of truth.
- **D-14:** **Design rules from `skills/DESIGN.md` carry over**: 390px mobile base, centered max-width container on desktop/web (~500px app column as in `AppShell`), spacing scale 4/8/12/16/24/32/48 only, radius 12px (buttons/cards) and 16px (important cards), min 48px touch height, Inter 400–700, short animations <200ms, "when in doubt remove elements", cards always have primary info + secondary info + quick action. **Palette is replaced**: Gemma orange `#F54B2E` → AgroAlerta dark green primary; success/warning/error semantics kept (light green / amber-orange / red); Gemma's light/dark token structure (`index.css` `@theme` + `html.dark` overrides, incl. color-blind-safe chart series) is the template for AgroAlerta tokens. Exact greens locked in UI-SPEC.
- **D-15:** **Navigation**: base on Gemma `BottomNavigation` + `AppShell` look (card background, top border, active = primary color, safe-area padding, 48px targets, icon + label) but **five fixed tabs, no central menu button / sheet**: Início, Monitoramento, Alertas, Análises, Perfil (FND-02). Implement with Expo Router tabs + custom tab bar. Replace Gemma's hand-drawn `NavIcons.tsx` with Lucide (D-08).
- **D-16:** **Login protection**: port only the **client-side cooldown** from `useLoginRateLimit.ts` (5 failures → 30s wait with PT-BR message). **Do NOT** port the 24h IP block, `login-rate-limit` Edge Function, or `login_ip_blocks` table.
- **D-17:** **Differences from Gemma to fix while porting**: Gemma has no signup and public sign-up disabled → AgroAlerta needs signup (AUTH-01) with sign-up enabled and no e-mail confirmation (D-02). Gemma data is shared across all users → AgroAlerta RLS is per-owner (`auth.uid()`), per-user demo farm clone (FND-07/08). Gemma theme toggle is manual (localStorage) → AgroAlerta follows device (D-06). Gemma wordmark/logo → new AgroAlerta logo (D-09). Gemma's `skills/CYBERSECURITY.md` rules apply (no secrets in repo, `.env` ignored, sanitize inputs).
- **D-18:** Do **not** carry over Gemma domain code (entregas, pedidos, clientes, condomínios, agenda, quadro, financeiro, produtos, maps/routing, dnd-kit, leaflet). The Gemma folder is a **read-only reference**; new app code lives at the repo root, not inside `Projeto_entrega-main/`.

### Claude's Discretion
- Exact shade values, spacing scale, radius scale, elevation — to be locked in `/gsd:ui-phase 1` (UI-SPEC) following PROJECT.md color direction.
- Content of Início / Monitoramento / Alertas / Análises tabs during Phase 1 (not discussed): use a minimal, clean placeholder/state using the shared screen-state components; must not look broken. Real content arrives in Phases 2–5.
- Demo farm narrative (not discussed): invent a coherent Brazilian farm — PT-BR names, one realistic city/state, 2–3 planting areas with crops, sensors for ambient temp, air humidity, soil moisture (at least one sensor offline and one reading outside default thresholds so alerts are consistent), ~30 days of readings, alerts derived from the same readings/thresholds, 4 risk analyses, climate snapshot.
- Password rules / error message copy: sensible defaults (Supabase min length), short PT-BR messages, "mostrar senha" toggle.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project scope & requirements
- `.planning/PROJECT.md` — product vision, constraints, key decisions (Supabase, PT-BR, five tabs, demo labeling intent)
- `.planning/REQUIREMENTS.md` — FND-01..10, AUTH-01..05 (Phase 1 rows); note D-10 vs FND-09
- `.planning/ROADMAP.md` §Phase 1 — goal and 5 success criteria

### Research (stack, architecture, pitfalls)
- `.planning/research/SUMMARY.md` — Expo SDK 58, Expo Router, custom tab bar, Supabase, Zustand + React Query, gifted-charts, `clone_demo_farm(uid)`
- `.planning/research/STACK.md` — versions and what NOT to use
- `.planning/research/ARCHITECTURE.md` — UI → hooks → services → Supabase; schema; build order
- `.planning/research/PITFALLS.md` — RLS from migration 1, web-safe components, tab-bar outdoor UX

### Base project to port (Gemma Entregas — read-only reference)
Root: `Projeto_entrega-main/Projeto_entrega-main/`
- `skills/DESIGN.md` — design philosophy and rules to carry over (D-14)
- `skills/CYBERSECURITY.md` — security rules to keep
- `src/index.css` — light/dark token structure + chart series palette (template for tokens)
- `src/features/auth/AuthProvider.tsx`, `src/features/auth/ProtectedRoute.tsx`, `src/features/auth/useLoginRateLimit.ts` — auth logic (D-12, D-16)
- `src/pages/LoginPage.tsx` — login form structure, error/cooldown messaging
- `src/lib/supabase.ts`, `src/lib/security/*` — client + availability check + input sanitizing/validation
- `src/components/layout/AppShell.tsx`, `BottomNavigation.tsx`, `DatabaseGate.tsx` — shell and nav look (D-15)
- `src/components/ui/*` — component APIs to re-implement in RN (D-13)
- `src/features/theme/ThemeProvider.tsx`, `storage.ts` — theme provider API
- `supabase/migrations/001..003_*.sql` — migration + RLS file conventions (adapt to per-owner RLS)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No AgroAlerta app code yet. Reusable assets come from Gemma Entregas (see canonical refs): auth provider, security utils, Supabase client/health check, theme provider, UI component APIs, shell/nav design, migration conventions. Web-only pieces (react-router, DOM elements, Tailwind CSS-file theming, `window`/`localStorage`) must be adapted to Expo Router / RN equivalents.

### Established Patterns
- From Gemma: feature folders (`src/features/<domain>/`), `src/components/ui/` primitives, `src/components/layout/`, `src/lib/` for clients/utils, `@/` path alias, PT-BR user copy, try/catch around every Supabase call with friendly messages, `DatabaseGate` for unreachable DB. Keep these conventions in the Expo app; add `src/services/` for the service layer (FND-06).

### Integration Points
- Supabase project (Auth + Postgres + later Edge Functions). Credentials via Expo env (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`) — never hardcode.

</code_context>

<specifics>
## Specific Ideas

- Auth screen: tabs Entrar / Criar conta under the AgroAlerta logo; big inputs and buttons; "Esqueci minha senha" link on Entrar tab.
- Branded "Definir nova senha" screen reached from the e-mail link (native + web).
- Logo concept: leaf + signal wave (AgroVigia monitoring + AgroAlerta).

</specifics>

<deferred>
## Deferred Ideas

- **Final demo-labeling policy** — user will explain later; may require revisiting FND-09 / RISK-05 wording and Phase 1 success criterion 4.

</deferred>

---

*Phase: 01-app-shell-auth-demo-farm*
*Context gathered: 2026-11-11*
