# Walking Skeleton — AgroAlerta + AgroVigia

**Phase:** 1
**Generated:** 2026-11-11

## Capability Proven End-to-End

A new producer can sign up in the Expo app (phone or browser), be signed in immediately, and see their own name, e-mail and their own cloned demo-farm property (with real sensor and pending-alert counts read from Supabase under RLS) in the branded five-tab shell, then log out from Perfil.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Expo SDK 58 + React Native 0.88 + TypeScript (strict) + Expo Router (`src/app`, `web.output: "single"`, scheme `agroalerta`) + React Native Web | One codebase for Android, iOS and browser (FND-01); SPA output avoids SSR so `localStorage` never runs on a server |
| Navigation | `Stack.Protected` auth groups `(auth)` / `(app)` + `expo-router/js-tabs` with a custom 5-tab `TabBar`; `reset-password` route ungated | Brand-controlled bar with 48dp+ targets; session state alone drives routing; recovery link signs the user in mid-flow |
| Styling | `StyleSheet` + `src/theme/tokens.ts` (light/dark via `useColorScheme`); NativeWind NOT used | Tokens are the single source of truth, also needed as JS values for icons/charts (D-13 fallback); avoids Tailwind-3/NativeWind-on-SDK-58 risk |
| Components | In-repo RN library keeping Gemma Entregas names and props (`Button`, `Input`, `Card`, `Badge`, `Tabs`, `Modal`, ...), Lucide icons, Inter 400/600 | Ports the user's existing design system (D-11, D-13, D-14) |
| Data layer | Supabase Postgres, per-owner RLS (`auth.uid()` via `private.is_property_owner`), migrations in `supabase/migrations/001..003` | Locked backend; RLS and schema ship together (PITFALLS #6) |
| Demo data | `private.clone_demo_farm(uid)` in SQL, fired by a trigger on `auth.users` (exception-guarded) + self-heal RPC `public.ensure_demo_farm()`; `is_demo` on every simulated row | Atomic with signup, never client-callable for another uid, readings/alerts/risks derived from the same thresholds |
| Auth | Supabase Auth e-mail/password, signups on, "Confirm email" off (D-02), implicit flow for reset links, session persisted via `expo-sqlite/localStorage/install` | Official Expo + Supabase path; reset works across devices |
| Client state | `@tanstack/react-query` (server cache) + React context for auth/theme; no Zustand yet | YAGNI in Phase 1; Zustand arrives with selected-property state in Phase 2 |
| Service layer | `src/services/*` only importer of `@/lib/supabase` for data (plus auth, DatabaseGate, reset-password), enforced by ESLint `no-restricted-imports` | FND-06; adapters for ESP32 / climate / ML can slot in later |
| Deployment target | Local run: `npx expo start --web` (browser) and Expo Go (phone). Hosting deferred | No store identifiers or EAS project needed until push (Phase 4) |
| Directory layout | `src/{app,components/{ui,layout,brand},features/{auth,theme},hooks,lib,services,theme,types}` + `supabase/migrations` | Gemma-style feature folders plus a services layer |
| Tests | `jest` + `jest-expo` for pure TS logic (tokens, sanitize/validate, cooldown, auth errors, auth links, services, format) | Fast, no native device needed |

## Stack Touched in Phase 1

- [x] Project scaffold (framework, build, lint, test runner) — plan 01, 07
- [x] Routing — real routes: `(auth)`, `reset-password`, `(app)/(tabs)/*` — plans 03, 05, 06
- [x] Database — real WRITE: signup trigger creates producer + demo farm; real READ: Início/Perfil via service layer — plans 02, 07
- [x] UI — interactive elements wired to the API: Entrar/Criar conta form, forgot/reset, logout — plans 05, 06, 07
- [x] Deployment — documented local full-stack run command (`npx expo start --web`; Expo Go for native) with the Supabase project from plan 02

## Out of Scope (Deferred to Later Slices)

- Onboarding (property name/location/first area) and the real "Condição da propriedade" indicator (Phase 2)
- Sensor lists, charts, devices, Histórico (Phase 3)
- Alert center, thresholds editing, push notifications (Phase 4)
- Risk analyses UI, property/area CRUD, profile editing, password change from Perfil (Phase 5)
- Global/per-card "Dados demonstrativos" labels beyond Perfil (user will define the final policy; D-10, FND-09 pending clarification)
- 24h IP block, `login-rate-limit` Edge Function, `login_ip_blocks` (D-16), custom SMTP, store identifiers, EAS, hosting
- Manual theme toggle (device-driven only, D-06), NativeWind, Zustand

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions:

- Phase 2: first-run onboarding, then Início answering "is my farm OK?" (Normal / Atenção / Crítico) from the cloned farm
- Phase 3: AgroVigia monitoring - sensor cards, sensor detail charts, devices, Histórico
- Phase 4: AgroAlerta alerts, thresholds, push notifications
- Phase 5: Análises, property/area management and the full Perfil
