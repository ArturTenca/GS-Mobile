# Phase 1: App Shell, Auth & Demo Farm - Research

**Researched:** 2026-11-11
**Domain:** Expo SDK 58 + Expo Router + React Native Web + Supabase (Auth, Postgres RLS), port of the "Gemma Entregas" web app to React Native
**Confidence:** HIGH (stack, scaffold, session, SQL were executed/dry-run in this session); MEDIUM (native-device behavior of deep links, which could not be run here)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Fluxo de login (auth UX)**
- **D-01:** Login and signup live on **one screen with tabs** ("Entrar" / "Criar conta"), not separate screens. Brand/logo at the top of that screen. Keep the signup tab short so the form does not feel long.
- **D-02:** **No e-mail confirmation gate** — after signup the producer is logged in immediately (Supabase "Confirm email" disabled / auto-confirm). Low-connectivity rural users must not get stuck.
- **D-03:** Password recovery is **full in-app flow**: "Esqueci minha senha" → enter e-mail → Supabase sends link → link opens the app (native deep link via Expo scheme) or the web build on a branded **"Definir nova senha"** screen → producer sets new password → logged in. Deep link scheme must be configured in this phase (resolves STATE.md concern). If native deep linking proves blocked during execution, web route must still work and the app shows "e-mail enviado" confirmation.
- **D-04:** Signup collects **only name, e-mail, password**. Property name, location, and first planting area are collected by Phase 2 onboarding. In Phase 1, the cloned demo farm uses a provisional property name (e.g. "Minha Propriedade" / demo farm name) that Phase 2 onboarding overwrites.
- **D-05:** Session persists across app restarts and browser refresh (AUTH-04) — use the official Expo + Supabase storage approach from research.

**Visual e marca**
- **D-06:** **Light + dark themes, automatic** — follows the device/browser color scheme. Every token, component, and (later) chart must have both variants. Light theme is the primary design target (outdoor readability); dark must keep the same semantic colors (dark green brand, light green positive, yellow/orange warning, red critical) with adequate contrast.
- **D-07:** Typography: **Inter** (via expo-google-fonts or equivalent), with tabular/clear numerals for readings like "24,5 °C".
- **D-08:** Icons: **Lucide** (lucide-react-native, works on native + web) — minimal stroke icons (leaf, droplet, thermometer, bell, etc.).
- **D-09:** Brand mark: simple **AgroAlerta logotype with a leaf + signal-wave symbol**, built as SVG in-repo. Used on the auth screen and app header.
- **D-10:** **"Dados demonstrativos" indicator — user decision: show it only in the user area (Perfil) for now.** Do NOT add a global top banner or per-card "Demo" chips in Phase 1. The user said they will explain the final labeling policy later.
  - Conflicts with approved requirement **FND-09** ("visibly labeled wherever it appears") and Phase 1 success criterion 4, and later with **RISK-05** (Phase 5). Planner: implement the Perfil indicator; keep `is_demo` on every simulated row (FND-08 unchanged) and build a reusable `DemoBadge` component so the policy can be widened without refactor. Treat FND-09 as **pending user clarification** — flag it in verification rather than failing it.

**Base project: Gemma Entregas (added 2026-11-11, after discussion)**
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

### Deferred Ideas (OUT OF SCOPE)
- **Final demo-labeling policy** — user will explain later; may require revisiting FND-09 / RISK-05 wording and Phase 1 success criterion 4.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FND-01 | One Expo + TS codebase on Android/iOS/web | Verified scaffold: SDK 58, `expo export --platform web` and `expo-doctor` both pass (Standard Stack, Scaffold section) |
| FND-02 | Five-tab bar, >=48dp, one-handed, native+web | `expo-router/js-tabs` `Tabs` + `tabBar` prop; custom tab bar code (Code Examples) |
| FND-03 | Design tokens (dark green, light green, warning, critical), outdoor contrast | `src/theme/tokens.ts` single source; NativeWind decision = StyleSheet + tokens |
| FND-04 | Reusable component library | Gemma component port map (Porting Map) |
| FND-05 | Loading/empty/error/success states | `LoadingState`, `EmptyState`, `ErrorState`, `AsyncBoundary` + `DatabaseGate` pattern |
| FND-06 | Service layer only touches DB | `src/services/*` + React Query hooks; ESLint `no-restricted-imports` guard |
| FND-07 | Schema + RLS, multi-property at schema level | Full migrations in Appendix A (dry-run on Postgres) |
| FND-08 | Demo farm cloned per user, `is_demo` on every simulated record | `private.clone_demo_farm(uid)` in Appendix A (dry-run: 6 sensors, ~4.3k readings, 7 alerts, 4 risks per user) |
| FND-09 | Demo data visibly labeled | **Pending user clarification (D-10).** Perfil-only `DemoBadge`; reusable component |
| FND-10 | Basic accessibility | RN a11y props; status = icon + text, not color only; `maxFontSizeMultiplier` on tab labels |
| AUTH-01 | Signup with name/e-mail/password | `signUp` with `options.data.name`; trigger creates producer row + clone |
| AUTH-02 | Login e-mail/password | Port `signIn` verbatim |
| AUTH-03 | Password reset by e-mail | `resetPasswordForEmail` + `/reset-password` route (native deep link + web) |
| AUTH-04 | Session persists | `expo-sqlite/localStorage/install` (native), real `localStorage` (web) |
| AUTH-05 | Logout from Perfil | `signOut` + `queryClient.clear()` |
</phase_requirements>

## Summary

The stack is fully current and works end to end: in this session I scaffolded SDK 58 projects and confirmed that `npx expo export --platform web` and `npx expo-doctor` pass with Expo Router 58, `@supabase/supabase-js` 2.119 using `expo-sqlite/localStorage/install`, `lucide-react-native` 1.72, `react-native-svg`, `@expo-google-fonts/inter`, and `expo-router/js-tabs` with a custom `tabBar`. A separate `jest-expo` 58 run passed a trivial test. Native devices/emulators and Docker are not available on this machine, so native-only behavior (deep link on a phone) is MEDIUM confidence and must be checked by the user on a phone with Expo Go or a dev build.

Three findings change the plan versus the project-level research. (1) In SDK 58 `Tabs` from `expo-router` is **deprecated**; use `import { Tabs } from 'expo-router/js-tabs'` (supports the `tabBar` prop and exports `BottomTabBarProps`). (2) The default `create-expo-app --template default` sets `web.output: "server"` and ships NativeTabs/reanimated demo code and files that fail `tsc`; do **not** use it as-is. Use `blank-typescript` + manual Router setup with `web.output: "single"` (SPA, no server rendering, so `localStorage` never runs on a server). (3) NativeWind: v4.2.7 (stable, Tailwind **v3**) did bundle for web on SDK 58 in a probe, but its docs only claim SDK 57, v5 (Tailwind 4) is still `5.0.0-rc.1`, and Gemma's Tailwind-4 class strings would not port 1:1 anyway. **Recommend StyleSheet + `theme.ts` tokens**, with `useColorScheme()` for dark mode.

The database half was dry-run on a real Postgres engine (PGlite 0.5.16 / Postgres WASM): schema, per-owner RLS, the signup trigger, `clone_demo_farm`, column-level grants for alerts, two-user isolation, anon isolation, idempotency, and the "clone not callable by clients" check all behaved as designed. The full SQL is in Appendix A and is meant to be used near-verbatim as `supabase/migrations/*`.

**Primary recommendation:** Scaffold `blank-typescript` + Expo Router (`src/app`, `web.output: "single"`, scheme `agroalerta`), style with StyleSheet + `src/theme/tokens.ts` (light/dark via `useColorScheme`), use `expo-router/js-tabs` with a custom 5-tab bar, persist the Supabase session with `expo-sqlite/localStorage/install`, and let a Postgres trigger on `auth.users` create the producer row and call a private, non-client-callable `clone_demo_farm(uid)` (with a self-heal RPC `ensure_demo_farm()` as safety net).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Account creation, login, reset e-mail | Supabase Auth (API/Backend) | Client (forms, validation) | Credentials/e-mail only ever handled by Supabase Auth; client validates/sanitizes input only for UX |
| Session persistence | Client storage (SQLite-backed localStorage native / localStorage web) | — | Supabase JS stores/refreshes tokens; no server session |
| Route protection (logged-in vs out) | Client (Expo Router `Stack.Protected`) | Database RLS (real enforcement) | Web build is a static SPA; client guards are UX only, RLS is the security boundary |
| Producer profile + demo farm creation | Database (trigger + security-definer function) | RPC `ensure_demo_farm()` | Atomic with signup; client must never be able to forge or re-run a clone for another uid |
| Tenant isolation | Database (RLS per `owner_id`) | — | `auth.uid()` ownership via private helper function |
| Theme (light/dark) | Client (`useColorScheme` + tokens) | — | Follows device/browser scheme |
| Five-tab shell, safe area, 500px web column | Client (Expo Router + RN) | — | Pure UI |
| DB reachability / error states | Client (`DatabaseGate`, query error states) | — | Detects unreachable/paused Supabase project |
| Login cooldown | Client (in-memory) | Supabase Auth rate limits (real protection) | D-16: UX-only cooldown; server limits are the actual brute-force defense |
| Service layer | Client `src/services/*` | — | Only module family allowed to import the Supabase client for data |
| Demo labeling | Client (`DemoBadge`, Perfil) | `is_demo` column | D-10 |

## Standard Stack

### Core (versions verified against the npm registry on 2026-11-11)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo | ~58.0.24 | Runtime | Current `latest` dist-tag [VERIFIED: npm registry] |
| react / react-native | 19.3.0 / 0.88.1 | UI | Pinned by SDK 58 template [VERIFIED: create-expo-app output] |
| expo-router | ~58.0.31 | File routing, web URLs, `Stack.Protected` | Official [VERIFIED: npm registry; local node_modules] |
| react-native-web / react-dom | ~0.21.4 / 19.3.0 | Browser target | `npx expo install` pins [VERIFIED] |
| typescript | ~6.0.3 | Types | Version the SDK 58 template installs (not 5.x as STACK.md says) [VERIFIED: create-expo-app output] |
| @supabase/supabase-js | ^2.119.0 (node >=22) | Auth + PostgREST | Locked backend [VERIFIED: npm registry] |
| expo-sqlite | ~58.0.16 | `localStorage` polyfill for session storage | Official Expo+Supabase path [CITED: docs.expo.dev/guides/using-supabase] |
| react-native-safe-area-context / react-native-screens | ~5.11.1 / ~4.30.1 | Insets, native screens | Router peers [VERIFIED] |
| expo-linking / expo-constants | ~58.0.17 / ~58.0.16 | Deep links, `createURL` | Router peers [VERIFIED] |
| expo-font, expo-splash-screen | ~58.0.12 / ~58.0.14 | Font load + splash gate | [VERIFIED] |
| react-native-svg | 15.16.0 (Expo-pinned) | Logo + Lucide | [VERIFIED] |
| lucide-react-native | ^1.72.0 | Icons (D-08) | peer `react-native-svg ^15` OK; icon names verified: leaf, droplets, thermometer, bell, house, activity, chart-line, user, eye, eye-off, wifi-off, triangle-alert, sprout, cloud-rain, circle-check, circle-alert [VERIFIED: local dist] |
| @expo-google-fonts/inter | ^0.4.2 | Inter (D-07) | Official Expo fonts repo [VERIFIED: npm repo = github.com/expo/google-fonts] |
| @tanstack/react-query | ^5.107 | Server cache, loading/error states | Project STACK.md |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| jest + jest-expo + @types/jest + @react-native/jest-preset | ~30.5.2 / ~58.0.14 / 30.0.0 / ^0.88.1 | Unit tests of pure TS (sanitize, validate, cooldown, URL parsing, error mapping) | Phase 1: pure-logic tests only. Verified: `jest` run passed with `"jest": {"preset": "jest-expo"}` |
| zustand | 5.x | Client UI state | **Not needed in Phase 1** (YAGNI); add in Phase 2 with selected property |
| expo-secure-store | ~58.0.3 | — | **Do not use for the Supabase session** (2048-byte item limit vs. JWT session size) [ASSUMED] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| StyleSheet + tokens | NativeWind 4.2.7 | See "NativeWind decision" below. Works on web bundle, but Tailwind v3, SDK 57 documented, no JS color values for icons/charts |
| `expo-router/js-tabs` + custom `tabBar` | `expo-router/ui` headless `Tabs/TabList/TabTrigger` | Both stable; `js-tabs` gives `BottomTabBarProps` (state/navigation/insets) so Gemma-like bar is a plain component. Use js-tabs |
| `expo-router/js-tabs` | `NativeTabs` | iOS chrome ignores brand/48dp targets; rejected by STACK.md |

**Installation (scaffold verified in this session):**
```bash
# 1. scaffold into a temp dir, then move files to repo root (repo root is not empty: .planning, CLAUDE.md, Projeto_entrega-main/)
npx create-expo-app@latest _scaffold --template blank-typescript --no-install
#    move _scaffold/{package.json,app.json,tsconfig.json,assets,.gitignore} to repo root, delete App.tsx/index.ts, delete _scaffold
npm install
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants \
  react-native-web react-dom react-native-svg expo-font expo-splash-screen expo-sqlite
npx expo install @supabase/supabase-js @expo-google-fonts/inter
npm install lucide-react-native @tanstack/react-query
npx expo install jest-expo jest @types/jest @react-native/jest-preset -- --save-dev
npx expo-doctor            # expect 20/20
```
`package.json`: `"main": "expo-router/entry"`, scripts `web`, `test: "jest"`, `typecheck: "tsc --noEmit"`, and `"jest": {"preset": "jest-expo"}`.
`app.json` `expo` block (verified to export): `"scheme": "agroalerta"`, `"userInterfaceStyle": "automatic"`, `"plugins": ["expo-router", ...]`, `"web": {"bundler": "metro", "output": "single"}`. Add `"name": "AgroAlerta"`, `"slug": "agroalerta"`. `tsconfig.json`: `"strict": true` and `"paths": {"@/*": ["./src/*"]}` (the `@/` alias worked in the web export with no extra Babel plugin). Router root is `src/app/`.
Add `.env` and `.env.local` to `.gitignore`; commit `.env.example` with `EXPO_PUBLIC_SUPABASE_URL=` and `EXPO_PUBLIC_SUPABASE_ANON_KEY=`.

Note: npm 12 (installed here, `npm 12.0.2`) prints "install scripts blocked" warnings (e.g. `@parcel/watcher`); they did not break install, web export, or jest.

## Package Legitimacy Audit

`slopcheck` could not be run (no Python/pip on this machine), so per protocol packages are not tagged `[VERIFIED]` by slopcheck. Mitigation performed: each package confirmed on the npm registry, source repo checked, no `postinstall` script, long-lived with large weekly downloads.

| Package | Registry | Age | Downloads (wk) | Source Repo | slopcheck | Disposition |
|---------|----------|-----|----------------|-------------|-----------|-------------|
| expo, expo-* (router, sqlite, linking, font, constants, splash-screen, secure-store), jest-expo | npm | 2017+ | very high | github.com/expo/expo | unavailable | Approved (Expo-owned, named in Expo docs) |
| @supabase/supabase-js | npm | 6 yrs | very high | github.com/supabase/supabase-js | unavailable | Approved (named in Supabase + Expo docs) |
| react-native-svg | npm | 11 yrs | very high | github.com/software-mansion/react-native-svg | unavailable | Approved |
| lucide-react-native | npm | 4 yrs | 3.45M | github.com/lucide-icons/lucide | unavailable | Approved (named in D-08) |
| @expo-google-fonts/inter | npm | 6 yrs | 1.75M | github.com/expo/google-fonts | unavailable | Approved |
| @tanstack/react-query | npm | 4 yrs | very high | github.com/TanStack/query | unavailable | Approved |
| jest, @types/jest, @react-native/jest-preset | npm | long | very high | jestjs/jest, DefinitelyTyped, facebook/react-native | unavailable | Approved (dev) |

**Packages removed due to [SLOP]:** none. **Packages flagged [SUS]:** none.
Because slopcheck was unavailable, treat the third-party rows (lucide-react-native, @expo-google-fonts/inter, @tanstack/react-query) as `[ASSUMED]` legitimate by the strict rule; all are named in the user's own decisions or the project STACK.md, so a single `checkpoint:human-verify` before the first `npm install` (not one per package) is enough.

## Architecture Patterns

### System Architecture Diagram

```
 Phone (Expo Go / dev build)            Browser (RN Web, SPA "single")
          \                                   /
           v                                 v
   ┌───────────────────────── src/app/_layout.tsx ─────────────────────────┐
   │ SafeAreaProvider > ThemeProvider(useColorScheme) > ErrorBoundary       │
   │  > fonts+splash gate > DatabaseGate(ping /rest/v1/) > QueryClient      │
   │  > AuthProvider(session, signIn/Up/Out, reset, update)                 │
   │  > 500px web column > <Stack>                                          │
   └──────────────┬──────────────────────────────┬──────────────────────────┘
        no session│                              │session
                  v                              v
   Stack.Protected !session            Stack.Protected !!session
   (auth)/index  [Entrar | Criar]       (app)/(tabs)  Início | Monitoramento |
     |  signIn / signUp                  Alertas | Análises | Perfil  (custom tabBar)
     |  "Esqueci" -> resetPassword            |  screens -> hooks (React Query)
     v                                        v
   Supabase Auth ──e-mail──> link     src/services/* ──> Supabase PostgREST + RLS
   (agroalerta://reset-password#tokens | https://host/reset-password#tokens)
                  |
                  v
   /reset-password (ungated route, outside both Protected groups)
     native: Linking.useLinkingURL -> parse hash -> supabase.auth.setSession
     web: detectSessionInUrl does it; screen waits for session
     -> updateUser({password}) -> router.replace('/')

 Signup path inside Postgres:
   auth.users INSERT ──trigger private.handle_new_user──> producers row
                                          └─> private.clone_demo_farm(uid)  (idempotent, advisory lock)
   safety net: public.ensure_demo_farm() RPC (auth.uid() only) when no property is found
```

### Recommended Project Structure
```
app.json  package.json  tsconfig.json  .env.example  babel/metro: defaults (no custom config)
src/
├── app/
│   ├── _layout.tsx                 # provider stack, fonts/splash gate, Stack.Protected groups
│   ├── reset-password.tsx          # ungated "Definir nova senha"
│   ├── (auth)/_layout.tsx, index.tsx   # Entrar | Criar conta tabs (+ forgot-password view)
│   └── (app)/_layout.tsx, (tabs)/_layout.tsx (js-tabs + tabBar),
│       index.tsx, monitoramento.tsx, alertas.tsx, analises.tsx, perfil.tsx
├── components/ui/      # Button Input Card Badge Tabs Modal LoadingState EmptyState ErrorState ErrorBoundary Select Textarea DemoBadge Text
├── components/layout/  # AppColumn (500px web column), DatabaseGate, TabBar, ScreenContainer
├── components/brand/   # Logo.tsx (react-native-svg: leaf + signal waves)
├── features/auth/      # AuthProvider, useLoginRateLimit (+ pure cooldown), authErrors.ts, authLinks.ts, AuthForm pieces
├── features/theme/     # ThemeProvider (useColorScheme)
├── hooks/              # useCurrentProperty, useProducer (React Query)
├── lib/                # supabase.ts, queryClient.ts, security/{limits,sanitize,validate}.ts
├── services/           # producers.ts, properties.ts  (ONLY importers of supabase client for data)
├── theme/              # tokens.ts (colors light/dark, spacing, radius, type), fonts.ts
└── types/              # database.ts (hand-written or `supabase gen types`)
supabase/migrations/    # 001_schema.sql 002_rls.sql 003_demo_farm.sql  (Appendix A)
```

### Pattern 1: Root layout + auth guard (Expo Router `Stack.Protected`)
`Stack.Protected guard` is the documented client-side pattern (SDK 53+); web has no server redirects, so gate rendering on `loading` and keep the splash visible until fonts + session are loaded [CITED: docs.expo.dev/router/reference/authentication]. The password-reset route lives **outside** both protected groups because the recovery link signs the user in.
```tsx
// src/app/_layout.tsx  (shape, not exhaustive)
import { Stack, SplashScreen } from 'expo-router';
SplashScreen.preventAutoHideAsync();
function Navigator() {
  const { session, loading } = useAuth();
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  useEffect(() => { if (fontsLoaded && !loading) SplashScreen.hide(); }, [fontsLoaded, loading]);
  if (!fontsLoaded || loading) return null;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}><Stack.Screen name="(app)" /></Stack.Protected>
      <Stack.Protected guard={!session}><Stack.Screen name="(auth)" /></Stack.Protected>
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}
```

### Pattern 2: Tabs with custom tab bar (SDK 58 API)
```tsx
// src/app/(app)/(tabs)/_layout.tsx
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';   // NOT 'expo-router' (deprecated in 58)
export default function TabsLayout() {
  return <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false }}>
    <Tabs.Screen name="index" options={{ title: 'Início' }} />
    <Tabs.Screen name="monitoramento" options={{ title: 'Monitoramento' }} />
    <Tabs.Screen name="alertas" options={{ title: 'Alertas' }} />
    <Tabs.Screen name="analises" options={{ title: 'Análises' }} />
    <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
  </Tabs>;
}
```
`TabBar` (components/layout) = `View` (card bg, top border 1px `border`, `paddingBottom: insets.bottom`) of five `Pressable`s: `minHeight: 56`, `accessibilityRole="tab"`, `accessibilityState={{ selected }}`, `accessibilityLabel={title}`, Lucide icon (24px) + label (`maxFontSizeMultiplier={1.2}`, 12px min), active color = `primary`. Press logic from React Navigation contract: `const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true }); if (!isFocused && !e.defaultPrevented) navigation.navigate(route.name, route.params);`. Keep a `badge?: number` slot for the Phase 4 Alertas badge (`descriptors[route.key].options.tabBarBadge`). Icon map: Início `House`, Monitoramento `Activity`, Alertas `Bell`, Análises `ChartLine`, Perfil `User`.

### Pattern 3: Supabase client (native + web, one file)
```ts
// src/lib/supabase.ts   [CITED: docs.expo.dev/guides/using-supabase, adapted]
import 'expo-sqlite/localStorage/install';          // native: SQLite-backed localStorage; web: no-op (real localStorage)
import { AppState, Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';       // literal access required for inlining
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { storage: localStorage, autoRefreshToken: true, persistSession: true,
              detectSessionInUrl: Platform.OS === 'web' },   // web parses #access_token on /reset-password; native has no URL to read
    })
  : createClient('https://unavailable.invalid', 'unavailable', {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });

if (Platform.OS !== 'web') {   // refresh loop only while foregrounded
  AppState.addEventListener('change', (s) => (s === 'active' ? supabase.auth.startAutoRefresh() : supabase.auth.stopAutoRefresh()));
}
```
`checkDatabaseAvailability()` ports verbatim except `window.setTimeout/clearTimeout` -> global `setTimeout/clearTimeout`; keep the "200/400/401/403/406 = reachable" rule (works for legacy anon key and new `sb_publishable_` keys; a non-JWT key in `Authorization: Bearer` yields 401 = still reachable).
Env var name stays `EXPO_PUBLIC_SUPABASE_ANON_KEY` (CONTEXT canonical refs); the value may be the legacy anon JWT or a new publishable key (Expo docs call the variable `..._PUBLISHABLE_KEY`; either name works if the code reads the same one).

### Pattern 4: Password recovery on native + web (D-03)
Supabase-js default `flowType` is `'implicit'` [VERIFIED: auth-js source `flowType: 'implicit'`], so the e-mail link returns `redirectTo#access_token=…&refresh_token=…&type=recovery` (or `#error=access_denied&error_code=otp_expired…`). Implicit is deliberately kept: PKCE needs the code verifier stored on the device that requested the reset, which breaks "request on web, open link on phone".
- `redirectTo = Linking.createURL('reset-password')` — resolves to `agroalerta://reset-password` in a standalone/dev build, `exp://<ip>:8081/--/reset-password` in Expo Go, and `<origin>/reset-password` on web (expo-linking ships `createURL.web`) [MEDIUM: code inspected, not run on device].
- Supabase dashboard -> Authentication -> URL Configuration: Site URL = production web URL (or `http://localhost:8081` during dev); Redirect URLs: `agroalerta://**`, `exp://**`, `http://localhost:8081/**`, plus prod web `https://<host>/**`. Wildcard syntax: `*` excludes `.` and `/`, `**` matches anything [CITED: supabase.com/docs/guides/auth/redirect-urls].
- `/reset-password` screen (state machine `checking | ready | invalid | done`):
  - native: `const url = Linking.useLinkingURL()`; parse query+hash manually (do not rely on `URLSearchParams` in Hermes), if `type==='recovery'` and tokens -> `supabase.auth.setSession({access_token, refresh_token})`; if `error`/`error_code` -> `invalid` ("Link expirado ou inválido").
  - web: `detectSessionInUrl` already consumed the hash; just wait for `AuthProvider.loading === false`.
  - Do **not** depend on the `PASSWORD_RECOVERY` event (a subscriber registered after client init can miss it). Rule: on this route, `session` present => show form; no session after ~4 s => `invalid`.
  - Submit: validate length against limits -> `supabase.auth.updateUser({ password })` -> success -> `router.replace('/')` (user is already signed in per D-03).
- Fallback (D-03): if native deep link fails, the "Esqueci minha senha" UI still shows "E-mail enviado" and the web URL works.
- Always show the same message after requesting a reset ("Se o e-mail estiver cadastrado, enviamos o link"); Supabase does not reveal whether the account exists [CITED: supabase.com/docs/guides/auth/passwords].
- Default Supabase e-mail sender is limited to ~2 e-mails/hour and best-effort; for real use configure custom SMTP and PT-BR templates [CITED: same page]. Dashboard task, not code.

### Pattern 5: Signup (D-02, D-04, AUTH-01) and demo-farm creation
Client: `supabase.auth.signUp({ email, password, options: { data: { name } } })`. With "Confirm email" **off**, `data.session` is non-null and `onAuthStateChange` signs the user in; if `data.session` is null the project still has confirmation on -> show a developer-facing configuration error instead of silently hanging [CITED: docs.expo.dev/guides/using-supabase: signUp returns `session: null` until confirmed or until "Confirm email" is disabled]. Server: trigger `private.handle_new_user` (Appendix A) inserts `producers` from `raw_user_meta_data->>'name'` and calls `private.clone_demo_farm(new.id)` inside a sub-block with `exception when others -> raise warning`, so a seed bug can never block signup (Supabase warns trigger failures block signups [CITED: supabase.com/docs/guides/auth/managing-user-data]). Safety net: `public.ensure_demo_farm()` (authenticated only; derives uid from `auth.uid()`, idempotent) — the property service calls it when `properties` returns zero rows.
Why trigger rather than client RPC as primary: atomic with account creation, works for any future signup path, and the client never receives permission to clone for an arbitrary uid.

### Pattern 6: Login cooldown port (D-16)
Strip `loginRateLimitApi`, phases `watch`/`ip_blocked`, `blockIpForOneDay`, `refreshIpBlock`. Keep a tiny pure state machine (testable without React): `recordFailure(state, now)` -> after 5 failures `lockedUntil = now + 30_000`; `reset()` on success; `remainingSeconds(state, now)`. The hook only adds a 1 s `setInterval` (global, not `window.`) while locked. Copy: "Muitas tentativas incorretas. Aguarde {n}s." In-memory only: app restart/refresh clears it; document that real brute-force protection is Supabase Auth's server rate limiting [ASSUMED: default Supabase auth rate limits are active on hosted projects].

### Pattern 7: Theme tokens + `ThemeProvider` (D-06, D-14)
`src/theme/tokens.ts` exports `lightColors`, `darkColors` (same keys), `spacing = {xs:4, sm:8, md:12, lg:16, xl:24, xxl:32, xxxl:48}`, `radius = {button:12, card:12, cardLg:16}`, `fonts = {regular:'Inter_400Regular', medium:'Inter_500Medium', semibold:'Inter_600SemiBold', bold:'Inter_700Bold'}`, `touch = {min:48}`. Color keys mirror Gemma: `primary, primaryHover, text(secondary), success, warning, error, background, card, muted, border, series1..8, seriesOther`, plus `onPrimary`, `primarySoft`, `successSoft`, `warningSoft`, `errorSoft` (RN has no `bg-primary/10` alpha utility — precompute or use `rgba`). Gemma's color-blind-safe chart series copy over unchanged (light and `html.dark` values, see `index.css`); exact greens are locked by UI-SPEC (placeholder hex until then).
`ThemeProvider` keeps Gemma's `useTheme()` API but returns `{ theme: 'light'|'dark', colors, setTheme, toggleTheme }`: `theme = override ?? useColorScheme() ?? 'light'`. Per D-06 Phase 1 has no toggle UI (device-driven); keep `setTheme` for later. Remove `storage.ts` (`document`/`localStorage` are web-only). `useColorScheme()` follows `prefers-color-scheme` on RN Web and requires `"userInterfaceStyle": "automatic"` in `app.json` for native [VERIFIED: template uses it].
Styling approach: `const styles = useMemo(() => StyleSheet.create(...), [colors])` via a tiny `makeStyles(colors)` helper, or per-component inline arrays. Never hardcode hex outside `tokens.ts`.
Numerals: `fontVariant: ['tabular-nums']` on reading text [ASSUMED: supported on both native and RN Web per RN style docs]. With custom fonts on Android never rely on `fontWeight`; select the family per weight (`Inter_700Bold`).

### Pattern 8: Service layer + screen states (FND-05, FND-06)
`src/services/properties.ts` exports typed async functions that throw a typed `ServiceError` (PT-BR `message`) and are the only files importing `@/lib/supabase` besides `AuthProvider`. Hooks wrap them in React Query (`useCurrentProperty`, `useProducer`). Enforce with ESLint `no-restricted-imports` (pattern `@/lib/supabase` outside `src/services/**`, `src/features/auth/**`, `src/components/layout/DatabaseGate.tsx`). `AsyncBoundary({ query, isEmpty, empty, children })` renders `LoadingState` / `ErrorState` (retry button, "Sem conexão…") / `EmptyState` / success. Phase 1 uses it for Início (property + counts) and Perfil (producer + property) so every state exists and is reachable; Monitoramento/Alertas/Análises show `EmptyState` placeholders ("Disponível em breve" with the section icon), not blank screens.
On logout call `queryClient.clear()` so the next account never sees cached data.

### Pattern 9: Web column (D-14)
Root wrapper: outer `View` `flex:1, backgroundColor: colors.background (or slightly darker), alignItems:'center'`; inner `View` `flex:1, width:'100%', maxWidth:500`. The tab bar renders inside this column (JS tabs are in normal flow, not absolute), so it is automatically 500px wide on desktop. Use `Platform.OS === 'web'` only to apply the column; on native `maxWidth` is harmless.

### Anti-Patterns to Avoid
- **`import { Tabs } from 'expo-router'`**: deprecated in SDK 58; use `expo-router/js-tabs`.
- **`web.output: "server"` or `"static"`**: SSR/prerender executes layouts in Node where `localStorage` does not exist; use `"single"`.
- **Using the `--template default` project as-is**: ships NativeTabs, reanimated/worklets/gesture-handler demo code, CSS modules; `tsc` fails on several template files (`animated-icon.module.css`, `app-tabs.web.tsx`, `@/global.css`). Delete or avoid.
- **Gating the reset route behind `Stack.Protected`**: the recovery link creates a session mid-flow and would bounce the user.
- **Service-role key anywhere in the app/`.env`**; **`from('...')` in screens**.
- **Letting RLS-less tables exist even for one migration** (PITFALLS #6): schema and RLS ship in the same migration set.

## Porting Map (Gemma -> AgroAlerta)

| Gemma file | Action | What changes |
|------------|--------|--------------|
| `lib/security/limits.ts` | **Copy verbatim**; drop the Gemma-only constants (ENDERECO/TELEFONE/OBSERVACOES/QUANTIDADE), add `NAME_MAX: 120`, `PASSWORD_MIN` (match Supabase setting, default 6; suggest 8 and set in dashboard) | — |
| `lib/security/sanitize.ts` | **Copy verbatim** | none |
| `lib/security/validateLogin.ts` | **Copy verbatim**; add sibling `validateSignup(name,email,password)` and `validateNewPassword(pw)` using the same helpers | new functions |
| `lib/security/paths.ts` | **Drop** (open-redirect guard for react-router `state.from`; Expo Router guard handles redirects, no user-controlled path). If a post-login deep-link target is added later, re-add | — |
| `lib/security/loginRateLimitApi.ts`, `supabase/functions/login-rate-limit`, `migrations/004_login_ip_blocks.sql` | **Do not port** (D-16) | — |
| `lib/supabase.ts` | **Adapt** (Pattern 3) | `import.meta.env.VITE_*` -> `process.env.EXPO_PUBLIC_*`; sqlite localStorage; `detectSessionInUrl` web only; global timers |
| `features/auth/AuthProvider.tsx` | **Near-verbatim + extend** | Keep session/loading/onAuthStateChange/signIn/signOut. Add `signUp(name,email,password)`, `resetPassword(email)`, `updatePassword(pw)`. Add `mapAuthError(error)` using `error.code` (`invalid_credentials`, `user_already_exists`, `weak_password`, `over_request_rate_limit`, `over_email_send_rate_limit`, network -> "Não foi possível conectar…") to PT-BR copy. Keep login message generic ("E-mail ou senha inválidos.") |
| `features/auth/ProtectedRoute.tsx` | **Replace** | `Stack.Protected` guards + splash (Pattern 1). `PublicOnlyRoute` disappears |
| `features/auth/useLoginRateLimit.ts` | **Reduce** (Pattern 6) | only cooldown |
| `features/theme/ThemeProvider.tsx` | **Adapt** | `useColorScheme`; provide `colors` |
| `features/theme/storage.ts` | **Drop** | DOM-only |
| `components/layout/DatabaseGate.tsx` | **Adapt** | `div/className` -> `View/StyleSheet`; same state machine and copy ("Conectando ao banco de dados…") |
| `components/ui/DatabaseUnavailable.tsx` | **Rewrite** | RN `View/Text`, Lucide `DatabaseZap`/`CloudOff` icon; copy "O app abriu, mas não foi possível conectar ao servidor…"; "Tentar novamente" |
| `components/ui/ErrorBoundary.tsx` | **Rewrite** | class component stays; `window.location.reload()` -> state reset (`this.setState({hasError:false})`) or `expo-updates`-free reset; use Expo Router's `ErrorBoundary` export per-route as complement |
| `Button` | Rewrite | `Pressable`, `minHeight 48` (`sm`: 40), variants primary/secondary/danger/ghost, `loading` shows `ActivityIndicator`+"Carregando…", `accessibilityRole="button"`, `accessibilityState={{disabled,busy}}`, pressed state replaces `hover:` |
| `Input` | Rewrite | `TextInput`; props `label`, `error`, `secureTextEntry`+show/hide eye (`Eye`/`EyeOff`), `onChangeText`; `autoComplete="email"|"password"|"new-password"`, `keyboardType="email-address"`, `autoCapitalize="none"`, `autoCorrect={false}`; link label via `accessibilityLabel`; error `accessibilityLiveRegion="polite"`; focus ring = border `primary` 2px |
| `Card` | Rewrite | `View`; `variant: 'default'|'important'` -> radius 12/16, border+card bg, padding 16 |
| `Badge` | Rewrite | `View+Text`, soft bg variants (default/success/warning/error/primary) — add an optional leading icon prop so status is never color-only (FND-10) |
| `Tabs` | Rewrite | `View role=tablist` + `Pressable role=tab` (same `{tabs,active,onChange}` API); used by Entrar/Criar conta |
| `Modal` | Rewrite | RN `Modal` (works on web) with backdrop `Pressable`, `accessibilityViewIsModal` |
| `LoadingState`, `EmptyState` | Rewrite | `ActivityIndicator` (color primary) + text; `EmptyState` keeps `title/description/actionLabel/onAction/icon` |
| `Select` | Rewrite | Pressable that opens a bottom-sheet `Modal` list (no native `<select>`); keep `{label, options, value, onChange}` |
| `Textarea` | Rewrite | `TextInput multiline` |
| `layout/AppShell.tsx` | Replace | `AppColumn` (Pattern 9) + tabs layout |
| `layout/BottomNavigation.tsx`, `NavIcons.tsx` | Replace | custom `TabBar` (Pattern 2) + Lucide; no center menu/sheet |
| `components/brand/Logo.tsx` | Replace | New `react-native-svg` logo: leaf + 2-3 signal arcs, colors from tokens (works on web via svg) |
| `pages/LoginPage.tsx` | Rewrite as `(auth)/index.tsx` | Logo + `Tabs` (Entrar / Criar conta); Entrar: e-mail, senha (show/hide), "Esqueci minha senha"; Criar conta: nome, e-mail, senha only (D-04); cooldown message; `KeyboardAvoidingView` + `ScrollView keyboardShouldPersistTaps="handled"`; "not configured" banner kept when `!isSupabaseConfigured` |
| `index.css` tokens | Port to `tokens.ts` | Radii 12/12/16, series palette copied; primary replaced |
| `main.tsx` provider order | Port | Same order: Theme > ErrorBoundary > DatabaseGate > Auth > routes |
| Domain pages/features/libs, leaflet/maplibre/dnd-kit, `types/database.ts` | **Do not port** (D-18) | — |

## NativeWind decision (D-13) - Recommendation: StyleSheet + `src/theme/tokens.ts`

Evidence gathered:
- NativeWind latest stable is **4.2.7** (2026-09-14); `preview/rc` tag is **5.0.0-rc.1** (2026-11-02) [VERIFIED: npm dist-tags]. v4 requires **Tailwind CSS 3.4** (`tailwindcss@^3.4.17`), Babel preset + Metro wrapper + `global.css`; its install page only claims support up to Expo SDK 57 and tells Expo 57 users to add `react-native-worklets` with Reanimated 4 [CITED: nativewind.dev/docs/getting-started/installation]. v5 uses Tailwind 4 + `react-native-css` and its install doc targets SDK 54 [CITED: nativewind.dev/v5 via search].
- Probe on SDK 58: v4.2.7 + tailwind 3.4.17 + babel/metro config **did export for web and passed `expo-doctor`** [VERIFIED: ran in scratchpad]. Native rendering was **not** tested (no device).
- Why not anyway: (1) icons (`lucide`), SVG logo, chart libs, `ActivityIndicator`, tab-bar tint and `StatusBar` need color *values* in JS, so `tokens.ts` must exist regardless — NativeWind would be a second source of truth, contradicting D-13 "tokens are the single source of truth". (2) Gemma's class strings use Tailwind-4/CSS-variable syntax (`rounded-[var(--radius-button)]`, `focus-visible:ring-offset-2`, `hover:`, `backdrop-blur`), which NativeWind 4 (Tailwind 3) does not run unchanged, so "stay close to Gemma" benefit is mostly lost; the component *names and props* are what carry over. (3) Adds Reanimated/worklets/lightningcss-class toolchain risk on a brand-new SDK for a Walking Skeleton. (4) Dark mode is trivial with `useColorScheme()` + two token objects.
- **Fallback is the recommendation.** If the user still wants Tailwind classes later, adopt NativeWind v5 once it leaves RC, in a separate phase; tokens stay valid.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token storage/refresh | Custom JWT persistence | `supabase-js` + `expo-sqlite/localStorage/install` | Handles refresh, multi-tab, storage events |
| Route guards | Manual redirects in each screen | `Stack.Protected` | Handles stack reset on auth change |
| Safe area / insets | Hard-coded paddings | `react-native-safe-area-context` (`useSafeAreaInsets`) | Notches, Android gesture bar |
| Fonts | Manual font assets | `@expo-google-fonts/inter` + `useFonts` | Cross-platform |
| Icons | Hand-drawn SVG nav icons (Gemma `NavIcons`) | `lucide-react-native` | D-08 |
| Async state (loading/error/retry) | Per-screen `useState` flags | React Query + `AsyncBoundary` | One pattern for FND-05 |
| Password hashing / reset tokens / e-mail | Anything | Supabase Auth | Security |
| RLS ownership checks in each policy | Repeated subselects | `private.is_property_owner()` security-definer helper with `(select auth.uid())` | Performance + no recursion [CITED: supabase.com/docs/guides/database/postgres/row-level-security] |
| Seed data in JSON/TS | Hand-written arrays per screen | SQL `generate_series` in `clone_demo_farm` | Readings, alerts, risks derived from the same thresholds (ALRT-06 / PITFALLS #2) |

**Key insight:** the risky parts of this phase are all "boundary" concerns (storage, redirects, RLS, grants). Each has a first-party mechanism; custom code there is where bugs and leaks come from.

## Common Pitfalls

### Pitfall 1: Supabase privileges on `public` functions
**What goes wrong:** Supabase grants EXECUTE on new `public` functions to `anon`/`authenticated`; a `security definer` `clone_demo_farm(uid)` in `public` would let any client clone/overwrite for any uid via RPC.
**How to avoid:** Put definer functions in a `private` schema (not exposed by the Data API), `revoke all ... from public, anon, authenticated`, expose only `public.ensure_demo_farm()` which uses `auth.uid()`. Dry-run confirmed `permission denied for function clone_demo_farm` for an authenticated user [CITED: supabase RLS doc warning on exposed-schema definer functions].
**Warning signs:** Function visible in the dashboard "Database > Functions" under `public` with `security definer`.

### Pitfall 2: Trigger failure blocks signup
**What goes wrong:** "Database error saving new user".
**How to avoid:** Wrap the clone in `begin … exception when others then raise warning` (done), keep producer insert `on conflict do nothing`, and keep `ensure_demo_farm()` as self-heal. Test signup against the real project before building UI around it.

### Pitfall 3: Confirm e-mail still on / signups disabled
**What goes wrong:** `signUp` returns `session: null`; or Gemma-style "public sign-up disabled" blocks AUTH-01.
**How to avoid:** Dashboard: Authentication -> Providers -> Email: enable signups, **disable "Confirm email"** (D-02). Handle `data.session === null` explicitly. This is a **human-action checkpoint** (cannot be automated from the repo).

### Pitfall 4: Web SSR / prerender and `localStorage`
**What goes wrong:** Export or dev-server crash `localStorage is not defined`.
**How to avoid:** `web.output: "single"` (verified). If ever switching to `static`, lazy-create the client behind a `typeof window` check.

### Pitfall 5: `EXPO_PUBLIC_*` not inlined
**What goes wrong:** Config shows "not configured" in builds although `.env` exists.
**How to avoid:** access exactly `process.env.EXPO_PUBLIC_SUPABASE_URL` (no destructuring/dynamic keys); restart Metro after editing `.env` (`npx expo start -c`); `.env` is git-ignored, `.env.example` committed [ASSUMED: standard Expo behavior].

### Pitfall 6: Recovery link on native: hash is lost / route guard bounce
**What goes wrong:** Router opens `/reset-password` but the `#access_token` hash is only on the raw URL; or the new session triggers the `(auth)` guard and redirects.
**How to avoid:** Read the raw URL via `Linking.useLinkingURL()`; keep route outside Protected groups; test in Expo Go with an `exp://` redirect that is on the allow list.

### Pitfall 7: E-mail link scanners consume the one-time link
**What goes wrong:** Corporate/mail scanners GET the Supabase verify URL first; the user sees "expired".
**How to avoid:** Show a clear "Link expirado — peça um novo" state with a "Enviar novo link" button on `/reset-password` (the `invalid` state). [ASSUMED: known behavior of one-time e-mail links]

### Pitfall 8: Custom font weights on Android
**What goes wrong:** `fontWeight: '700'` with a custom family falls back or does nothing.
**How to avoid:** Pick `fonts.bold` family per weight; load 400/500/600/700 only.

### Pitfall 9: Keyboard hides the form (auth screen)
**How to avoid:** `KeyboardAvoidingView` (iOS `padding`) + `ScrollView keyboardShouldPersistTaps="handled"`; keep signup to three fields (D-01/D-04).

### Pitfall 10: Stale cache across accounts
**How to avoid:** `queryClient.clear()` in `signOut` and when `session.user.id` changes.

### Pitfall 11: Seed data not "live"
**What goes wrong:** Offline status or "last update" are wrong a week later because readings are generated relative to clone time only.
**How to avoid (Phase 1):** Seed relative to `now()` at signup (done); define sensor status as derived (`last_seen_at < now() - interval '3 hours'` => offline) in the client domain helper, never stored (PITFALLS #8). A refresh job is out of scope.

### Pitfall 12: Template files break `tsc`
Remove everything from the default template (`animated-icon`, `app-tabs`, `global.css` imports) or start from `blank-typescript` (recommended).

## Code Examples

### Cooldown (pure, testable)
```ts
// src/features/auth/cooldown.ts
export const MAX_ATTEMPTS = 5;
export const COOLDOWN_MS = 30_000;
export type CooldownState = { failures: number; lockedUntil: number | null };
export const initialCooldown: CooldownState = { failures: 0, lockedUntil: null };
export function recordFailure(s: CooldownState, now: number): CooldownState {
  const failures = s.failures + 1;
  return failures >= MAX_ATTEMPTS ? { failures: 0, lockedUntil: now + COOLDOWN_MS } : { failures, lockedUntil: s.lockedUntil };
}
export const isLocked = (s: CooldownState, now: number) => s.lockedUntil !== null && now < s.lockedUntil;
export const remainingSeconds = (s: CooldownState, now: number) => (isLocked(s, now) ? Math.ceil((s.lockedUntil! - now) / 1000) : 0);
```

### Auth URL parsing (no URLSearchParams dependency)
```ts
// src/features/auth/authLinks.ts
export function parseAuthParams(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const hashIdx = url.indexOf('#');
  const beforeHash = hashIdx >= 0 ? url.slice(0, hashIdx) : url;
  const hash = hashIdx >= 0 ? url.slice(hashIdx + 1) : '';
  const qIdx = beforeHash.indexOf('?');
  const query = qIdx >= 0 ? beforeHash.slice(qIdx + 1) : '';
  for (const part of [query, hash]) {
    for (const pair of part.split('&')) {
      if (!pair) continue;
      const [k, v = ''] = pair.split('=');
      try { out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' ')); } catch { /* ignore malformed */ }
    }
  }
  return out;
}
```

### AuthProvider additions
```ts
const signUp = useCallback(async (name: string, email: string, password: string) => {
  const v = validateSignup(name, email, password);
  if (!v.ok) return { error: v.error };
  try {
    const { data, error } = await supabase.auth.signUp({ email: v.email, password: v.password, options: { data: { name: v.name } } });
    if (error) return { error: mapAuthError(error) };
    if (!data.session) return { error: 'Confirmação de e-mail ativa no servidor. Desative "Confirm email" no Supabase.' };
    return { error: null };
  } catch { return { error: 'Não foi possível conectar ao servidor. Tente novamente.' }; }
}, []);
const resetPassword = useCallback(async (email: string) => {
  const v = sanitizeEmailInput(email);
  try { await supabase.auth.resetPasswordForEmail(v, { redirectTo: Linking.createURL('reset-password') }); } catch { /* generic copy below */ }
  return { error: null }; // always generic success to avoid account enumeration
}, []);
const updatePassword = useCallback(async (password: string) => {
  const { error } = await supabase.auth.updateUser({ password });
  return { error: error ? mapAuthError(error) : null };
}, []);
```

### Service layer sample
```ts
// src/services/properties.ts
export async function getCurrentProperty() {
  const q = () => supabase.from('properties').select('id,name,city,state,is_demo').order('created_at').limit(1).maybeSingle();
  let { data, error } = await q();
  if (error) throw new ServiceError('Não foi possível carregar a propriedade.', error);
  if (!data) { // trigger may have failed: self-heal once
    const r = await supabase.rpc('ensure_demo_farm');
    if (r.error) throw new ServiceError('Não foi possível preparar a fazenda demonstrativa.', r.error);
    ({ data, error } = await q());
  }
  return data;
}
```

### Supabase dashboard checklist (human-action)
Auth -> Providers -> Email: signups ON, Confirm email OFF, min password length (suggest 8). Auth -> URL Configuration: Site URL + redirect URLs (Pattern 4). Auth -> Email Templates: translate Recovery to PT-BR. Run migrations 001-003 (SQL Editor, or `npx supabase link` + `db push`; Docker is unavailable locally so `supabase start` is not an option). Copy URL + anon/publishable key into `.env`.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `import { Tabs } from 'expo-router'` | `expo-router/js-tabs` (JS tabs bundled w/ Router) | SDK 56+, deprecated export in 58 | Use new path |
| AsyncStorage for Supabase session | `expo-sqlite/localStorage/install` | Expo guide 2025-26 | Official, no polyfill |
| `react-native-url-polyfill/auto` | Not needed | Expo guide says unnecessary | Skip |
| `@react-navigation/*` in app code | Router entry points only | SDK 56+ | `BottomTabBarProps` re-exported from `expo-router/js-tabs` |
| `Stack` + manual redirect | `Stack.Protected` | SDK 53 | Use in root layout |
| Template `web.output: "server"` | `"single"` for a client-only SPA | n/a | Avoids SSR |
| TypeScript 5.x (STACK.md) | TS ~6.0.3 from SDK 58 template | SDK 58 | Use what the template installs |
| NativeWind 4 + Tailwind 3 | NativeWind 5 RC + Tailwind 4 | rc.1 2026-11-02 | Wait for stable |

**Deprecated/outdated:** `Tabs` from `expo-router`; `Linking.useURL` (use `useLinkingURL`); STACK.md claim "TypeScript 5.x".

## Runtime State Inventory
Not applicable (greenfield phase; Gemma folder is a read-only reference, not renamed or migrated).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `expo-secure-store` 2048-byte limit makes it unsuitable for the Supabase session | Standard Stack | Low; the official guide uses sqlite storage anyway |
| A2 | `fontVariant: ['tabular-nums']` works on native and RN Web | Pattern 7 | Low; fallback is plain Inter lining numerals |
| A3 | Supabase hosted auth rate limits are on by default (real brute-force defense behind the UX-only cooldown) | Pattern 6 | Medium; verify in dashboard Auth > Rate Limits |
| A4 | Standard Expo behavior for `EXPO_PUBLIC_*` inlining/restart | Pitfall 5 | Low |
| A5 | Mail scanners can consume one-time reset links | Pitfall 7 | Low; UX state is cheap anyway |
| A6 | `Linking.createURL('reset-password')` yields origin-based URL on web and `exp://…/--/reset-password` in Expo Go (code inspected, not run) | Pattern 4 | Medium; verify on a phone/browser; fallback: hard-code web URL from an env var `EXPO_PUBLIC_WEB_URL` |
| A7 | Trigger EXECUTE privilege is checked at `CREATE TRIGGER`, not at fire time, so `revoke ... from public` on `private.handle_new_user` is safe on hosted Supabase (worked in PGlite; Supabase's `supabase_auth_admin` firing path not tested) | Appendix A | Medium; verify by creating a real test account right after applying migrations. If signup says "Database error saving new user", `grant execute on function private.handle_new_user() to supabase_auth_admin` |
| A8 | Third-party packages (lucide-react-native, @expo-google-fonts/inter, @tanstack/react-query) treated `[ASSUMED]` because slopcheck was unavailable | Package Audit | Low; all named in user decisions / STACK.md |
| A9 | PGlite (Postgres 17 WASM) dry-run results transfer to Supabase Postgres 15/17 (same SQL features) | Appendix A | Low-Medium |

## Open Questions (RESOLVED)

1. **FND-09 vs D-10 (demo labeling)**
   - Known: user wants the indicator only in Perfil for now; policy to be explained later.
   - Unclear: final policy; success criterion 4 text.
   - Recommendation: implement Perfil `DemoBadge` + a one-line constant (`DEMO_LABEL_SCOPE`) so widening is a flag flip; verification marks FND-09 "pending user decision", not failed.
   - RESOLVED: D-10 wins; Perfil-only `DemoBadge` + `DEMO_LABEL_SCOPE` constant (plan 03 badge, plan 07 Perfil); FND-09 reported as covered, pending user clarification.

2. **Supabase project**
   - Known: no project credentials in repo; Docker/psql absent.
   - Recommendation: first plan includes a `checkpoint:human-action` to create/choose the project, apply dashboard settings, run migrations, and fill `.env`.
   - RESOLVED: plan 02 task 3 (`checkpoint:human-action` for project, dashboard settings, migrations, `.env`).

3. **App identifiers for store builds** (`ios.bundleIdentifier`, `android.package`) and EAS `projectId`
   - Not needed for Expo Go/web in Phase 1; push (Phase 4) needs EAS. Recommend deferring; set scheme now.
   - RESOLVED: deferred out of Phase 1 (scheme set in plan 01; store identifiers and EAS projectId handled in Phase 4 push work).

4. **Password minimum (Gemma had none; Supabase default 6)**
   - Recommendation: set 8 in the dashboard and mirror `PASSWORD_MIN = 8` client-side with PT-BR message "Use pelo menos 8 caracteres." (user may prefer default; low risk).
   - RESOLVED: minimum 8 set in dashboard (plan 02 task 3) and mirrored client-side as `PASSWORD_MIN = 8` (plan 04 validators, used by plan 05 auth screen).

5. **Physical-device verification of deep links**
   - Cannot be run here. Plan a manual UAT step: request reset in Expo Go on a phone, open e-mail link, confirm the "Definir nova senha" screen.
   - RESOLVED: manual UAT step in plan 07 task 3 (step 6, Expo Go reset link).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Expo CLI, tooling | yes | 24.18.0 (>=22.13 needed) | — |
| npm | installs | yes | 12.0.2 (blocks install scripts with warnings; non-fatal) | — |
| git | commits | yes | 2.55.0 | — |
| Network / npm registry | install | yes | — | — |
| Docker | local Supabase (`supabase start`) | no | — | Hosted Supabase project; apply SQL via dashboard SQL editor or `supabase link`/`db push` |
| psql / Postgres | local SQL checks | no | — | Hosted project; (optional) PGlite for dry-runs |
| Python / pip | slopcheck | no | — | npm registry checks done manually |
| Android emulator / adb / Xcode | native testing | no | — | Phone with Expo Go (scan QR) for native; browser for web |
| Java | Android builds | 1.8 (too old for local Android builds) | — | Not needed for Expo Go; EAS Build later |
| Supabase project + credentials | auth, DB | unknown (not in repo) | — | **Blocking** until the user creates one; human-action checkpoint |

**Missing dependencies with no fallback:** a Supabase project (user action).
**Missing with fallback:** Docker/psql (use hosted), native emulator (use Expo Go on a phone).

## Verification Approach (workflow.nyquist_validation is false: formal Validation Architecture section omitted)

- Run: `npx expo start --web` (dev), `npx expo export --platform web` (build smoke; verified working), `npm run typecheck` (`tsc --noEmit`), `npx expo-doctor` (20 checks; verified passing), `npx expo lint` (ESLint config via `eslint-config-expo`; add `no-restricted-imports` rule for FND-06), `npm test` (jest-expo).
- Unit tests worth including (fast, pure TS, no React Native rendering needed): `sanitize`, `validateLogin/Signup/NewPassword`, `cooldown` state machine, `parseAuthParams`, `mapAuthError`, sensor-status helper. Skip component snapshot tests in Phase 1 (requires `@testing-library/react-native` 14 + `test-renderer`; not needed for a Walking Skeleton).
- Manual/UAT script (needs real Supabase): create account A and B; confirm A sees only its own farm (RLS); refresh browser -> still logged in; kill/reopen app -> still logged in; logout; request reset; open link (web, then phone); set new password; Perfil shows name, e-mail, property, "Dados demonstrativos"; toggle OS dark mode -> app follows; phone-width (390px) and desktop (500px column) screenshots.
- SQL smoke (already dry-run in PGlite, repeat on the real project): two accounts -> counts per account equal (6 sensors, ~4.3k readings, 7 alerts, 4 risk analyses), second `ensure_demo_farm()` returns same property id, `rpc('clone_demo_farm')` from the client fails, `update alerts set title=...` fails, `update alerts set status='visualizado'` works, anon sees nothing.

## Security Domain

(`security_enforcement` not disabled in config -> included.)

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth (bcrypt, reset tokens); client cooldown is UX only; set min password length; PT-BR generic login error |
| V3 Session Management | yes | supabase-js refresh tokens; `AppState`-driven auto-refresh; sign-out clears cache |
| V4 Access Control | yes | RLS per `owner_id` via `private.is_property_owner`; column-level grants (alerts: `status` only; properties: `name,city,state`; producers: `full_name,onboarding_completed_at`); client cannot insert `is_demo = true` rows |
| V5 Input Validation | yes | Ported sanitize/validate (strip control chars, length caps, e-mail pattern); DB `check` constraints on text lengths |
| V6 Cryptography | yes | Never hand-roll; Supabase handles hashing/JWT; no service-role key in app |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-tenant read via missing/loose RLS | Information disclosure | RLS on every table in the same migration; two-account test |
| RPC abuse of definer function (clone/overwrite for another uid) | Elevation / Tampering | `private` schema, `revoke` from public/anon/authenticated; only `ensure_demo_farm()` exposed, uses `auth.uid()` |
| Mutating `is_demo` / other columns from client | Tampering | Column-level `grant update (...)`, policy `with check (is_demo = false)` |
| Account enumeration via reset | Information disclosure | Always-generic reset message; generic login error |
| Open redirect via `redirectTo` | Spoofing | Supabase redirect allow-list (exact app scheme/host, no `*` in prod) |
| Secrets in repo/bundle | Information disclosure | Only anon/publishable key in `EXPO_PUBLIC_*`; `.env` git-ignored; never service role (CYBERSECURITY.md) |
| Signup trigger DoS/blocking | Denial of service | Exception-guarded clone; self-heal RPC |
| Brute-force login | Spoofing | Supabase server rate limits + client cooldown (UX) |

## Sources

### Primary (HIGH confidence)
- npm registry (via `npm view`, 2026-11-11): expo 58.0.24, expo-router 58.0.31, react-native 0.88.1, react 19.3.1 (template pins 19.3.0), react-native-web 0.21.4, @supabase/supabase-js 2.119.0 (engines node >=22), expo-sqlite 58.0.16, lucide-react-native 1.72.0, @expo-google-fonts/inter 0.4.2, jest-expo 58.0.14, @testing-library/react-native 14.1.0, nativewind 4.2.7 (+ rc 5.0.0-rc.1)
- Local experiments (scratchpad, 2026-11-11): `create-expo-app` templates; `expo export --platform web` for (a) default+supabase+sqlite+lucide+inter, (b) NativeWind 4.2.7 probe, (c) minimal Router+js-tabs custom tabBar+tsc+expo-doctor; `jest-expo` run; auth-js source (`flowType: 'implicit'`); expo-router type definitions (`js-tabs`, `Stack.Protected`, `tabBar`); expo-linking `createURL.web`
- PGlite 0.5.16 dry-run of Appendix A SQL
- https://docs.expo.dev/guides/using-supabase/ — sqlite storage, AppState, `detectSessionInUrl: false` on native, confirm-email note
- https://docs.expo.dev/router/reference/authentication/ — `Stack.Protected`, splash gating, no server redirects on web
- https://docs.expo.dev/router/advanced/tabs/ — JS tabs bundled with Router from SDK 56
- https://supabase.com/docs/guides/auth/native-mobile-deep-linking — scheme + redirect URL, `setSession` from URL tokens, `Linking.useLinkingURL`
- https://supabase.com/docs/guides/auth/passwords — reset flow, `updateUser`, enumeration, 2 e-mails/hour default
- https://supabase.com/docs/guides/auth/redirect-urls — wildcard rules
- https://supabase.com/docs/guides/auth/managing-user-data — trigger pattern + failure warning
- https://supabase.com/docs/guides/database/postgres/row-level-security — `(select auth.uid())`, `TO`, definer helpers, exposed-schema warning
- https://www.nativewind.dev/docs/getting-started/installation — v4.2.7 / Tailwind 3 / SDK 57

### Secondary (MEDIUM)
- NativeWind v5 install guide (found via search; targets SDK 54; preview)

### Tertiary (LOW)
- None relied upon.

## Metadata

**Confidence breakdown:**
- Standard stack / scaffold: HIGH — installed, type-checked, exported, doctored in this session
- Architecture (router, tabs, auth guard): HIGH for APIs (type definitions inspected), MEDIUM for runtime on native
- Deep-link password reset on native: MEDIUM — web path reasoned from library source; native not run
- SQL / RLS / clone: HIGH on logic (dry-run), MEDIUM on Supabase-specific grants (A7)
- NativeWind recommendation: HIGH (decision is about risk and architecture, backed by probe + registry data)
- Pitfalls: MEDIUM-HIGH

**Research date:** 2026-11-11
**Valid until:** ~2026-12-09 (Expo SDK 58 patch releases and NativeWind v5 stability can shift; re-check `npm view nativewind dist-tags` before reconsidering)

---

## Appendix A: SQL migrations (dry-run verified on Postgres via PGlite)

Use as `supabase/migrations/001_schema.sql`, `002_rls.sql`, `003_demo_farm.sql`. Order matters (`002` creates the `private` schema used by `003`). Dry-run results: per new account -> 1 property, 3 areas, 6 sensors, ~4,274 readings, 7 alerts (resolved heat wave, resolved earlier dry spell, resolved humidity episodes x2, open critical soil-moisture alert on the Horta sensor, open sensor-offline alert, open heavy-rain alert), 4 risk analyses (drought alto, heat baixo, humidity baixo, unfavorable weather moderado), 1 climate snapshot. Alert severity/status are computed from the same readings and thresholds (ALRT-06). The offline sensor stops reporting 52 h before signup. Tunables: threshold defaults (temp 10-32 C, air humidity 30-85 %, soil 25-80 %), `'Minha Propriedade'` provisional name (D-04), city Ibiúna/SP.

### 001_schema.sql
```sql
-- AgroAlerta 001: enums + tables
create type public.sensor_type as enum ('temperature', 'air_humidity', 'soil_moisture');
create type public.alert_category as enum ('temperature_high','soil_moisture_low','air_humidity_high','heavy_rain','unfavorable_weather','sensor_offline');
create type public.alert_severity as enum ('info', 'warning', 'critical');
create type public.alert_status as enum ('novo', 'visualizado', 'resolvido');
create type public.risk_type as enum ('drought', 'excessive_heat', 'high_humidity', 'unfavorable_weather');
create type public.risk_level as enum ('baixo', 'moderado', 'alto');

create table public.producers (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 120),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.producers (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  city text,
  state char(2),
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index properties_owner_idx on public.properties (owner_id);
create unique index properties_one_demo_per_owner on public.properties (owner_id) where is_demo;

create table public.planting_areas (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  crop text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index planting_areas_property_idx on public.planting_areas (property_id);

create table public.sensors (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  area_id uuid references public.planting_areas (id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  type public.sensor_type not null,
  unit text not null,
  last_seen_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index sensors_property_idx on public.sensors (property_id);

create table public.readings (
  id bigint generated always as identity primary key,
  sensor_id uuid not null references public.sensors (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  recorded_at timestamptz not null,
  value numeric(7,2) not null,
  is_demo boolean not null default false
);
create index readings_sensor_time_idx on public.readings (sensor_id, recorded_at desc);
create index readings_property_idx on public.readings (property_id);

create table public.thresholds (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  sensor_type public.sensor_type not null,
  min_value numeric(7,2),
  max_value numeric(7,2),
  unique (property_id, sensor_type)
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  sensor_id uuid references public.sensors (id) on delete set null,
  reading_id bigint references public.readings (id) on delete set null,
  category public.alert_category not null,
  severity public.alert_severity not null,
  status public.alert_status not null default 'novo',
  title text not null,
  description text not null,
  recommendation text not null,
  triggered_at timestamptz not null,
  is_demo boolean not null default false
);
create index alerts_property_status_idx on public.alerts (property_id, status, triggered_at desc);

create table public.risk_analyses (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  risk public.risk_type not null,
  level public.risk_level not null,
  indicators jsonb not null default '{}'::jsonb,
  explanation text not null,
  recommendation text not null,
  analyzed_at timestamptz not null default now(),
  is_demo boolean not null default false
);
create index risk_analyses_property_idx on public.risk_analyses (property_id, analyzed_at desc);

create table public.climate_snapshots (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  condition text not null,
  description text not null,
  temperature_c numeric(4,1),
  humidity_pct numeric(4,1),
  rain_probability_pct smallint,
  observed_at timestamptz not null default now(),
  is_demo boolean not null default false
);
create index climate_property_idx on public.climate_snapshots (property_id, observed_at desc);

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.producers (id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('ios','android')),
  created_at timestamptz not null default now()
);
```

### 002_rls.sql
```sql
-- AgroAlerta 002: RLS (per-owner)
create schema if not exists private;
grant usage on schema private to authenticated;
create or replace function private.is_property_owner(p_property uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.properties p where p.id = p_property and p.owner_id = (select auth.uid()));
$$;
revoke all on function private.is_property_owner(uuid) from public, anon;
grant execute on function private.is_property_owner(uuid) to authenticated;

alter table public.producers enable row level security;
alter table public.properties enable row level security;
alter table public.planting_areas enable row level security;
alter table public.sensors enable row level security;
alter table public.readings enable row level security;
alter table public.thresholds enable row level security;
alter table public.alerts enable row level security;
alter table public.risk_analyses enable row level security;
alter table public.climate_snapshots enable row level security;
alter table public.push_tokens enable row level security;

-- producers: own row; only full_name / onboarding editable
create policy producers_select on public.producers for select to authenticated using (id = (select auth.uid()));
create policy producers_update on public.producers for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke update on public.producers from authenticated;
grant update (full_name, onboarding_completed_at) on public.producers to authenticated;

-- properties
create policy properties_select on public.properties for select to authenticated using (owner_id = (select auth.uid()));
create policy properties_insert on public.properties for insert to authenticated with check (owner_id = (select auth.uid()) and is_demo = false);
create policy properties_update on public.properties for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy properties_delete on public.properties for delete to authenticated using (owner_id = (select auth.uid()) and is_demo = false);
revoke update on public.properties from authenticated;
grant update (name, city, state) on public.properties to authenticated;

-- planting_areas / sensors / thresholds: owner CRUD (client cannot create is_demo rows)
create policy areas_all on public.planting_areas for all to authenticated using (private.is_property_owner(property_id)) with check (private.is_property_owner(property_id) and is_demo = false);
create policy sensors_all on public.sensors for all to authenticated using (private.is_property_owner(property_id)) with check (private.is_property_owner(property_id) and is_demo = false);
create policy thresholds_all on public.thresholds for all to authenticated using (private.is_property_owner(property_id)) with check (private.is_property_owner(property_id));

-- readings / risk_analyses / climate_snapshots: read-only for the app (writes = service role / seed)
create policy readings_select on public.readings for select to authenticated using (private.is_property_owner(property_id));
create policy risk_select on public.risk_analyses for select to authenticated using (private.is_property_owner(property_id));
create policy climate_select on public.climate_snapshots for select to authenticated using (private.is_property_owner(property_id));

-- alerts: read + status change only
create policy alerts_select on public.alerts for select to authenticated using (private.is_property_owner(property_id));
create policy alerts_update on public.alerts for update to authenticated using (private.is_property_owner(property_id)) with check (private.is_property_owner(property_id));
revoke update on public.alerts from authenticated;
grant update (status) on public.alerts to authenticated;

-- push_tokens: own rows
create policy push_all on public.push_tokens for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
```

### 003_demo_farm.sql
```sql
-- AgroAlerta 003: demo farm clone + signup trigger
create or replace function private.clone_demo_farm(p_uid uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prop uuid;
  v_a1 uuid; v_a2 uuid; v_a3 uuid;
  v_s1 uuid; v_s2 uuid; v_s3 uuid; v_s4 uuid; v_s5 uuid; v_s6 uuid;
  v_end timestamptz := date_trunc('hour', now());
  v_start timestamptz := date_trunc('hour', now()) - interval '30 days';
  v_soil numeric; v_temp numeric; v_hum numeric;
  v_soil_min numeric; v_temp_max numeric; v_hum_max numeric;
  v_rain int := 80;
begin
  perform pg_advisory_xact_lock(hashtext(p_uid::text));

  select id into v_prop from public.properties where owner_id = p_uid and is_demo limit 1;
  if v_prop is not null then
    return v_prop;  -- idempotent
  end if;

  insert into public.properties (owner_id, name, city, state, is_demo)
  values (p_uid, 'Minha Propriedade', 'Ibiúna', 'SP', true) returning id into v_prop;

  insert into public.planting_areas (property_id, name, crop, is_demo) values (v_prop, 'Horta de Folhosas', 'Alface', true) returning id into v_a1;
  insert into public.planting_areas (property_id, name, crop, is_demo) values (v_prop, 'Pomar de Laranja', 'Laranja', true) returning id into v_a2;
  insert into public.planting_areas (property_id, name, crop, is_demo) values (v_prop, 'Milharal', 'Milho', true) returning id into v_a3;

  insert into public.sensors (property_id, area_id, name, type, unit, is_demo) values (v_prop, v_a1, 'Temperatura da Horta', 'temperature', '°C', true) returning id into v_s1;
  insert into public.sensors (property_id, area_id, name, type, unit, is_demo) values (v_prop, v_a1, 'Umidade do Ar da Horta', 'air_humidity', '%', true) returning id into v_s2;
  insert into public.sensors (property_id, area_id, name, type, unit, is_demo) values (v_prop, v_a1, 'Umidade do Solo da Horta', 'soil_moisture', '%', true) returning id into v_s3;
  insert into public.sensors (property_id, area_id, name, type, unit, is_demo) values (v_prop, v_a2, 'Umidade do Solo do Pomar', 'soil_moisture', '%', true) returning id into v_s4;
  insert into public.sensors (property_id, area_id, name, type, unit, is_demo) values (v_prop, v_a2, 'Temperatura do Pomar', 'temperature', '°C', true) returning id into v_s5;
  insert into public.sensors (property_id, area_id, name, type, unit, is_demo) values (v_prop, v_a2, 'Umidade do Ar do Pomar', 'air_humidity', '%', true) returning id into v_s6;

  insert into public.thresholds (property_id, sensor_type, min_value, max_value) values
    (v_prop, 'temperature', 10, 32),
    (v_prop, 'air_humidity', 30, 85),
    (v_prop, 'soil_moisture', 25, 80);

  -- ~30 days of hourly readings. h = hours since start. Sensor 5 went offline 52h ago.
  insert into public.readings (sensor_id, property_id, recorded_at, value, is_demo)
  with prof(sensor_id, kind, base, seed, stop_h) as (
    values (v_s1, 'temp', 24.0, 1.0, 0), (v_s2, 'hum', 72.0, 2.0, 0), (v_s3, 'soil_dry', 0.0, 3.0, 0),
           (v_s4, 'soil_ok', 38.0, 4.0, 0), (v_s5, 'temp', 23.0, 5.0, 52), (v_s6, 'hum', 70.0, 6.0, 0)
  ), pts as (
    select g.ts,
           extract(epoch from (g.ts - v_start)) / 3600.0 as h,
           extract(hour from (g.ts at time zone 'America/Sao_Paulo')) as hr
    from generate_series(v_start, v_end, interval '1 hour') as g(ts)
  )
  select p.sensor_id, v_prop, pts.ts,
    round((
      case p.kind
        when 'temp' then p.base + 5 * sin(2 * pi() * (pts.hr - 9) / 24.0)
                         + case when pts.h between 300 and 340 then 6 * sin(pi() * (pts.h - 300) / 40.0) else 0 end
        when 'hum' then p.base - 12 * sin(2 * pi() * (pts.hr - 9) / 24.0)
                        + case when pts.h between 560 and 600 then 14 * sin(pi() * (pts.h - 560) / 40.0) else 0 end
        when 'soil_ok' then p.base + 4 * sin(pts.h / 50.0)
        else case
               when pts.h >= 528 then 41 - 21 * ((pts.h - 528) / 192.0)
               else 41 - (case when floor(pts.h / 144) = 2 then 19 else 12 end) * ((pts.h - 144 * floor(pts.h / 144)) / 144.0)
             end
      end
      + 0.4 * sin(pts.h * 1.7 + p.seed * 3.1) + 0.3 * sin(pts.h * 0.53 + p.seed)
    )::numeric, 1), true
  from prof p cross join pts
  where pts.ts <= v_end - (p.stop_h * interval '1 hour');

  update public.sensors s
     set last_seen_at = (select max(r.recorded_at) from public.readings r where r.sensor_id = s.id)
   where s.property_id = v_prop;

  insert into public.climate_snapshots (property_id, condition, description, temperature_c, humidity_pct, rain_probability_pct, observed_at, is_demo)
  values (v_prop, 'Nublado', 'Céu nublado com possibilidade de chuva forte no fim da tarde.', 27.0, 74.0, v_rain, now(), true);

  -- Alerts derived from the SAME readings + thresholds (gaps-and-islands, >= 3 out-of-range hourly readings, gaps <= 6h merged)
  insert into public.alerts (property_id, sensor_id, reading_id, category, severity, status, title, description, recommendation, triggered_at, is_demo)
  with ordered as (
    select r.id, r.sensor_id, r.recorded_at, r.value, s.type, s.name, s.unit, th.min_value, th.max_value,
           row_number() over (partition by r.sensor_id order by r.recorded_at) as rn,
           ((s.type in ('temperature', 'air_humidity') and r.value > th.max_value)
            or (s.type = 'soil_moisture' and r.value < th.min_value)) as bad
    from public.readings r
    join public.sensors s on s.id = r.sensor_id
    join public.thresholds th on th.property_id = r.property_id and th.sensor_type = s.type
    where r.property_id = v_prop
  ), bad as (
    select x.*, sum(x.new_ep) over (partition by x.sensor_id order by x.recorded_at) as grp
    from (
      select o.*,
             case when o.recorded_at - lag(o.recorded_at) over (partition by o.sensor_id order by o.recorded_at) > interval '6 hours'
                  then 1 else 0 end as new_ep
      from ordered o where o.bad
    ) x
  ), ep as (
    select sensor_id, type, name, unit, grp,
           min(recorded_at) as started, max(recorded_at) as ended, count(*) as n,
           (array_agg(id order by recorded_at))[1] as first_reading,
           min(value) as vmin, max(value) as vmax, max(min_value) as tmin, max(max_value) as tmax
    from bad group by sensor_id, type, name, unit, grp
    having count(*) >= 3
  )
  select v_prop, e.sensor_id, e.first_reading,
    case e.type when 'temperature' then 'temperature_high' when 'soil_moisture' then 'soil_moisture_low' else 'air_humidity_high' end::public.alert_category,
    (case when (case when e.type = 'soil_moisture' then (e.tmin - e.vmin) / e.tmin else (e.vmax - e.tmax) / e.tmax end) >= 0.15
          then 'critical' else 'warning' end)::public.alert_severity,
    (case when e.ended = (select max(r.recorded_at) from public.readings r where r.sensor_id = e.sensor_id) then 'novo'
          when e.ended < v_end - interval '48 hours' then 'resolvido' else 'visualizado' end)::public.alert_status,
    case e.type when 'temperature' then 'Temperatura acima do limite'
                when 'soil_moisture' then 'Solo seco: umidade abaixo do mínimo'
                else 'Umidade do ar acima do limite' end,
    case e.type
      when 'soil_moisture' then format('%s registrou %s%s, abaixo do mínimo de %s%s.', e.name, replace(round(e.vmin, 1)::text, '.', ','), e.unit, replace(round(e.tmin, 0)::text, '.', ','), e.unit)
      else format('%s registrou %s%s, acima do limite de %s%s.', e.name, replace(round(e.vmax, 1)::text, '.', ','), e.unit, replace(round(e.tmax, 0)::text, '.', ','), e.unit)
    end,
    case e.type when 'temperature' then 'Evite trabalhos pesados nas horas mais quentes e reforce a irrigação no fim da tarde.'
                when 'soil_moisture' then 'Programe a irrigação desta área hoje, de preferência no início da manhã.'
                else 'Melhore a ventilação e observe sinais de fungo nas folhas.' end,
    e.started, true
  from ep e;

  -- Offline sensor alert (no reading for > 3h)
  insert into public.alerts (property_id, sensor_id, category, severity, status, title, description, recommendation, triggered_at, is_demo)
  select v_prop, s.id, 'sensor_offline', 'warning', 'novo', 'Sensor sem comunicação',
         format('%s não envia dados há mais de 3 horas.', s.name),
         'Verifique a bateria, o sinal e a conexão do sensor.',
         s.last_seen_at + interval '3 hours', true
  from public.sensors s where s.property_id = v_prop and s.last_seen_at < now() - interval '3 hours';

  -- Rain alert from the climate snapshot
  insert into public.alerts (property_id, category, severity, status, title, description, recommendation, triggered_at, is_demo)
  select v_prop, 'heavy_rain', 'warning', 'novo', 'Possibilidade de chuva forte',
         format('Há %s%% de chance de chuva forte nas próximas horas.', c.rain_probability_pct),
         'Adie adubação e pulverização; confira o escoamento nas áreas baixas.',
         now() - interval '30 minutes', true
  from public.climate_snapshots c where c.property_id = v_prop and c.rain_probability_pct >= 70;

  -- Risk analyses derived from latest readings + thresholds
  select value into v_soil from public.readings where sensor_id = v_s3 order by recorded_at desc limit 1;
  select value into v_temp from public.readings where sensor_id = v_s1 order by recorded_at desc limit 1;
  select value into v_hum from public.readings where sensor_id = v_s2 order by recorded_at desc limit 1;
  select min_value into v_soil_min from public.thresholds where property_id = v_prop and sensor_type = 'soil_moisture';
  select max_value into v_temp_max from public.thresholds where property_id = v_prop and sensor_type = 'temperature';
  select max_value into v_hum_max from public.thresholds where property_id = v_prop and sensor_type = 'air_humidity';

  insert into public.risk_analyses (property_id, risk, level, indicators, explanation, recommendation, is_demo) values
    (v_prop, 'drought',
      (case when v_soil < v_soil_min then 'alto' when v_soil < v_soil_min + 5 then 'moderado' else 'baixo' end)::public.risk_level,
      jsonb_build_object('umidade_solo_pct', v_soil, 'limite_minimo_pct', v_soil_min),
      'A umidade do solo da horta está abaixo do mínimo configurado. Análise demonstrativa baseada em regras.',
      'Programe irrigação para as próximas horas.', true),
    (v_prop, 'excessive_heat',
      (case when v_temp > v_temp_max then 'alto' when v_temp > v_temp_max - 3 then 'moderado' else 'baixo' end)::public.risk_level,
      jsonb_build_object('temperatura_c', v_temp, 'limite_maximo_c', v_temp_max),
      'A temperatura atual está dentro do limite. Análise demonstrativa baseada em regras.',
      'Sem ação necessária agora.', true),
    (v_prop, 'high_humidity',
      (case when v_hum > v_hum_max then 'alto' when v_hum > v_hum_max - 5 then 'moderado' else 'baixo' end)::public.risk_level,
      jsonb_build_object('umidade_ar_pct', v_hum, 'limite_maximo_pct', v_hum_max),
      'A umidade do ar está dentro do limite. Análise demonstrativa baseada em regras.',
      'Mantenha a ventilação da horta.', true),
    (v_prop, 'unfavorable_weather',
      (case when v_rain >= 90 then 'alto' when v_rain >= 70 then 'moderado' else 'baixo' end)::public.risk_level,
      jsonb_build_object('chance_chuva_pct', v_rain),
      'Há chance de chuva forte. Análise demonstrativa baseada em regras.',
      'Adie pulverização e adubação.', true);

  return v_prop;
end;
$$;
revoke all on function private.clone_demo_farm(uuid) from public, anon, authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.producers (id, full_name)
  values (new.id, left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1), 'Produtor'), 120))
  on conflict (id) do nothing;

  begin
    perform private.clone_demo_farm(new.id);
  exception when others then
    raise warning 'clone_demo_farm failed for %: %', new.id, sqlerrm;  -- never block signup
  end;
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Self-heal for users whose trigger clone failed (called by the app when no property is found)
create or replace function public.ensure_demo_farm()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  insert into public.producers (id, full_name)
  select u.id, left(coalesce(nullif(trim(u.raw_user_meta_data ->> 'name'), ''), split_part(u.email, '@', 1), 'Produtor'), 120)
  from auth.users u where u.id = v_uid
  on conflict (id) do nothing;
  return private.clone_demo_farm(v_uid);
end;
$$;
revoke all on function public.ensure_demo_farm() from public, anon;
grant execute on function public.ensure_demo_farm() to authenticated;
```
