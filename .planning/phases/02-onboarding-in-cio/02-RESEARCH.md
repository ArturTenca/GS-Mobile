# Phase 2: Onboarding & Início - Research

**Researched:** 2026-11-12
**Domain:** Expo Router 58 guards/stack routes, Supabase/PostgREST read patterns under RLS, pure domain logic (condition, demo time anchor), RN/RNW refresh and PT-BR formatting
**Confidence:** HIGH (codebase + installed expo-router/RNW source read directly; Supabase view/grant behavior cited from official docs/changelog). MEDIUM on two items flagged in Assumptions.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** **Crítico** = there is at least one alert with `severity = 'critical'` and status `novo` or `visualizado` (not `resolvido`). Readings alone never make it Crítico.
- **D-02:** **Atenção** (when not Crítico) = ANY of: an unresolved alert with `severity = 'warning'` **or `'info'`** (user chose: info alerts also count); a sensor's latest reading outside the property's configured threshold range (`thresholds.min_value`/`max_value` for that `sensor_type`); a sensor offline.
- **D-03:** **Normal** = none of the above.
- **D-04:** `visualizado` alerts keep counting until `resolvido` (seeing an alert does not fix the problem). Status changes themselves arrive in Phase 4; Phase 2 only reads status.
- **D-05:** **Offline** = sensor's latest reading (or `last_seen_at`) older than **2 hours** relative to "now" (after the demo time anchoring in D-08). Single constant, e.g. `SENSOR_OFFLINE_AFTER_MS = 2h`, shared with Phase 3.
- **D-06:** Explanation on Início = **main reason + action**: the most severe reason first (critical alert → warning/info alert → out-of-range reading → offline sensor), shown as short PT-BR line + the preventive recommendation (use the alert's `recommendation` when the reason is an alert; a fixed short PT-BR action for out-of-range / offline). If more reasons exist, append "+N outros pontos de atenção". Example: "Crítico — Umidade do solo baixa na Horta de Folhosas. Verifique a necessidade de irrigação."
- **D-07:** **Normal** copy: "Normal — Tudo certo na sua propriedade. Sensores funcionando e sem alertas pendentes." Status always shown as color + icon + text (FND-10, StatusBadge pattern).
- **D-08:** **Time-anchor the demo farm at read time** (no cron, no DB writes). For demo data (`is_demo = true` rows of the demo property), the service layer computes `offset = now − (latest demo reading recorded_at for the property)` and shifts every demo timestamp it returns (readings `recorded_at`, sensors `last_seen_at`, alerts `triggered_at`, climate `observed_at`, risk `analyzed_at`) by that offset, so the freshest reading always looks a few minutes old. Relative gaps are preserved: the Pomar temperature sensor (stopped ~52 h before the end of the seed) stays offline, the others are online. Real (non-demo) data is NEVER shifted. Implement once in the service layer (single helper, unit-tested) so Phases 3–5 reuse it; condition/offline logic runs on shifted values.

### Claude's Discretion (user deferred these to Claude)
- **Onboarding flow (ONB-01/02):** shown when `producers.onboarding_completed_at` is null, right after signup, before the tabs (route guard similar to the auth guard). Not skippable. Short: 1–2 steps on one screen (property name + city + UF select; first planting area name + crop). Values **rename/update the existing cloned demo property** (`properties.name/city/state`, columns already grantable) and **create the first planting area as a new, non-demo area** in that property (`is_demo = false`, allowed by RLS). Demo areas/sensors stay as-is (demo data stays linked — ONB-02). On finish set `onboarding_completed_at = now()` and land on Início. Prefill: property name "Minha Propriedade" placeholder, empty city. Existing accounts with null `onboarding_completed_at` also see it once.
- **Início layout (HOME-01..08)** top-to-bottom: greeting (Olá, {primeiro nome}) + property name/city → **hero "Condição da propriedade" card** (large status, reason + action, "Atualizado há X min") → climate snapshot card (condition + short description, temp/humidity/rain chance from `climate_snapshots`) → indicators: three MetricTiles (temperatura, umidade do ar, umidade do solo — latest value with normal/abnormal mark vs thresholds; when multiple sensors of a type, show the most critical / out-of-range one, else the property average — planner/UI-SPEC pick and document) + "6 sensores ativos" + "Ver monitoramento" → recent alerts: up to 3 unresolved, most severe/recent first, each opening alert detail; "Ver todos" → Alertas tab. Pull-to-refresh refetches everything. Exact visuals → `/gsd:ui-phase 2`.
- **Alert detail (HOME-07):** minimal read-only screen (e.g. `src/app/(app)/alertas/[id].tsx`) with title, description, date/time, severity badge, recommendation, status. Marking visualizado/resolvido stays in Phase 4 (ALRT-04) — do not implement status changes here.
- **"Active sensors" count (HOME-05)** = sensors not offline per D-05; pending alerts = unresolved alerts (novo + visualizado).
- **Last update (HOME-06)** = most recent (time-anchored) reading across the property.
- Condition computed client-side in a pure, unit-tested function (e.g. `src/features/condition/deriveCondition.ts`) over data from services — easy to swap for a backend computation later.

### Deferred Ideas (OUT OF SCOPE)
- Final "Dados demonstrativos" labeling policy (still pending from Phase 1, D-10) — Início shows demo data without a badge until the user defines it.
- Real periodic demo data generation (pg_cron) — rejected in favor of read-time anchoring (D-08); could return with ESP32 ingestion.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ONB-01 | Short first-run setup (property name, city/state, first area + crop) before the tabs | §Onboarding guard (Stack.Protected + `redirectTo`), §Onboarding writes (RLS-verified sequence) |
| ONB-02 | Demo data stays linked after setup | Writes rename the demo property in place + insert one non-demo area; nothing demo is deleted or re-parented |
| HOME-01 | Greeting + property | `useCurrentProperty` + `firstName`; no new queries |
| HOME-02 | Condition Normal/Atenção/Crítico + reason | §deriveCondition design + test matrix, §latest-readings view (005) |
| HOME-03 | Climate snapshot | `climate_snapshots` latest row, shifted by demo offset (§Demo anchor) |
| HOME-04 | Temp / air humidity / soil moisture with normal-abnormal marks | `selectMetric` pure fn (UI-SPEC B4) over latest readings + thresholds |
| HOME-05 | Active sensor count + pending alert count | `deriveCondition` output (`onlineCount`, `pendingCount`) |
| HOME-06 | Last update + pull-to-refresh | `formatUpdatedAgo` (hand-rolled, no Intl), ScreenContainer `onRefresh` (native only) + "Atualizar" button |
| HOME-07 | Recent alerts, tap → detail | `AlertRow` + stack route `(app)/alerta/[id].tsx` |
| HOME-08 | Indicators section linking to Monitoramento | `SectionHeader` action / tile `onPress` → `router.navigate('/monitoramento')` |
</phase_requirements>

## Summary

Phase 2 needs **no new npm packages** (UI-SPEC already forbids them; `RefreshControl`, `KeyboardAvoidingView` are RN core). Everything is built from the installed stack (Expo SDK 58, expo-router 58.0.31, RNW 0.21.4, supabase-js 2.119, React Query 5). The risky parts are not library choice but four integration details found by reading the installed source: (1) `Stack.Protected` in SDK 58 has a `redirectTo` prop, which lets one `(app)` layout gate on `onboarding_completed_at` without touching anchors; (2) RNW's `RefreshControl` is a plain `View` wrapper that, if passed to a `ScrollView` with no `style`, breaks vertical scrolling on web, so it must be native-only; (3) a new view for "latest reading per sensor" needs an **explicit `grant select ... to authenticated`** because Supabase stopped auto-exposing new public objects (changelog 45329, 2026); (4) the seed's timestamps are hour-truncated at signup so demo anchoring must clamp shifted values to `now` and apply a small constant freshness so "Atualizado agora" is not shown forever.

Onboarding writes are all allowed by current RLS/grants (verified in 002 + 004). Retry-safety is achieved without a migration by ordering: update property → find-or-update the single non-demo area → set `onboarding_completed_at` **last**. "Latest reading per sensor" is best served by a `security_invoker` view `public.latest_readings` (lateral `limit 1` per sensor, uses the existing `readings_sensor_time_idx`) in a new manual migration `005_latest_readings.sql`; Phase 3 reuses it for the sensor list.

All condition/offline/metric/time/format logic is pure functions taking an explicit `now: number`, unit-testable with jest (already configured via `jest-expo`).

**Primary recommendation:** One composite service `getHomeOverview(propertyId)` (parallel PostgREST queries → single demo-offset → shift once → return plain data), pure `deriveCondition`/`selectMetric` in `src/features/condition/`, onboarding gate in `(app)/_layout.tsx` via two `Stack.Protected` groups with `redirectTo`, alert detail at `(app)/alerta/[id].tsx` (singular, avoids any `/alertas` prefix ambiguity), and migration 005 for the view.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Onboarding gate (who sees tabs) | Browser/Client (expo-router guard) | API/DB (RLS owns the data; flag is a column) | Navigation is client; truth is `producers.onboarding_completed_at` |
| Onboarding persistence | Database (RLS + column grants) | Client service (`src/services/onboarding.ts`) | Client may only write allowed columns; RLS enforces ownership |
| Latest reading per sensor | Database (security_invoker view) | Client service | Avoids pulling ~4k rows; filter/limit belongs next to the index |
| Demo time anchoring (D-08) | Client service layer (pure helper) | — | Decided: no DB writes/cron; applied once after fetch |
| Condition (Normal/Atenção/Crítico) | Client (pure fn in `features/condition`) | — | D-locked client-side; swappable for backend later |
| Metric tile selection, relative time, number format | Client (pure fns) | — | Presentation logic; Intl not reliable on Hermes |
| Pull-to-refresh / Atualizar | Client UI | React Query refetch | Native gesture + explicit button for web/a11y |
| Alert detail fetch | Client service → PostgREST (RLS) | — | Single row by id; not-found covers RLS denial |

## Standard Stack

### Core (all already installed — no installs this phase)
| Library | Version (package.json) | Purpose | Why Standard |
|---------|------------------------|---------|--------------|
| expo-router | ~58.0.31 | `Stack.Protected` (+`redirectTo`), dynamic route, `router.*` | Phase 1 pattern [VERIFIED: node_modules/expo-router/build/views/Protected.d.ts] |
| @tanstack/react-query | ^5.107.1 | Server cache, `setQueryData`, `invalidateQueries` | Phase 1 pattern |
| @supabase/supabase-js | ^2.119.0 | PostgREST reads/writes under RLS | Phase 1 pattern |
| react-native (RefreshControl, KeyboardAvoidingView) | 0.88.1 | Pull-to-refresh, onboarding keyboard | Core, no dep |
| lucide-react-native | ^1.72.0 | Icons listed in UI-SPEC | Already used |
| jest + jest-expo | ~30.5.2 / ~58.0.14 | Pure-logic tests | Existing config (`package.json` "jest") |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| View `latest_readings` (005) | N parallel `order+limit 1` queries per sensor | No migration, but N round trips and Phase 3 needs the view anyway. Use only as emergency fallback |
| Hand-written relative time | `Intl.RelativeTimeFormat` / date-fns | Intl.RelativeTimeFormat is not reliably present on Hermes (FormatJS table marks it unsupported); date-fns = new dep. Hand-roll (tiny, tested) |
| Client multi-step writes | `complete_onboarding` SECURITY DEFINER RPC (atomic) | Atomic + server clock, but extra migration and more surface. Client sequence is idempotent enough (see below) |

**Installation:** none.

## Package Legitimacy Audit

No external packages are installed in this phase. slopcheck not applicable.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
Sign-in -> AuthProvider(session) -> Root Stack.Protected(session) -> (app)/_layout
                                         |
                    useProducer(): { onboardingCompletedAt }  --loading--> LoadingState (no tabs rendered)
                                         |--error--> ErrorState(retry) + Sair da conta
              +--------- null ----------+---------- set ----------+
              v                                                   v
   Stack.Protected(guard=needsOnboarding)              Stack.Protected(guard=!needsOnboarding, redirectTo="/onboarding")
     onboarding.tsx                                     (tabs) , alerta/[id]
        | submit: updateProperty -> findOrUpdate/insert area -> set onboarding_completed_at
        | on success: setQueryData(['producer',uid]) + invalidate property/home  -> guard flips -> auto-redirect to tabs

Início (tabs/index) --useHomeOverview(propertyId)--> services/home.getHomeOverview
   parallel: sensors(+area name) | latest_readings view | thresholds | unresolved alerts | latest climate (guarded)
   -> offset = computeDemoOffset(max demo recorded_at, now) -> shift demo rows once (clamp <= now)
   -> returns plain data + asOf(now)
   -> deriveCondition(data, now) -> ConditionHero ; selectMetric x3 -> MetricTiles ; top3 alerts -> AlertRow
Alert tap -> router.push('/alerta/<id>') -> services/alerts.getAlert(id) (+ fetchDemoOffset) -> read-only detail
```

### Recommended Project Structure
```
src/
├── app/(app)/
│   ├── _layout.tsx            # onboarding gate (two Stack.Protected groups)
│   ├── onboarding.tsx         # S1
│   ├── alerta/[id].tsx        # S3 (stack, above tabs)
│   └── (tabs)/index.tsx       # S2
├── components/home/{ConditionHero,ClimateCard}.tsx
├── components/alerts/AlertRow.tsx
├── features/condition/{deriveCondition.ts,selectMetric.ts,reasons.ts,*.test.ts}
├── features/onboarding/{validate.ts,ufs.ts,validate.test.ts}
├── lib/{sensorStatus.ts,formatTime.ts,formatNumber.ts}  (+ tests)   # SENSOR_OFFLINE_AFTER_MS lives in sensorStatus.ts
├── hooks/{useHomeOverview.ts,useAlert.ts,useNow.ts,useCompleteOnboarding.ts}
├── services/{demoTime.ts,home.ts,alerts.ts,onboarding.ts}  (+ tests)
└── types/database.ts          # add Threshold, Reading, ClimateSnapshot, PlantingArea, extend ProducerProfile
supabase/migrations/005_latest_readings.sql  (+ append to supabase/setup_completo.sql)
```

### Pattern 1: Onboarding gate with `Stack.Protected` + `redirectTo` (answers Q2)
**What:** Gate inside `(app)/_layout.tsx` (already inside `QueryClientProvider`, `AuthProvider`, `DatabaseGate`, and under the root `Stack.Protected guard={!!session}`), so it composes: no session → root sends to `(auth)`; session but not onboarded → `(app)` renders only `onboarding`; onboarded → tabs.
**Why `redirectTo`:** `Protected` accepts `redirectTo?: Href` (default = navigator anchor) [VERIFIED: expo-router build/views/Protected.d.ts]; docs: when a focused screen becomes protected the user is redirected and its history entries are removed [CITED: docs.expo.dev/router/advanced/protected]. Using explicit `redirectTo` avoids depending on an anchor that may itself be inside a guarded group.
```tsx
// src/app/(app)/_layout.tsx
export default function AppLayout() {
  const producer = useProducer();           // hooks first, then branch
  if (producer.isLoading) return <FullScreen><LoadingState message="Preparando sua propriedade…" /></FullScreen>;
  if (producer.isError || !producer.data) return <FullScreen><ErrorState onRetry={() => void producer.refetch()} /> {/* + ghost "Sair da conta" */}</FullScreen>;
  const needsOnboarding = producer.data.onboardingCompletedAt == null;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={needsOnboarding} redirectTo="/">
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={!needsOnboarding} redirectTo="/onboarding">
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="alerta/[id]" />
      </Stack.Protected>
    </Stack>
  );
}
```
- **No flicker:** the layout never mounts the Stack until the producer query resolves; the loading screen replaces it. First sign-in = one short loading screen (same copy as Início loading).
- **Completion:** in the mutation `onSuccess`: `queryClient.setQueryData(['producer', userId], { ...old, onboardingCompletedAt: iso })` (do NOT only invalidate: a refetch would briefly return the stale null and bounce back to onboarding), then `invalidateQueries` for `['property']`, `['home']`, `['home-summary']`. The guard flips and expo-router redirects to `/` (tabs/index). Do not also call `router.replace` in the same tick (race with the guard); if UI-SPEC's explicit replace is wanted, call it in `useEffect` when `needsOnboarding` is false while `onboarding` is focused. Verify on web + native.
- **Do NOT add `unstable_settings.anchor` to `(app)/_layout.tsx` in this phase:** `readAnchor` resolves the anchor from the layout's static children regardless of guards [VERIFIED: expo-router build/layoutAnchor.js], so an anchor of `(tabs)` that is guarded off during onboarding is an untested interaction. Use a `canGoBack()` fallback in the detail screen instead.
- Also fix the existing deprecation: tabs layout uses `unstable_settings = { initialRouteName: 'index' }`; in SDK 58 the key is `anchor` (`initialRouteName` still read but warns) [VERIFIED: layoutAnchor.js `settings.anchor ?? settings.initialRouteName`, `warnIfInitialRouteNameIsUsed`].
- Extend `ProducerProfile`/`getProducer` to select `onboarding_completed_at` (currently selects only `id, full_name`). This breaks the existing `getProducer` `toEqual` test: update it.

### Pattern 2: Alert detail route (answers Q1)
- URL for a tab file `(app)/(tabs)/alertas.tsx` is `/alertas` (groups are stripped). A file `(app)/alertas/[id].tsx` has URL `/alertas/:id`; `/alertas` has no `alertas/index`, so it should resolve only to the tab. This is probably fine, **but** the project already calls `router.navigate('/alertas')` for the tab and a same-named directory in the parent stack is the one configuration not verified here. **Recommendation (safe path): `src/app/(app)/alerta/[id].tsx`** → `/alerta/<id>`. Zero ambiguity, tiny deviation from UI-SPEC's example path (UI-SPEC/CONTEXT say "e.g."). Navigate with `router.push({ pathname: '/alerta/[id]', params: { id } })`.
- Back: `onBack = () => (router.canGoBack() ? router.back() : router.replace('/'))`. Stack push from the tabs keeps tabs beneath, so `back()` returns to Início/Alertas on native and web. On web reload/deep link to `/alerta/<id>` the history is empty → fallback `replace('/')` (this is exactly why `canGoBack` is needed). Hardware back on Android pops the stack natively.
- Place `alerta/[id]` inside the `!needsOnboarding` Protected group so a deep link during onboarding is redirected to onboarding.

### Pattern 3: Single composite home service + pure derivation (answers Q4/Q5)
`getHomeOverview(propertyId)`:
1. `const now = Date.now()`.
2. `Promise.all` of: sensors with area name; `latest_readings` for the property; thresholds; unresolved alerts; latest climate (wrapped so a climate failure returns `climate: { error: true }` instead of rejecting the whole query: satisfies UI-SPEC "partial section failure").
3. `offset = computeDemoOffset(max(recorded_at) of is_demo rows in latest_readings, now)`.
4. Shift once, return plain objects + `asOf: now`. Screen calls `deriveCondition({ ...data, now })`.

PostgREST shapes (verified against schema 001; all columns exist):
```ts
// sensors + area name (FK sensors.area_id -> planting_areas)
supabase.from('sensors').select('id,name,type,unit,area_id,last_seen_at,is_demo,planting_areas(name)').eq('property_id', id);
// latest per sensor (view from 005)
supabase.from('latest_readings').select('sensor_id,recorded_at,value,is_demo').eq('property_id', id);
supabase.from('thresholds').select('sensor_type,min_value,max_value').eq('property_id', id);
// unresolved alerts: enum sorts by declaration order, so severity desc = critical, warning, info
supabase.from('alerts').select('id,sensor_id,category,severity,status,title,description,recommendation,triggered_at,is_demo')
  .eq('property_id', id).neq('status', 'resolvido')
  .order('severity', { ascending: false }).order('triggered_at', { ascending: false }).limit(100);
supabase.from('climate_snapshots').select('*').eq('property_id', id).order('observed_at', { ascending: false }).limit(1).maybeSingle();
```
Re-sort client-side after shifting (mixed demo/non-demo rows could reorder). `numeric` columns arrive as JSON numbers from PostgREST; coerce with `Number()` defensively.

### Anti-Patterns to Avoid
- **Passing `AsyncBoundary` a query with stale data + error:** `AsyncBoundary` renders `ErrorState` whenever `query.isError`, even if `data` exists, which would hide the screen on a failed refresh. For Início pass `{ ...query, isError: query.isError && !query.data }` and show the refresh-failed `Notice` when `query.isError && query.data` (UI-SPEC S2 state table).
- **Shifting at render time or in more than one place:** timestamps would be shifted twice or against different `now`s. Shift only in the service, return `asOf`.
- **Using `useQuery().isRefetching` as the `refreshing` flag:** it is true for background refetches (spinner appears without a gesture). Keep a local `refreshing` state set only by `onRefresh`.
- **`router.replace` immediately after the flag mutation** (race with the Protected re-evaluation): rely on the guard flip (see Pattern 1).
- **Computing offline from the shifted value of a non-demo sensor:** shifting is per-row `is_demo`; never shift non-demo rows.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Route gating | Custom redirect `useEffect`s | `Stack.Protected` + `redirectTo` | Handles history removal and re-evaluation on state change |
| Latest row per group | Pull 4k rows and reduce in JS | `latest_readings` view (lateral + `limit 1`) | Index-backed; scales with ESP32 ingestion |
| Owner isolation for the view | Manual `where owner_id` | `security_invoker = true` | Reuses existing RLS policies on sensors/readings |
| Server cache + refresh | Manual loading flags | React Query `refetch`/`setQueryData` | Already the project pattern |
| Pull-to-refresh | Custom gesture | RN `RefreshControl` (native) + button | Core component |

**Do hand-roll (small, tested, no dep):** `formatUpdatedAgo`/`formatRelative`, `formatDecimalPtBr`, `formatDateTime`. Reason: no reliable `Intl.RelativeTimeFormat` on Hermes and a new dependency is forbidden by UI-SPEC.

## Common Pitfalls

### Pitfall 1: RNW `RefreshControl` breaks web scrolling
**What goes wrong:** `ScrollView` with `refreshControl` on web renders `cloneElement(refreshControl, { style: props.style }, scrollView)`: a wrapper `View` (RefreshControl is just a `View` on web) with no `flex:1` when the ScrollView has no `style` [VERIFIED: react-native-web/dist/cjs/exports/ScrollView/index.js:579, RefreshControl/index.js].
**How to avoid:** In `ScreenContainer`, add `refreshControl` only when `Platform.OS !== 'web' && onRefresh`. Web path = hero "Atualizar" button (UI-SPEC B8). Use `tintColor`/`colors` = `primaryText`, `progressBackgroundColor` = `card` from `useTheme()` (no hex).

### Pitfall 2: New view not reachable by the app
**What goes wrong:** Supabase stopped auto-exposing new `public` objects to the Data API (changelog 45329, announced 2026-04-28; opt-out default for new projects 2026-05-30) [CITED: supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically]. An un-granted view returns "permission denied"/404 from PostgREST.
**How to avoid:** 005 must `grant select on public.latest_readings to authenticated` explicitly (and revoke from `anon`). Existing tables keep their grants.

### Pitfall 3: View bypasses RLS
**What goes wrong:** views run as owner (postgres) and bypass RLS unless `security_invoker = true` (Postgres 15+) [CITED: supabase.com/docs/guides/database/postgres/row-level-security]. Without it every user could read all readings.
**How to avoid:** `with (security_invoker = true)`. Verify with a two-user check in UAT (second account must see only its own sensors' latest rows).

### Pitfall 4: Silent zero-row updates under RLS
**What goes wrong:** `update ... eq('id', x)` that matches no visible row returns `error: null`, `data: null` (no throw). A failed property update would look like success and the flag would then be set.
**How to avoid:** chain `.select('id')` and treat an empty result as failure (`ServiceError`). Same for the producers update.

### Pitfall 5: Seed timestamps are hour-truncated, so shifting can produce the future
**What goes wrong:** seed readings end at `date_trunc('hour', now())` at signup, while climate `observed_at = now()` and the rain alert `now() - 30 min`. With `offset = now − latest_reading`, climate/alert times can land after `now` (negative "age").
**How to avoid:** clamp every shifted value to `now` (`Math.min(ts + offset, now)`), and subtract a constant `DEMO_FRESHNESS_MS` (recommended 3 min) from the offset so the freshest reading reads "Atualizado há 3 min" instead of permanently "agora" (D-08 says "a few minutes old"). Relative gaps are untouched (Pomar still ~52 h + 3 min stale, alerts keep ordering).

### Pitfall 6: Offline sensor with stale reading drives out-of-range
**What goes wrong:** the offline Pomar temperature sensor's last value (52 h old) would be evaluated against thresholds and double-count.
**How to avoid:** only online sensors are evaluated for out-of-range and metric tiles (UI-SPEC S2 §4); offline are a separate reason.

### Pitfall 7: Existing mocks can't express new queries
`src/services/services.test.ts` `mockBuilder` supports only `select/order/limit/neq/eq` + `maybeSingle`. New services use `insert/update/in/single/gte`. Extend the mock builder (or write a new test file with a richer one) and keep existing tests green.

### Pitfall 8: `Card` has no zero-padding variant
UI-SPEC needs a `Card` with `padding: 0` for the alert list. Current `Card` hard-codes `padding: spacing.lg` and has only `default|important`. Add an optional `padded?: boolean` (default true) or `flush` prop; it is not listed in the UI-SPEC change table, so mention it in the plan.

### Pitfall 9: Alert id from the URL
Validate UUID shape before querying; an invalid id makes PostgREST error (22P02) which would show the generic network error instead of "Alerta não encontrado". Treat invalid-format as not found.

## Onboarding writes (answers Q3)

Verified against `002_rls.sql` + `004_review_fixes.sql` (004 is live):

| Write | Allowed? | Basis |
|-------|----------|-------|
| `update properties set name, city, state where id` | Yes | `properties_update` policy (owner) + `grant update (name, city, state)`; `state char(2)` |
| `insert into planting_areas (property_id, name, crop)` | Yes | `areas_insert` requires owner + `is_demo = false`; `is_demo` defaults to false, so omit it |
| `select` the inserted row | Yes | `areas_select` |
| `update planting_areas set name, crop` | Yes | `grant update (name, crop)` + `areas_update` |
| `update producers set onboarding_completed_at` | Yes | `grant update (full_name, onboarding_completed_at)` + `producers_update` (id = auth.uid()) |

**Idempotent sequence (no migration):** `completeOnboarding({ propertyId, name, city, state, areaName, crop })`
1. `update properties ... .eq('id', propertyId).select('id')` (fail if empty).
2. `select id from planting_areas where property_id = X and is_demo = false order by created_at limit 1`; if found → `update name, crop` on it; else `insert` (with `.select('id').single()`).
3. **Last:** `update producers set onboarding_completed_at = <ISO now> where id = uid .select('id')`.
Retry after a partial failure re-runs 1–2 harmlessly (same property, same single non-demo area), and the flag is only set after everything succeeded. Residual race (double submit) is closed by disabling the form while saving (UI-SPEC) plus a `useRef` in-flight guard. Client-clock ISO for the flag is acceptable (it is only a gate). Clarify to executor: step 2 cannot clobber user data because no screen before onboarding can create non-demo areas (CRUD is Phase 4).
Prefill: `useCurrentProperty()` (self-heals via `ensure_demo_farm`); city/state in the demo seed are `Ibiúna/SP`, but CONTEXT/UI-SPEC say city empty and name prefilled: follow UI-SPEC (name prefilled, city empty, state unselected) and do NOT prefill the seeded Ibiúna/SP.

## Latest readings, migration 005 (answers Q4)

User must run this manually in the Supabase SQL editor (as with 004), and it must also be appended to `supabase/setup_completo.sql` (header says generated from 001..004). Idempotent.

```sql
-- supabase/migrations/005_latest_readings.sql
-- AgroAlerta - 005: ultima leitura por sensor (RLS-safe)
-- Depende de: 001, 002. Cole no SQL Editor do Supabase e rode. Seguro rodar mais de uma vez.
create or replace view public.latest_readings
with (security_invoker = true) as
select s.property_id, r.sensor_id, r.id as reading_id, r.recorded_at, r.value, r.is_demo
from public.sensors s
cross join lateral (
  select id, sensor_id, recorded_at, value, is_demo
  from public.readings
  where sensor_id = s.id
  order by recorded_at desc
  limit 1
) r;

revoke all on public.latest_readings from public, anon;
grant select on public.latest_readings to authenticated;
```
- Uses `readings_sensor_time_idx (sensor_id, recorded_at desc)`: one index probe per sensor. `s.property_id` is exposed (not `r.property_id`) so `eq('property_id', …)` pushes down to `sensors`.
- `security_invoker` makes the existing `sensors_select`/`readings_select` policies (`private.is_property_owner`) apply to the caller. Postgres ≥ 15 required [CITED: Supabase RLS docs]; Supabase hosted projects in this timeframe are PG15+ [ASSUMED: project's Postgres version not checked; confirm in dashboard].
- Sensors with no readings are absent from the view (lateral inner join): treat "sensor in `sensors` but no row in `latest_readings`" as "no data" (offline unless `last_seen_at` is recent).
- Thresholds, alerts, climate need no view (single small queries). Unresolved alerts use the existing `alerts_property_status_idx`.
- Plan must include a `checkpoint:human-action` "run 005 in SQL editor" before any task that exercises the view, and the service should map a PostgREST relation-missing error to the generic `ServiceError` (the ErrorState then explains nothing technical; the checkpoint prevents it).
- Fallback if the user refuses a migration: per-sensor `readings ... .eq('sensor_id', id).order('recorded_at',{ascending:false}).limit(1).maybeSingle()` in `Promise.all` (6 requests for the demo farm). Not recommended as primary.

## Demo time anchor (answers Q5)

File: `src/services/demoTime.ts` (pure, no supabase import; Phases 3–5 import it from their services).
```ts
export const DEMO_FRESHNESS_MS = 3 * 60_000;
/** offset (ms) to ADD to demo timestamps. 0 when there is no demo reading. */
export function computeDemoOffset(latestDemoRecordedAt: string | null | undefined, now: number): number {
  const t = latestDemoRecordedAt ? Date.parse(latestDemoRecordedAt) : NaN;
  return Number.isFinite(t) ? Math.max(0, now - DEMO_FRESHNESS_MS - t) : 0;   // never shift into the past
}
export function shiftTs(iso: string | null, offset: number, now: number): string | null {
  if (iso == null) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(Math.min(t + offset, now)).toISOString() : iso;
}
export function shiftDemoRow<T extends { is_demo: boolean }>(row: T, fields: (keyof T)[], offset: number, now: number): T
```
- Offset source: `max(recorded_at)` over `is_demo` rows of `latest_readings` (equals the max over all demo readings because every sensor contributes its newest). Alert detail (no readings loaded) uses `fetchDemoOffset(propertyId)` = `readings` `eq(property_id).eq(is_demo,true).order(recorded_at desc).limit(1)` (index `readings_property_idx` is on property_id only; acceptable for single-row fetch, or call the view and take max).
- `Math.max(0, …)`: if a demo row is somehow in the future, do not shift backwards.
- Fields shifted: readings `recorded_at`, sensors `last_seen_at`, alerts `triggered_at`, climate `observed_at`, risk `analyzed_at` (Phase 5). Non-demo rows pass through untouched.
- React Query: cache stores already-shifted values plus `asOf`. "Atualizado há X min" = `formatUpdatedAgo(lastReadingAt, nowTick)` where `nowTick` comes from `useNow(60_000)` (a `setInterval` hook), so it ages in real time between refetches; refetch/pull resets it to ~3 min. `deriveCondition` takes `now = overview.asOf` (deterministic, memoizable). No polling is required in Phase 2; optionally `refetchInterval: 5 * 60_000` on Início only.
- Unit tests (`demoTime.test.ts`): no demo reading → offset 0 and rows unchanged; freshest reading maps to `now − 3 min`; Pomar sensor (`−52 h`) remains > 2 h old after shifting; non-demo rows untouched; clamp to `now` (climate observed after last reading); invalid/null dates safe; shifting twice is prevented by API shape (document that only services call it).

## deriveCondition (answers Q6)

Files: `src/lib/sensorStatus.ts` (shared with Phase 3) and `src/features/condition/deriveCondition.ts`.
```ts
export const SENSOR_OFFLINE_AFTER_MS = 2 * 60 * 60 * 1000;
export const isSensorOffline = (lastActivityMs: number | null, now: number) =>
  lastActivityMs == null || now - lastActivityMs > SENSOR_OFFLINE_AFTER_MS;      // exactly 2h = online
export function rangeViolation(value: number, t?: {min: number|null; max: number|null}): 'low'|'high'|null
```
Input (all timestamps already shifted): `{ now, sensors: [{id,name,type,areaName,lastSeenAt,latest:{value,recordedAt}|null}], thresholds: Partial<Record<SensorType,{min,max}>>, alerts: UnresolvedAlert[] }`.
Output: `{ status, primary: Reason|null, extraCount, reasons, onlineCount, offlineCount, pendingCount, sensorCount, lastReadingAt }`, where `Reason = { kind: 'alert'|'reading'|'offline', rank, line, action, alertId?, sensorId?, at }`.

Rules (implementation contract):
- `lastActivity = max(latest.recordedAt, lastSeenAt)`; no data at all → offline ("Sem comunicação"). [Decision: a brand-new real sensor with no readings counts as offline/Atenção in Phase 3; revisit there.]
- Pending = alerts with status `novo|visualizado` (input should already exclude `resolvido`; filter defensively).
- Crítico iff any pending alert `critical`. Else Atenção iff any other reason. Else Normal. Readings and offline never produce Crítico.
- Reasons: alerts (rank by severity: critical 0, warning 1, info 2; within same severity newest first), then out-of-range for **online** sensors (rank 3, worst violation first by % beyond the limit), then offline (rank 4, longest offline first).
  - Tier order inside "warning/info alert": warning before info (honors D-06 "most severe first"; slightly stricter than UI-SPEC's "newest first within a tier").
- Dedup (UI-SPEC): drop an `offline` reason if a pending `sensor_offline` alert exists for that sensor; drop an out-of-range reading reason if a pending alert with the same `sensor_id` and a measurement category (`temperature_high|soil_moisture_low|air_humidity_high`) exists. `heavy_rain`/`unfavorable_weather` have no sensor and never dedup.
- `extraCount = reasons.length − 1`; copy "+1 outro ponto de atenção" / "+N outros pontos de atenção" (singular/plural fn).
- Reason text/action: alert → `title` + (area ? ` — ${area}` : '') / `recommendation` verbatim; reading → UI-SPEC copy table keyed by `type × direction`; offline → fixed copy; Normal copy per D-07; zero sensors + no alerts → UI-SPEC alt copy.
- Active sensors (HOME-05) = `onlineCount`; "sem comunicação" count = `offlineCount`.

Test matrix (jest, `now` injected):
| # | Case | Expected |
|---|------|----------|
| 1 | no alerts, all online, in range | normal, primary null, extra 0 |
| 2 | one critical `novo` alert | critico |
| 3 | critical alert `visualizado` | critico (D-04) |
| 4 | critical alert `resolvido` only | normal (or lower tier) |
| 5 | warning alert only | atencao |
| 6 | info alert only | atencao (D-02) |
| 7 | reading above max / below min (online) | atencao; reason text per direction; no critical |
| 8 | value exactly at min or max | in range |
| 9 | threshold missing for the type / one-sided null | never violates the missing side |
| 10 | sensor last activity exactly 2h | online; 2h + 1 ms | offline |
| 11 | offline sensor, no alert | atencao with offline reason |
| 12 | offline sensor with pending `sensor_offline` alert | one reason (the alert), extraCount not inflated |
| 13 | out-of-range reading + same-sensor pending alert | one reason |
| 14 | critical + warning + out-of-range + offline | critico; primary = critical; extra = 3 |
| 15 | priority order warning > info > reading > offline; newest-first inside equal severity | ordered |
| 16 | offline sensor's stale out-of-range value ignored | not a reading reason |
| 17 | zero sensors, zero alerts | normal with alt copy |
| 18 | demo-farm fixture (6 sensors, Pomar offline 52 h, soil critical `novo`, offline alert, rain alert) | critico; primary = soil alert with "— Horta de Folhosas"; onlineCount 5; offlineCount 1; pending = fixture count |
| 19 | pluralization of "+N" | 1 vs n |

`selectMetric(type, sensors, thresholds, now)` (UI-SPEC B4) in the same feature with its own tests: any online out-of-range → the one furthest beyond its limit, mark Atenção, context = area||sensor name; else mean of online (mark Normal, context "Média de n sensores", n=1 → area); none online → "—", "Sem dados", "Nenhum sensor online".

## Pull-to-refresh and refetch (answers Q7)

`ScreenContainer` props `refreshing?: boolean; onRefresh?: () => void`:
```tsx
const refreshControl = onRefresh && Platform.OS !== 'web'
  ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh}
      tintColor={colors.primaryText} colors={[colors.primaryText]} progressBackgroundColor={colors.card} />
  : undefined;
<ScrollView refreshControl={refreshControl} … />
```
Screen: `const [refreshing, setRefreshing] = useState(false); const refresh = async () => { setRefreshing(true); try { await Promise.all([propertyQ.refetch(), overviewQ.refetch()]); } finally { setRefreshing(false); } }`. Both the gesture (native) and the hero "Atualizar" button call `refresh`. `refetch()` resolves (does not throw) with the error in the result, so `finally` always clears the spinner. Show the refresh-failed `Notice` when `overviewQ.isError && overviewQ.data`.

## Relative time and number formatting (answers Q8)

Do not use `Intl.RelativeTimeFormat`, `PluralRules` or `Intl.DateTimeFormat`: Hermes ships a partial Intl; FormatJS lists RelativeTimeFormat as unsupported on Hermes [CITED: formatjs.github.io/docs/guides/react-native-hermes] and behavior differs by platform. Hand-roll in `src/lib/formatTime.ts` / `formatNumber.ts` using UI-SPEC's scale (all take `now: number`):
- `formatRelative(ts, now)`: `<1 min` → "agora"; `<60 min` → "há N min"; `<24 h` → "há N h"; else "em dd/MM às HH:mm". Clamp negative diffs to "agora".
- `formatUpdatedAgo(ts|null, now)`: "Atualizado agora" / "Atualizado há N min" / "Atualizado há N h" / "Atualizado em dd/MM às HH:mm" / null → "Sem leituras recentes".
- `formatDateTime(ts)` → "dd/MM/yyyy às HH:mm". Use `Date#getDate/getMonth/getHours/getMinutes` with `padStart(2,'0')` (device local time zone; Brazil target). Tests build dates with `new Date(y, m, d, h, mi)` so they pass in any TZ.
- `formatDecimal(n, digits)` → `n.toFixed(digits).replace('.', ',')`; humidity rounded with `Math.round`.
- Static sorted UF list (27 entries, "Nome (UF)") in `features/onboarding/ufs.ts`; do not use `localeCompare`/Collator.

## Code Examples

### Idempotent onboarding service (shape)
```ts
// src/services/onboarding.ts  (ServiceError messages in PT-BR, no raw DB text)
export async function completeOnboarding(i: OnboardingInput): Promise<string /* iso */> {
  const p = await supabase.from('properties').update({ name: i.name, city: i.city, state: i.state })
    .eq('id', i.propertyId).select('id');
  if (p.error || !p.data?.length) throw new ServiceError(MSG_SAVE, p.error);
  const existing = await supabase.from('planting_areas').select('id').eq('property_id', i.propertyId)
    .eq('is_demo', false).order('created_at', { ascending: true }).limit(1).maybeSingle();
  if (existing.error) throw new ServiceError(MSG_SAVE, existing.error);
  const area = existing.data
    ? await supabase.from('planting_areas').update({ name: i.areaName, crop: i.crop }).eq('id', existing.data.id).select('id')
    : await supabase.from('planting_areas').insert({ property_id: i.propertyId, name: i.areaName, crop: i.crop }).select('id');
  if (area.error || !area.data?.length) throw new ServiceError(MSG_SAVE, area.error);
  const at = new Date().toISOString();
  const prod = await supabase.from('producers').update({ onboarding_completed_at: at }).eq('id', i.userId).select('id');
  if (prod.error || !prod.data?.length) throw new ServiceError(MSG_SAVE, prod.error);
  return at;
}
```
Validation (pure, `features/onboarding/validate.ts`, trim first): property/area name 1–120, city 2–80, crop 1–60, state must be in the 27-UF whitelist; returns per-field messages (UI-SPEC copy) and the first invalid field key for focus.

### Hook for completion
```ts
useMutation({ mutationFn: completeOnboarding, onSuccess: (at) => {
  qc.setQueryData(['producer', userId], (o) => o && { ...o, onboardingCompletedAt: at });
  qc.invalidateQueries({ queryKey: ['property'] });
  qc.invalidateQueries({ queryKey: ['home'] });
  qc.invalidateQueries({ queryKey: ['home-summary'] });
}})
```
Query keys stay user-scoped (Phase 1 WR-03): `['home', 'overview', userId, propertyId]`, `['alert', userId, id]`.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `unstable_settings.initialRouteName` | `unstable_settings.anchor` | expo-router (SDK 56+) | Replace in `(tabs)/_layout.tsx` to silence the warning |
| Protected redirects to anchor/first screen only | `Stack.Protected redirectTo` | SDK 58 | Explicit target, used here |
| New public tables/views auto-exposed | Explicit `grant` required | Supabase 2026-04-28 / default 2026-05-30 | 005 must grant |
| Views bypass RLS | `security_invoker = true` (PG15+) | PG15 | 005 uses it |

## Runtime State Inventory

Not a rename/refactor phase: omitted. (The "rename" of the demo property is an in-place `UPDATE` of data the user is creating; no cached strings elsewhere.)

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `(app)/alertas/[id].tsx` alongside tab `alertas` would resolve `/alertas` to the tab (not tested); recommendation is the singular path regardless | Pattern 2 | Low: singular path avoids the question |
| A2 | `Stack.Protected` with explicit `redirectTo` and no `anchor` redirects to tabs after the flag flips without a visible flash on web and native (docs describe the behavior; not run here) | Pattern 1 | Medium: executor must verify on web + one native target; fallback is a `useEffect` + `router.replace('/')` |
| A3 | Project's Postgres is ≥ 15 (needed for `security_invoker`) | Migration 005 | Medium: if PG14, the view would leak across owners; confirm in the Supabase dashboard before running, else use per-sensor queries |
| A4 | `DEMO_FRESHNESS_MS = 3 min` is an acceptable reading of D-08 "a few minutes old" | Demo anchor | Low: single constant; user may prefer 0 |
| A5 | Sensor with no readings/`last_seen_at` counts as offline | deriveCondition | Low: revisit in Phase 3 |
| A6 | Within the alert tier, warning outranks info (UI-SPEC says newest first inside a tier) | deriveCondition | Low: one comparator |
| A7 | `numeric` columns reach the client as JSON numbers | PostgREST shapes | Low: defensive `Number()` already planned |
| A8 | Device local time zone is acceptable for dd/MM HH:mm output | Formatting | Low |

## Open Questions (RESOLVED)

1. **Alert detail route vs `/alertas` tab: ambiguous?** 
   - RESOLVED: use `src/app/(app)/alerta/[id].tsx` (URL `/alerta/<id>`); `/alertas` stays the tab. Back = `canGoBack() ? back() : replace('/')`. No `anchor` in `(app)/_layout.tsx`.
2. **Onboarding guard without flicker?** 
   - RESOLVED: gate in `(app)/_layout.tsx` on `useProducer().onboardingCompletedAt`; loading/error render before the Stack; two `Stack.Protected` groups with `redirectTo`; completion uses `setQueryData` + invalidate, no manual replace race.
3. **Writes allowed and idempotent?** 
   - RESOLVED: all allowed (002 + 004). Order property → find-or-update-or-insert single non-demo area → set flag last; `.select()` on every write to catch silent RLS zero-row updates.
4. **Efficient queries / migration?** 
   - RESOLVED: migration `005_latest_readings.sql` (security_invoker lateral view, explicit grant to `authenticated`, revoke anon), run manually, appended to `setup_completo.sql`. Other data via plain PostgREST queries (SQL above). Fallback = per-sensor `limit 1`.
5. **Demo anchor?** 
   - RESOLVED: `src/services/demoTime.ts` pure helpers; offset from the freshest demo reading in `latest_readings`; shifted once in the service, clamped to `now`, 3 min freshness; `asOf` returned; UI ages the label with `useNow`.
6. **deriveCondition and offline constant?** 
   - RESOLVED: `src/lib/sensorStatus.ts` (`SENSOR_OFFLINE_AFTER_MS`, `isSensorOffline`, `rangeViolation`) + `src/features/condition/deriveCondition.ts`; 19-case matrix above.
7. **Pull-to-refresh?** 
   - RESOLVED: `ScreenContainer` `refreshing/onRefresh`; `RefreshControl` native only (RNW wrapper breaks scroll); hero "Atualizar" button on all platforms; local `refreshing` state.
8. **PT-BR relative time without deps?** 
   - RESOLVED: hand-rolled `formatRelative/formatUpdatedAgo/formatDateTime/formatDecimal`; no `Intl.RelativeTimeFormat`.
9. **Validation approach?** 
   - RESOLVED: see Validation Architecture (nyquist disabled; short list).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node + npm | build/test | ✓ | node runs locally (SDK 58 needs ≥ 22.13; Phase 1 verified) | — |
| jest / jest-expo | pure-logic tests | ✓ | ~30.5.2 / ~58.0.14 | — |
| Supabase SQL Editor (manual) | migration 005 | ✓ (user action) | — | per-sensor queries |
| Live Supabase project with 004 applied | all data tasks | ✓ per STATE | — | — |

**Missing dependencies with no fallback:** none. **Blocking human step:** user runs 005 in the SQL editor.

## Validation Architecture

`workflow.nyquist_validation` is off: short approach only.
- **Pure logic (jest):** `deriveCondition`, `selectMetric`, `demoTime`, `formatTime`, `formatNumber`, onboarding `validate`, UF list (27 entries, unique, sorted), `getProducer` (updated shape), services with extended mock builder (`completeOnboarding` retry does not insert twice; silent zero-row update throws; `getHomeOverview` shifts demo rows only and survives a climate failure). Run: `npx jest`.
- **Static:** `npm run typecheck` (tsc), `npm run lint` (`expo lint`; ESLint blocks `@/lib/supabase` imports outside services), `node scripts/check-ui-rules.mjs` (no hex outside tokens, no `fontWeight`/`className`).
- **Build:** `npx expo export --platform web` compiles routes (catches Protected/route-name typos such as a `Stack.Screen name` not matching a file).
- **Manual UAT (human):** new account → onboarding → Início shows Crítico with soil reason; kill/reopen app lands on Início (flag persisted); web reload of `/alerta/<id>` shows back fallback; second account cannot see another's readings (view RLS); 200% font scale.

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | inherited | Phase 1 Supabase Auth; no change |
| V3 Session Management | inherited | Phase 1 |
| V4 Access Control | yes | RLS per owner on all reads/writes; `security_invoker` view; guard is UX only, never security |
| V5 Input Validation | yes | Trim + length limits + UF whitelist client-side; DB `check` constraints (name 1–120); UUID format check on route param |
| V6 Cryptography | no | none |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR on `/alerta/<id>` | Information disclosure | RLS `alerts_select`; not-found state; do not leak existence |
| View bypassing RLS | Information disclosure | `security_invoker = true`; two-user UAT check |
| Client forging `onboarding_completed_at` / writing `is_demo` | Tampering | Column-level grants + `is_demo = false` insert policy; worst case is skipping own onboarding |
| Verbose DB errors shown to users | Information disclosure | `ServiceError` friendly messages, raw error kept in `cause` (Phase 1 pattern) |
| Rendering server strings | Tampering | RN `Text` only (no HTML); no `dangerouslySetInnerHTML` equivalents |

## Project Constraints (from CLAUDE.md)
- Stack fixed: Expo SDK 58 / RN / TS / RN Web; Supabase backend. Node ≥ 22.13.
- No direct `supabase.from` in screens: all data via `src/services/*` repositories (ESLint-enforced).
- StyleSheet + `src/theme/tokens.ts` only; no NativeWind; no hex outside tokens.
- No service-role key in the app; no AsyncStorage auth.
- No `@react-navigation/*` imports in app code (use `expo-router` entry points).
- Demo data via seeded rows + `is_demo`; no fake ML/weather APIs presented as truth.
- Min 48dp targets, high contrast, PT-BR copy, accessibility basics.
- GSD workflow enforcement: file edits only via GSD commands (execution phase).

## Sources

### Primary (HIGH confidence)
- Installed source (read): `node_modules/expo-router/build/views/Protected.d.ts`, `layoutAnchor.js`, `layouts/StackClient.d.ts`; `react-native-web/dist/cjs/exports/RefreshControl/index.js`, `ScrollView/index.js`
- Repo: `supabase/migrations/001..004`, `src/**` listed in the task, `package.json`, `scripts/check-ui-rules.mjs`
- https://docs.expo.dev/router/advanced/protected/ : guard changes, `redirectTo` (SDK 58+), history removal
- https://supabase.com/docs/guides/database/postgres/row-level-security : views bypass RLS, `security_invoker` PG15+
- https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically : explicit grants for new public objects

### Secondary (MEDIUM confidence)
- https://formatjs.github.io/docs/guides/react-native-hermes : Hermes Intl gaps (RelativeTimeFormat unsupported; sources conflict on PluralRules)

### Tertiary (LOW confidence)
- Third-party summaries of the Supabase October 30, 2026 rollout to existing projects (not verified; irrelevant as long as 005 grants explicitly)

Note: the Supabase docs page fetched during research contained text addressed to AI agents (asking to send a feedback report). It was page content, not a user instruction, and was ignored.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH (no new packages; all installed and read)
- Architecture: MEDIUM-HIGH (guard behavior from docs + source, runtime flash unverified: A2)
- Pitfalls: HIGH (RNW and RLS/grant items verified in source/official docs)
- SQL view: MEDIUM-HIGH (standard Postgres; PG version unconfirmed: A3)

**Research date:** 2026-11-12
**Valid until:** 2026-12-12 (Supabase default-grant policy and expo-router 58 patches move quickly)
