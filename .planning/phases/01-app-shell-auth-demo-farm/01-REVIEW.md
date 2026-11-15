---
phase: 01-app-shell-auth-demo-farm
reviewed: 2026-11-12T00:00:00Z
depth: standard
files_reviewed: 75
files_reviewed_list:
  - .gitignore
  - app.json
  - eslint.config.js
  - metro.config.js
  - package.json
  - scripts/check-ui-rules.mjs
  - src/app/(app)/(tabs)/_layout.tsx
  - src/app/(app)/(tabs)/alertas.tsx
  - src/app/(app)/(tabs)/analises.tsx
  - src/app/(app)/(tabs)/index.tsx
  - src/app/(app)/(tabs)/monitoramento.tsx
  - src/app/(app)/(tabs)/perfil.tsx
  - src/app/(app)/_layout.tsx
  - src/app/(auth)/_layout.tsx
  - src/app/(auth)/index.tsx
  - src/app/_layout.tsx
  - src/app/reset-password.tsx
  - src/components/brand/Logo.tsx
  - src/components/layout/AppColumn.tsx
  - src/components/layout/DatabaseGate.tsx
  - src/components/layout/ScreenContainer.tsx
  - src/components/layout/ScreenHeader.tsx
  - src/components/layout/TabBar.tsx
  - src/components/ui/AsyncBoundary.tsx
  - src/components/ui/Badge.tsx
  - src/components/ui/Button.tsx
  - src/components/ui/Card.tsx
  - src/components/ui/Chip.tsx
  - src/components/ui/DatabaseUnavailable.tsx
  - src/components/ui/EmptyState.tsx
  - src/components/ui/ErrorBoundary.tsx
  - src/components/ui/ErrorState.tsx
  - src/components/ui/Input.tsx
  - src/components/ui/ListRow.tsx
  - src/components/ui/LoadingState.tsx
  - src/components/ui/MetricTile.tsx
  - src/components/ui/Modal.tsx
  - src/components/ui/Notice.tsx
  - src/components/ui/SectionHeader.tsx
  - src/components/ui/Select.tsx
  - src/components/ui/Tabs.tsx
  - src/components/ui/Text.tsx
  - src/components/ui/Textarea.tsx
  - src/features/auth/AuthProvider.tsx
  - src/features/auth/authErrors.test.ts
  - src/features/auth/authErrors.ts
  - src/features/auth/authLinks.test.ts
  - src/features/auth/authLinks.ts
  - src/features/auth/loginCooldown.test.ts
  - src/features/auth/loginCooldown.ts
  - src/features/auth/useLoginRateLimit.ts
  - src/features/theme/ThemeProvider.tsx
  - src/hooks/useCurrentProperty.ts
  - src/hooks/useHomeSummary.ts
  - src/hooks/useProducer.ts
  - src/lib/format.test.ts
  - src/lib/format.ts
  - src/lib/queryClient.ts
  - src/lib/security/limits.ts
  - src/lib/security/sanitize.ts
  - src/lib/security/security.test.ts
  - src/lib/security/validate.ts
  - src/lib/supabase.ts
  - src/services/ServiceError.ts
  - src/services/producers.ts
  - src/services/properties.ts
  - src/services/services.test.ts
  - src/theme/fonts.ts
  - src/theme/tokens.test.ts
  - src/theme/tokens.ts
  - src/types/database.ts
  - supabase/migrations/001_schema.sql
  - supabase/migrations/002_rls.sql
  - supabase/migrations/003_demo_farm.sql
  - tsconfig.json
findings:
  critical: 3
  warning: 12
  info: 9
  total: 24
status: issues_found
fix_status: fixed_except_no_change_needed
fixed_at: 2026-11-12
---

# Phase 01: Code Review Report

**Reviewed:** 2026-11-12T00:00:00Z
**Depth:** standard
**Files Reviewed:** 75 (`.env.example` skipped: deleted in working tree; `.env` and `Projeto_entrega-main/` deliberately not opened)
**Status:** issues_found

## Summary

Phase 01 covers the Expo Router shell, Supabase auth (login, signup, password recovery), the database availability gate, the service layer, and the schema/RLS/demo-farm migrations. The RLS model is mostly sound: per-owner policies, column-level UPDATE grants, `security definer` functions with `search_path = ''`, and EXECUTE revoked from `anon`.

The main risks are in session handling and app startup:

1. On native, the splash screen never hides when the database gate fails. An offline launch leaves the user on the splash screen with no way forward.
2. Password recovery uses the implicit flow. Any crafted deep link or URL fragment can plant an attacker-chosen session (login CSRF).
3. Logout only clears React state. If the server sign-out call fails (for example offline), the persisted session stays in storage and comes back.

Several RLS and integrity gaps will block or weaken the Phase 3 CRUD work. These include demo areas/sensors that cannot be updated, a client-writable `is_demo`, and cross-tenant foreign keys.

## Fix Outcomes (2026-11-12)

| Finding | Outcome | Commit |
|---------|---------|--------|
| CR-01 | fixed | d2169b7 |
| CR-02 | fixed (PKCE) | 0cc9b05 |
| CR-03 | fixed | 4d167b8 |
| WR-01 | fixed | 8263caa |
| WR-02 | fixed | fcf19f4 |
| WR-03 | fixed | 35e92f4 |
| WR-04 | fixed | 8dd0bda |
| WR-05 | fixed | fa6dbbd |
| WR-06 | fixed (migration 004, run manually) | f9aea54 |
| WR-07 | fixed (migration 004, run manually) | b5bdd14 |
| WR-08 | fixed | a21b0dc |
| WR-09 | fixed (working tree restored to HEAD) | - |
| WR-10 | no_change_needed (user decision D-10) | - |
| WR-11 | fixed (migration 004, run manually) | 01fa228 |
| WR-12 | fixed | c4a1e26 |
| IN-01..IN-09 | skipped (Info, out of scope) | - |

Manual steps: run `supabase/migrations/004_review_fixes.sql` in the Supabase SQL editor; allowlist the reset-password redirect URLs (PKCE `?code=`) in Supabase Auth > URL Configuration.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: Splash screen never hides when DatabaseGate shows loading/unavailable or ErrorBoundary trips (native)

**Outcome:** fixed (d2169b7): splash hides in RootLayout once fonts load; Navigator renders LoadingState while auth loads; ErrorBoundary.componentDidCatch also hides the splash.

**File:** `src/app/_layout.tsx:15,22-26` (with `src/components/layout/DatabaseGate.tsx:40-58`)
**Issue:** `SplashScreen.preventAutoHideAsync()` runs at module scope, and `SplashScreen.hide()` is only called from `Navigator`. `Navigator` only mounts when `DatabaseGate` reaches `status === 'ok'`. When Supabase is unreachable (rural/offline launch), the env is missing, or `ErrorBoundary` catches a render error above `Navigator`, the gate renders `DatabaseUnavailable` with a retry button. That screen sits under a splash that is never dismissed. On iOS/Android the app looks frozen on the logo forever and the retry UI cannot be reached. The 8 s "Conectando ao servidor…" state is also hidden behind the splash. (Web is unaffected because the splash is a no-op there.)
**Fix:** Hide the splash as soon as the first real UI is ready, not only when the navigator is ready. For example, move the font gate and hide call to `RootLayout` and hide once fonts are loaded:
```tsx
export default function RootLayout() {
  const fontsReady = useAppFonts();
  useEffect(() => { if (fontsReady) SplashScreen.hide(); }, [fontsReady]);
  if (!fontsReady) return null;
  return (/* providers + DatabaseGate + ... */);
}
// Navigator keeps `if (loading) return <LoadingState/>` instead of null.
```
Also call `SplashScreen.hide()` from `ErrorBoundary.componentDidCatch` as a safety net.

### CR-02: Recovery/implicit flow accepts attacker-supplied tokens (login CSRF / session injection)

**Outcome:** fixed (0cc9b05): client uses `flowType: 'pkce'` and `detectSessionInUrl: false` on all platforms; reset-password exchanges `?code=` via `exchangeCodeForSession` (native + web); fragment tokens are ignored; authLinks parses/validates the query `code` (tests updated). Requires PKCE redirect URLs allowlisted in Supabase Auth.

**File:** `src/app/reset-password.tsx:44-68`, `src/lib/supabase.ts:25-32`, `src/features/auth/authLinks.ts:30-41`
**Issue:** The client uses the default implicit flow. On native, any `agroalerta://reset-password#type=recovery&access_token=X&refresh_token=Y` link calls `supabase.auth.setSession(tokens)` with no proof that this device requested the reset. Such a link can be opened by any website, QR code, or app. On web, `detectSessionInUrl: true` does the same for any URL fragment. An attacker can mint tokens for their own account and send the link to a victim. The victim's current session is then silently replaced by the attacker's. Everything the victim enters afterwards goes into the attacker's account: Phase 3 properties and planting areas, and push tokens in `push_tokens`. The `type === 'recovery'` check does not help, because the attacker controls the whole fragment.
**Fix:** Switch to PKCE so the reset can only be completed on the device that started it. The code verifier lives in local storage, so a code minted elsewhere fails:
```ts
createClient(url, key, { auth: { flowType: 'pkce', storage: localStorage, detectSessionInUrl: false, ... } });
// reset-password.tsx: read `code` from the URL and call
await supabase.auth.exchangeCodeForSession(code);
```
Keep the `error`/`error_code` handling. Remove the `setSession`-from-fragment path, and update the email template / redirect handling for PKCE (`?code=`).

### CR-03: Sign-out leaves the persisted session in storage when the server call fails

**Outcome:** fixed (4d167b8): on server sign-out error or exception, `signOut({ scope: 'local' })` drops the persisted session before clearing state.

**File:** `src/features/auth/AuthProvider.tsx:131-139`
**Issue:** `supabase.auth.signOut()` (default `scope: 'global'`) returns `{ error }` **without removing the local session** when the revoke request fails for reasons other than 401/403/404. Network errors (`AuthRetryableFetchError`) are one such case. The provider ignores that error and calls `setSession(null)`, so the UI shows the login screen while the tokens remain in `localStorage`/expo-sqlite. On the next launch `getSession()` restores the user. Within the same run, the still-active auto-refresh can fire `TOKEN_REFRESHED`, and `onAuthStateChange` then puts the user back into the app. On a shared farm phone, "Sair da conta" offline does not actually log out.
**Fix:**
```ts
const signOut = useCallback(async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) await supabase.auth.signOut({ scope: 'local' }); // always drop local tokens
  } catch {
    await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
  }
  setSession(null);
}, []);
```

## Warnings

### WR-01: Reset-password form is shown for any existing session, not only a recovery session

**Outcome:** fixed (8263caa): the form only shows after a successful code exchange in this screen visit; the "session present means ready" effect was removed.

**File:** `src/app/reset-password.tsx:71-75`
**Issue:** `phase` becomes `'ready'` whenever `session` is non-null. A signed-in user who opens `/reset-password` (web URL or deep link without tokens) gets a "set new password" form with no current-password check. If a recovery link arrives while user A is already signed in, the form becomes `ready` with A's session before `setSession` resolves, so a quick submit changes A's password. This weakens the shared-device threat model.
**Fix:** Gate `ready` on a recovery event: listen for `PASSWORD_RECOVERY` in `onAuthStateChange`, or for a successful code exchange (see CR-02). Ignore pre-existing sessions. Enable "Secure password change" in Supabase Auth as defense in depth.

### WR-02: `requestNewLink` navigates before the auth guard re-renders

**Outcome:** fixed (fcf19f4): `requestNewLink` sets a pending flag and navigates from an effect once `session` is null.

**File:** `src/app/reset-password.tsx:142-145`
**Issue:** `await signOut()` calls `setSession(null)`, and `router.replace('/?mode=forgot')` runs before React commits that update. `Stack.Protected` still has `(app)` enabled and `(auth)` disabled, so `/` resolves to the tabs index or gets redirected. The `mode=forgot` param is then lost, and the user may land back on the login tab or in the app shell.
**Fix:** Navigate from an effect after `session` becomes null (e.g. set a `pendingForgot` flag and `useEffect(() => { if (pendingForgot && !session) router.replace(...) }, [session])`). Alternatively, make the forgot panel reachable through a route that sits outside both protected groups.

### WR-03: React Query keys are not scoped to the user; isolation relies on a post-commit `clear()`

**Outcome:** fixed (35e92f4): query keys include the user id and queries are `enabled: !!userId`; `clear()` kept as safeguard.

**File:** `src/hooks/useProducer.ts:6`, `src/hooks/useHomeSummary.ts:6`, `src/hooks/useCurrentProperty.ts:6`, `src/features/auth/AuthProvider.tsx:85-90`
**Issue:** Keys are global (`['producer']`, `['home-summary']`, `['property','current']`). Cache isolation depends on `queryClient.clear()` in a parent `useEffect`. That effect runs after mounted children have already rendered from cache. If the user changes without the tree unmounting, for example a session swap via the recovery link while `(app)` stays mounted under `reset-password`, or a token change from another browser tab, the previous user's data can be rendered. Observers attached to the removed queries also keep stale results until they re-render.
**Fix:** Include the user id in every key (`['producer', userId]`) and set `enabled: !!userId`. Keep `clear()` as an extra safeguard.

### WR-04: Signup with email confirmation enabled shows a developer/admin instruction to end users

**Outcome:** fixed (8dd0bda): signup without session returns a success notice "Enviamos um e-mail para confirmar sua conta. Abra o link para entrar." and switches to the Entrar tab; developer hint via `console.warn` only.

**File:** `src/features/auth/AuthProvider.tsx:117-121`
**Issue:** When `data.session` is null, the account has already been created (or Supabase returned an obfuscated existing user). The farmer is told to "Desative 'Confirm email' no Supabase", which is server-configuration text they cannot act on. The flow then stays stuck, with no "check your e-mail" path.
**Fix:** Show a user-facing message ("Enviamos um e-mail de confirmação…") and switch to the `sent`-style panel. Log the misconfiguration only in `__DEV__`.

### WR-05: Login cooldown disables the e-mail field in the "Esqueci minha senha" panel

**Outcome:** fixed (fa6dbbd): e-mail field uses `editable={panel === 'tabs' ? !disabled : !submitting}`.

**File:** `src/app/(auth)/index.tsx:100,190`
**Issue:** The shared `emailField` uses `editable={!disabled}`, and `disabled` includes `isCooldown`. After 5 failed logins, the moment the user is most likely to want recovery, the forgot-password e-mail input is read-only for 30 s.
**Fix:** Use `editable={panel === 'tabs' ? !disabled : !submitting}`.

### WR-06: Demo planting areas/sensors cannot be updated, and `is_demo` is client-writable

**Outcome:** fixed (f9aea54): new `supabase/migrations/004_review_fixes.sql` (001-003 untouched, already applied) splits areas/sensors policies per command (`is_demo = false` only on INSERT) and restricts UPDATE to `(name, crop)` / `(name, area_id)` via column grants, so `is_demo` and `property_id` are immutable for clients. `setup_completo.sql` regenerated. Must be run manually in the SQL editor on existing projects.

**File:** `supabase/migrations/002_rls.sql:40-41`
**Issue:** The `for all` policies apply `with check (... and is_demo = false)` to UPDATE as well. Updating any seeded row (which has `is_demo = true`) fails RLS unless the client also sets `is_demo = false`. Because there is no column-level UPDATE restriction on these tables, the client is able to do exactly that and strip the mandatory demo label. Either way, "CRUD planting areas" on the demo farm is broken or loses demo labelling. `property_id` is also freely updatable.
**Fix:** Split into per-command policies and restrict columns:
```sql
create policy areas_update on public.planting_areas for update to authenticated
  using (private.is_property_owner(property_id)) with check (private.is_property_owner(property_id));
revoke update on public.planting_areas from authenticated;
grant update (name, crop) on public.planting_areas to authenticated;
-- same for sensors (name, area_id)
```
Keep the `is_demo = false` check only on INSERT.

### WR-07: Cross-tenant foreign keys (`sensors.area_id`) are not ownership-checked

**Outcome:** fixed (b5bdd14): 004 adds a BEFORE INSERT/UPDATE trigger (`private.sensors_area_same_property`, security definer) rejecting an `area_id` outside the sensor's property; runs before the FK so it is not an existence oracle.

**File:** `supabase/migrations/001_schema.sql:44`, `supabase/migrations/002_rls.sql:41`
**Issue:** FK checks bypass RLS. A user can insert or update a sensor whose `area_id` points to another owner's planting area. The policy checks only `property_id`. This creates cross-tenant references, and `on delete set null` lets the other owner's delete mutate this user's rows. The FK also acts as an existence oracle for foreign UUIDs.
**Fix:** Add a composite FK `(area_id, property_id) references planting_areas (id, property_id)` (requires a unique constraint on `planting_areas(id, property_id)`), or add `and (area_id is null or exists (select 1 from public.planting_areas a where a.id = area_id and a.property_id = sensors.property_id))` to the sensor policy check.

### WR-08: Metro `blockList` regex does not match Windows paths

**Outcome:** fixed (a21b0dc): `/[\\/]Projeto_entrega-main[\\/].*/`.

**File:** `metro.config.js:7`
**Issue:** `/[\/]Projeto_entrega-main[\/].*/` matches only `/`, because `\/` inside a class is a forward slash. Metro tests absolute paths, which on Windows (this dev machine) use `\`. The reference project, including its own `node_modules`, is therefore still crawled. That can cause duplicate-module/haste collisions and slow bundling.
**Fix:** `const blocked = /[\\/]Projeto_entrega-main[\\/].*/;`

### WR-09: `.env.example` is now gitignored and deleted

**Outcome:** fixed (no commit needed): HEAD already tracks `.env.example` (empty `EXPO_PUBLIC_SUPABASE_URL=` / `EXPO_PUBLIC_SUPABASE_ANON_KEY=`) and a `.gitignore` without that line; the uncommitted working-tree deletion and `.gitignore` edit were reverted with `git checkout --`. `.env` stays ignored.

**File:** `.gitignore:34`
**Issue:** The committed template (empty placeholders, no secrets) is deleted in the working tree, and `.gitignore` now ignores it. The next commit removes the only documentation of the required `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Meanwhile `DatabaseGate` and the auth screen tell users to "configure o arquivo .env".
**Fix:** Remove `.env.example` from `.gitignore` and restore the placeholder file. `.env` and `.env*.local` remain ignored.

### WR-10: Home screen shows demo farm data without a demo label

**Outcome:** no_change_needed: user decision D-10 (01-CONTEXT.md) keeps the "Dados demonstrativos" badge only in Perfil for now; FND-09 stays pending user clarification.

**File:** `src/app/(app)/(tabs)/index.tsx:51-63`, `src/components/ui/Badge.tsx:9-10`
**Issue:** CLAUDE.md requires demo labelling ("demo labeling is mandatory"). `summary.isDemo` is fetched but never rendered. The first screen shows sensor and alert counts from seeded data with no "Dados demonstrativos" badge, and the label appears only on Perfil (`DEMO_LABEL_SCOPE = 'perfil-only'`). Perfil, in turn, shows the badge unconditionally even for non-demo properties.
**Fix:** Render `<DemoBadge />` in the Home property card when `summary.isDemo`. On Perfil, drive the badge from the property's `is_demo`.

### WR-11: Seeded risk-analysis text is static while the level is computed, so they can contradict

**Outcome:** fixed (01fa228): 004 adds `private.demo_risk_text(risk, level)`, recreates `private.clone_demo_farm` to pick explanation/recommendation from the computed level, and updates existing demo `risk_analyses` rows.

**File:** `supabase/migrations/003_demo_farm.sql:159-168`
**Issue:** `excessive_heat` and `high_humidity` compute `level` from the latest reading, which depends on the hour the user signed up (sin over local hour). The explanation and recommendation, however, are fixed: "dentro do limite" / "Sem ação necessária agora." Signing up in the afternoon can yield `moderado` heat (temp > 29 °C) alongside "Sem ação necessária". The same applies to humidity above 80 % at night. That contradicts the core value of clear "what to do next" guidance.
**Fix:** Pick the explanation and recommendation with the same `case` used for `level`, or compute the level once into a variable and branch on it.

### WR-12: Health check treats 401/403 as "available", so a wrong key passes the gate

**Outcome:** fixed (c4a1e26): health check probes `GET /auth/v1/settings` with `apikey`; 401/403 map to `invalid_config` and DatabaseGate shows "Configuração inválida".

**File:** `src/lib/supabase.ts:70-77`
**Issue:** With an invalid or revoked anon key, `/rest/v1/` returns 401, the gate reports `available: true`, and every later request fails. The user sees a generic "Sem conexão" error instead of the configuration screen.
**Fix:** Probe a cheap endpoint whose response distinguishes key validity, e.g. `GET /auth/v1/settings` with `apikey` (200 when the key is valid). Map 401 to `missing_config`/`invalid_config`.

## Info

### IN-01: Greeting name comes from auth metadata, profile name from `producers`

**Outcome:** skipped (Info, out of fix scope).

**File:** `src/app/(app)/(tabs)/index.tsx:45`
**Issue:** Home uses `user.user_metadata.name`, while Perfil uses `producers.full_name`. Once the name becomes editable (onboarding/settings), the two will diverge.
**Fix:** Use `useProducer()` on Home as well.

### IN-02: Dead code for the tab badge and the unused export

**Outcome:** skipped (Info, out of fix scope).

**File:** `src/components/layout/TabBar.tsx:77-79`, `src/components/ui/Badge.tsx:10`
**Issue:** `_badge` is read and then `void`-ed. `DEMO_LABEL_SCOPE` is exported and never used.
**Fix:** Remove both until Phase 4 needs them.

### IN-03: `MetricTile` accepts an `icon` prop that is never used

**Outcome:** skipped (Info, out of fix scope).

**File:** `src/components/ui/MetricTile.tsx:22,26`
**Fix:** Render it or drop it from the props type.

### IN-04: Signup field-error routing depends on substring matching of PT-BR messages

**Outcome:** skipped (Info, out of fix scope).

**File:** `src/app/(auth)/index.tsx:135-137`
**Issue:** `v.error.includes('nome')` and similar checks break silently if the copy changes.
**Fix:** Return a `field: 'name' | 'email' | 'password'` from `validateSignup`.

### IN-05: "Nome muito longo" branch is unreachable from the UI

**Outcome:** skipped (Info, out of fix scope).

**File:** `src/lib/security/validate.ts:33-35`, `src/app/(auth)/index.tsx:267`
**Issue:** The input already truncates to `NAME_MAX`, so the `NAME_MAX + 1` check never fires from the UI. Harmless, but the dual truncation is confusing.

### IN-06: Test and lint tooling listed under `dependencies`

**Outcome:** skipped (Info, out of fix scope).

**File:** `package.json:9-10,19-20`
**Issue:** `@types/jest`, `eslint-config-expo`, `jest`, and `jest-expo` belong in `devDependencies`.

### IN-07: UI-rule gate only detects 6-digit hex colors

**Outcome:** skipped (Info, out of fix scope).

**File:** `scripts/check-ui-rules.mjs:19`
**Issue:** `#FFF` and `#RRGGBBAA` slip through.
**Fix:** `/#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/`.

### IN-08: Duplicate cache clearing on logout

**Outcome:** skipped (Info, out of fix scope).

**File:** `src/app/(app)/(tabs)/perfil.tsx:54`
**Issue:** `AuthProvider` already clears the cache on user change. The extra `queryClient.clear()` here also runs after the screen may have unmounted.
**Fix:** Remove it, or move all cache clearing into `signOut`.

### IN-09: `resetPassword` hides configuration errors, and the splash promise is unhandled

**Outcome:** skipped (Info, out of fix scope).

**File:** `src/features/auth/AuthProvider.tsx:147-154`, `src/app/_layout.tsx:15`
**Issue:** A non-allowlisted `redirectTo` or SMTP failure is reported as "e-mail enviado", which is intended for anti-enumeration but leaves no dev signal. `SplashScreen.preventAutoHideAsync()` returns a promise that is never handled.
**Fix:** Add `if (__DEV__ && error) console.warn(error.code)` and use `void SplashScreen.preventAutoHideAsync().catch(() => {})`.

---

_Reviewed: 2026-11-12T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
