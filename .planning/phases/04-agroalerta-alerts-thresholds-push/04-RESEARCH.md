# Phase 4: AgroAlerta Alerts, Thresholds & Push - Research

**Researched:** 2026-11-15
**Domain:** Expo/RN alert center + Supabase (Postgres alert evaluation, RLS) + Expo push via Edge Function
**Confidence:** MEDIUM-HIGH (codebase facts HIGH; push wiring MEDIUM, needs device/EAS validation)

## User Constraints

No CONTEXT.md exists (user skipped discuss-phase). No locked decisions. Project constraints from CLAUDE.md are in "Project Constraints" below. Decisions marked "Recommendation" are Claude's discretion and listed in the Assumptions Log.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ALRT-01 | Alert center list with title/description/date/severity/recommendation/status | `alerts` table already has all fields; `AlertRow`, `alertMeta.ts`, `/alerta/[id]` exist. Need list service + `alertas.tsx` screen (currently a stub EmptyState) |
| ALRT-02 | 6 alert categories | Enum `alert_category` already has all 6. Seed produces only 4 kinds (3 threshold + offline + rain). `unfavorable_weather` has NO producer anywhere (see Pitfall 4) |
| ALRT-03 | Filter by category and severity | Client-side filter with `Chip` + zustand/local state; fetch all (limit ~200) and filter in memory |
| ALRT-04 | Open -> visualizado; mark resolvido | RLS already grants `update (status)` to authenticated. Need `updateAlertStatus` service + mutation |
| ALRT-05 | Tab badge + Início count in sync | TabBar already reserves `tabBarBadge` (not rendered). Single shared query key + invalidation |
| ALRT-06 | Threshold alerts consistent with readings | Needs a server-side evaluator (does not exist). Seed alerts are one-shot snapshots (see Pitfall 1) |
| ALRT-07 | Push on physical device, web degrades | expo-notifications + `push_tokens` table (exists) + Edge Function + DB trigger. Web banner already half-present in perfil |
| PRF-03 | Toggle notifications + categories | Prefs currently local-only zustand (`critical/warning/daily`); must move server-side for the Edge Function to honor them |
| PRF-04 | Edit temp/humidity (air+soil) thresholds | `thresholds` table + RLS `thresholds_all` already allow owner CRUD; no UI/service for write yet |
</phase_requirements>

## Summary

The data model for this phase is mostly already in place: `alerts` (with `sensor_id`, `reading_id`, category/severity/status enums), `thresholds` (unique per property+sensor_type), `push_tokens`, RLS that lets owners update only `alerts.status`, and read-side services (`getAlert`, `getHomeOverview`, `listThresholds`). Client condition logic (`deriveCondition`) already treats out-of-range latest readings and offline sensors as reasons even without an alert row, so changing thresholds will update property condition and sensor normal/abnormal state on the client as soon as the `['home','overview',...]` and `['readings','thresholds',...]` queries are invalidated.

The real gap is on the server. Alerts exist only as a one-time snapshot generated at signup (`ensure_demo_farm`, migration 004) from the seeded readings and the thresholds at that moment. `generate_demo_dataset` (007) regenerates 30 days of readings but does NOT touch alerts. Nothing creates alerts from new readings or re-evaluates after a threshold change, and nothing sends push. ALRT-06, PRF-04 (alert side) and ALRT-07 therefore require a Postgres alert-evaluation function plus triggers, and an Edge Function for push. This is the core of the phase and should be the first plan (Wave 1), before UI.

Push requires native pieces that cannot be validated in Expo Go on Android (remote push unsupported in Expo Go since SDK 53) and need an EAS project/projectId, a dev build and an Expo access token. Neither `supabase` nor `eas` CLI is installed on this machine and the user deploys SQL by pasting `supabase/setup_completo.sql` in the dashboard SQL editor. Plans must include human checkpoints for: EAS project init, dev build, Edge Function deploy, secrets, and device test.

**Primary recommendation:** Wave 1 = one migration (008) adding `private.evaluate_property_alerts(property_id)` (SECURITY DEFINER), a readings-insert trigger, a threshold-change trigger, notification prefs columns, an alerts-insert push trigger, and `mark/resolve` plumbing; Wave 2 = services/hooks + Alertas screen + badge + Perfil thresholds; Wave 3 = expo-notifications registration, Edge Function, prefs UI, web banner; final = human-verify on a physical device.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Alert generation from readings vs thresholds | Database (SQL function + trigger) | — | Single source of truth; must work with app closed and for future ESP32 inserts; client must not create alerts (RLS blocks insert) |
| Alert reconciliation on threshold change | Database (trigger on `thresholds`) | Client invalidates caches | Keeps ALRT-06 true regardless of client |
| Alert list/filter/detail/status change | Client (services -> react-query) | Database (RLS) | Filter in memory; status update via RLS column grant |
| Tab badge / Início count | Client (shared react-query selector) | — | Derived from the same alerts query so both sync |
| Condition / sensor normal-abnormal after threshold edit | Client (`deriveCondition`, `rangeViolation`) | — | Already pure client logic; just invalidate |
| Push delivery | Edge Function -> Expo Push API | Database trigger/webhook | Server-initiated, app closed |
| Push token + permission | Client (expo-notifications) | Database (`push_tokens`) | Device-only API |
| Notification prefs | Database (per producer) | Client UI | Edge Function must read them server-side |
| Web push message | Client | — | `Platform.OS === 'web'` banner |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-notifications | ~58.1.9 (`npx expo install expo-notifications` will pick the SDK-aligned version) | Permission, Expo push token, tap handling | Locked by CLAUDE.md. `npm view expo-notifications@58` shows 58.1.x series [VERIFIED: npm registry; first-party Expo package] |
| expo-device | ~58.0.5 | `Device.isDevice` guard (skip simulators) | CLAUDE.md; `npm view` -> 58.0.5 [VERIFIED: npm registry] |
| expo-constants | ~58.0.16 (already installed) | `Constants.expoConfig.extra.eas.projectId` | Already in package.json |
| @tanstack/react-query | ^5.107.1 (installed) | Alerts cache, mutations, optimistic status | Already used |
| zustand | ^5.1.0 (installed) | Alert filter UI state only | Already used |
| @supabase/supabase-js | ^2.119.0 (installed) | Client | Already used |

Expo Push API (`https://exp.host/--/api/v2/push/send`) called from a Supabase Edge Function (Deno) [CITED: supabase.com/docs/guides/functions/examples/push-notifications].

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| expo-haptics | ~58 aligned | Feedback on mark-as-resolved | Optional, native only (not installed yet) [ASSUMED] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| DB trigger + `pg_net` call to Edge Function | Dashboard "Database Webhook" (creates the same trigger via UI) | Webhook is click-ops, not versionable; trigger in migration is reproducible. Needs `pg_net` extension + service key stored (Vault) - see Pitfall 7 |
| Edge Function push | pg_cron polling an outbox table | Outbox (`notified_at is null`) + function invoked by trigger gives retry safety; polling adds latency. Recommend trigger + `notified_at` marker |
| Server-side prefs | Local zustand prefs (existing) | Local prefs cannot be read by the Edge Function; do not keep as source of truth |

**Installation:**
```bash
npx expo install expo-notifications expo-device
```
Add to `app.json` plugins: `["expo-notifications", { "color": "<brand green>", "defaultChannel": "alertas" }]` (build-time; needs new native build) [CITED: docs.expo.dev/versions/latest/sdk/notifications].

**Version verification:** `npm view expo-notifications@58 version` returned 58.1.7-58.1.9; `npm view expo-device version` -> 58.0.5 (2026-11-15). Node v26.4.0 locally.

## Package Legitimacy Audit

slopcheck was not run (not installed; best-effort install not attempted). Both packages are first-party Expo SDK modules that CLAUDE.md names explicitly, listed in docs.expo.dev SDK 58 reference.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| expo-notifications | npm | years | very high | github.com/expo/expo | not run | Approved: named in CLAUDE.md; install only via `npx expo install`; planner should still add a quick `npm view expo-notifications scripts.postinstall` check |
| expo-device | npm | years | very high | github.com/expo/expo | not run | Approved: same as above |

**Packages removed due to slopcheck [SLOP]:** none. **Flagged [SUS]:** none. All tagged [ASSUMED] for provenance purposes because slopcheck was unavailable; low risk since CLAUDE.md pre-approves them.

Edge Function dependency: `npm:@supabase/server` appears in the current Supabase doc example (`withSupabase`). Prefer the long-stable `jsr:@supabase/supabase-js@2` `createClient` with `SUPABASE_SERVICE_ROLE_KEY` env instead, to avoid an unfamiliar package [ASSUMED].

## Architecture Patterns

### System Architecture Diagram

```
 readings INSERT (seed / generate_demo_dataset / future ESP32)
        |                                  thresholds UPSERT (Perfil)
        v                                         |
  [trigger: statement-level]                [trigger on thresholds]
        |                                         |
        +---------------> private.evaluate_property_alerts(property_id) <---------+
                              |  reads latest reading per sensor + thresholds
                              |  (a) INSERT new open alert (dedup per sensor+category)
                              |  (b) UPDATE stale open alerts -> resolvido (auto)
                              v
                        alerts row (status novo, severity, recommendation)
                              |
                  [AFTER INSERT trigger, severity != info, notified_at null]
                              v
                pg_net -> Edge Function `push-alert` (service role)
                              |  join producers.prefs + push_tokens, filter by category/severity
                              v
                     Expo Push API -> APNs/FCM -> device (app closed)
                              |  tap
                              v
        app: expo-notifications response listener -> router.push('/alerta/[id]')

 Client reads:  alerts list (react-query ['alerts', userId, propertyId])
                  |-> Alertas screen (filters) / TabBar badge / Início count / AlertRow
 Client writes: open detail -> status 'visualizado' (only if 'novo'); button -> 'resolvido'
                  -> invalidate ['alerts'], ['alert'], ['home','overview']
```

### Recommended Project Structure
```
supabase/migrations/008_alerts_engine.sql     # evaluator, triggers, prefs, notified_at, unique index
supabase/functions/push-alert/index.ts        # Edge Function (Deno)
src/services/alerts.ts                         # + listAlerts, updateAlertStatus, countPending
src/services/thresholds.ts                     # + saveThresholds
src/services/notifications.ts                  # prefs get/set, register/unregister token
src/hooks/useAlerts.ts, usePendingAlertCount.ts, useUpdateAlertStatus.ts,
          useSaveThresholds.ts, useNotificationPrefs.ts, usePushRegistration.ts
src/features/alerts/filter.ts (+test)          # pure filter + pending-count helpers
src/features/alerts/categoryMeta.ts            # category -> label/icon (extend alertMeta.ts)
src/features/thresholds/validate.ts (+test)    # pure validation of min/max
src/features/notifications/registerPush.ts     # platform-guarded, no-op on web
src/components/alerts/AlertFilters.tsx
src/components/profile/ThresholdsSection.tsx
```
Do not call `supabase.from` in screens (CLAUDE.md); follow the existing services -> hooks -> screens layering and `['x', userId, ...]` key scoping (Phase 1 WR-03).

### Pattern 1: Server-side evaluator (core of ALRT-06)
**What:** `private.evaluate_property_alerts(p_property uuid)` SECURITY DEFINER, `set search_path = ''`, revoked from public/anon/authenticated (same pattern as `private.generate_sensor_readings`, migration 007). Logic per sensor using the LATEST reading and current thresholds:
- soil_moisture: violation if `value < min`; temperature and air_humidity: `value > max` (same rule as seed, migration 004). Severity: critical when relative deviation >= 15%, else warning (same formula as seed) so new alerts match seeded ones.
- Open alert exists for (sensor, category) with status in (novo, visualizado) and still violating -> leave alone (optionally refresh description).
- Open alert exists but latest reading now in range (e.g. user raised the limit) -> set `resolvido`.
- Violating and no open alert and no alert (any status) for that sensor+category triggered after the last in-range reading -> INSERT with `reading_id` = the violating reading, `sensor_id`, title/description/recommendation strings identical to the seed's wording (reuse them, pt-BR).
- Offline: `sensors.last_seen_at < now() - 2h` aligned with the client's `SENSOR_OFFLINE_AFTER_MS` (2 h, `src/lib/sensorStatus.ts`). NOTE the seed used 3 h; align both to 2 h or the Início "offline" count and the alert disagree (Pitfall 3).
- Protect with a partial unique index `alerts (sensor_id, category) where status <> 'resolvido' and sensor_id is not null` so concurrent runs cannot double-insert [ASSUMED design].
**Entry points:** AFTER INSERT statement-level trigger on `readings` (with transition table, evaluate distinct property_ids), AFTER INSERT/UPDATE/DELETE trigger on `thresholds`, and a call at the end of `generate_demo_dataset` (so regenerate demo data keeps alerts consistent). For the demo farm's "alive" feel, calls from `readings` trigger are enough; no pg_cron needed for v1.
**Caveat:** `generate_demo_dataset` deletes and reinserts ~720 rows/sensor; a statement-level trigger fires once per INSERT statement per sensor, so evaluator runs a few times, acceptable but make it idempotent.

### Pattern 2: Open-to-visualizado + resolve
```typescript
// src/services/alerts.ts  (RLS alerts_update + column grant allow only status)
export async function updateAlertStatus(id: string, status: 'visualizado' | 'resolvido') {
  const q = supabase.from('alerts').update({ status }).eq('id', id);
  // visualizado must never downgrade resolvido: guard in the DB filter
  const res = status === 'visualizado' ? await q.eq('status', 'novo') : await q;
  if (res.error) throw new ServiceError('Não foi possível atualizar o alerta.', res.error);
}
```
Mark visualizado from the detail screen in an effect once the alert loads with `status === 'novo'` (fire once, ref-guarded), then invalidate. Do not mark on list render. Mutation onSuccess invalidates `['alerts']`, `['alert']`, `['home','overview']`.

### Pattern 3: Shared pending count (ALRT-05)
Pending = status in (novo, visualizado) per `deriveCondition.isPending`. Home already computes it from `overview.alerts`. Badge: spec says "Alertas tab badge and the Início pending count update to match". Recommendation: badge counts `novo` only (unread) would DISAGREE with Início's pending count (novo + visualizado); success criterion 2 requires they match, so use the same definition for both (pending = not resolvido) via one exported helper `countPending(alerts)` in `src/features/alerts/filter.ts` and one hook `usePendingAlertCount(propertyId)` reading from the same `['alerts', ...]` or `['home','overview']` data. Render badge in `TabBar.tsx` using the already-read `options.tabBarBadge` (set from `(tabs)/_layout.tsx` via the hook) [ASSUMED: confirm with user whether badge = unread only].

### Pattern 4: Push registration (native only)
```typescript
// src/features/notifications/registerPush.ts  (conceptual, verified API surface per Expo docs)
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export async function registerForPush(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) return null;
  if (Platform.OS === 'android') {
    // Android 13+: channel must exist BEFORE the permission prompt / token request
    await Notifications.setNotificationChannelAsync('alertas', {
      name: 'Alertas', importance: Notifications.AndroidImportance.HIGH,
    });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== 'granted') return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;            // otherwise ERR_NOTIFICATIONS_NO_EXPERIENCE_ID
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}
```
[CITED: docs.expo.dev/versions/latest/sdk/notifications - projectId required, channel before permission on Android 13+, wrap token call in try/catch]. Upsert into `push_tokens` (`token` is unique; platform must be 'ios' | 'android' per CHECK) with `onConflict: 'token'`; on logout or notifications toggled off delete the row for this device. Request the permission from a user action (enabling the switch in Perfil), not on app launch.

Tap handling: in `(app)/_layout.tsx` use `Notifications.useLastNotificationResponse()` / `addNotificationResponseReceivedListener` and `router.push({ pathname: '/alerta/[id]', params: { id } })` with `data.alertId` from the push payload; validate id with the existing UUID regex (already in `getAlert`). Set `Notifications.setNotificationHandler` for foreground display.

### Pattern 5: Edge Function (`push-alert`)
Receives `{ alert_id }` (or webhook record) from the DB trigger; with service-role client: load alert + property owner (`properties.owner_id`), producer prefs, `push_tokens` for the user; skip if push disabled, category disabled, severity below threshold, or `notified_at` already set; POST to Expo Push API in chunks (<=100 messages), body `{to, title, body, sound:'default', channelId:'alertas', data:{alertId}}`, then set `alerts.notified_at = now()`; inspect response tickets and delete tokens with `DeviceNotRegistered`. Authorization header `Bearer EXPO_ACCESS_TOKEN` if enhanced security is enabled [CITED: supabase.com/docs/guides/functions/examples/push-notifications]. Deploy with `verify_jwt = false` and verify a shared secret header inside the function (called by trigger, not by users).

### Pattern 6: Threshold editing (PRF-04)
Perfil section "Limites" with 3 rows (Temperatura °C: max; Umidade do ar %: max; Umidade do solo %: min; plus optional the opposite side). Requirement text says "temperature and humidity (air and soil)". The evaluator only uses max for temp/air and min for soil, but the table has both min and max and `rangeViolation` checks both sides, so expose min and max for all three for consistency with the client logic. Save = upsert `thresholds` on `(property_id, sensor_type)`; validate: numbers, min < max, temperature -20..60, humidity 0..100 (client pure validator + DB CHECK `min_value < max_value` and bounds). Respect `tempUnit` preference: store Celsius always; convert for display only (check `formatNumber`/preferences for existing conversion helpers). Apply to the selected farm (`useSelectedFarm`). After save invalidate `['readings','thresholds',...]`, `['home','overview',...]`, `['alerts',...]`, sensors keys (check `useFarmSensors` key). The thresholds trigger reconciles alerts server-side.

### Anti-Patterns to Avoid
- **Client-side alert creation or derivation as truth:** RLS has no insert policy for alerts; keep the DB as source; client only derives display fallbacks.
- **Keeping notification prefs only in zustand:** server cannot honor them.
- **`SELECT *` + status filter in several places:** make one alerts query/key so badge, list, and home cannot diverge.
- **Marking visualizado during list render or on every refetch.**
- **Using `supabase.from` in screens.**

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Push delivery | Direct APNs/FCM | Expo Push API via Edge Function | CLAUDE.md decision; handles both platforms |
| Notification permission/token | Custom native module | expo-notifications + expo-device | Platform quirks (Android 13 channel, iOS status values) |
| Alert dedupe | App-level "already notified" memory | Partial unique index + `notified_at` column | Races and retries |
| Threshold validation | Ad-hoc screen code | Pure `validate.ts` (like `features/farm/validate.ts`, `features/profile/validateName.ts`) + DB CHECK | Testable, consistent with codebase |
| Relative time / demo time shift | New helpers | `formatRelative`, `shiftDemoRow`, `computeDemoOffset` | Already exist; list must shift demo alerts the same way as `getAlert` and `getHomeOverview` |
| Query/error/loading UI | New components | `AsyncBoundary`, `EmptyState`, `ErrorState`, `Chip`, `Tabs`, `ListRow`, `Notice`, `ConfirmDialog` | Existing design system |

## Runtime State Inventory

Not a rename/refactor phase, but data-state notes relevant to migration:
| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Existing demo alerts rows from signup (migration 003/004 snapshot) with static descriptions containing numeric values; existing `thresholds` rows; no `notified_at`/prefs columns | Migration 008 adds columns with defaults; backfill `notified_at = now()` for all existing alerts so they never push; run evaluator once per property in the migration (demo rows stay as is) |
| Live service config | Supabase project is configured by pasting SQL in the dashboard; no Edge Functions, no `pg_net` confirmed, no Vault secrets | Human checkpoint: enable `pg_net`, store function URL/secret, deploy function, set `EXPO_ACCESS_TOKEN` |
| OS-registered state | None | None |
| Secrets/env vars | `.env.example` is deleted in git status; app uses `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | New secrets live server-side only (Edge Function env); no service role key in the app |
| Build artifacts | `app.json` has no `extra.eas.projectId`, no `expo-notifications` plugin; no EAS dev build exists | `eas init`, add plugin, new dev build required (not OTA) |

Also: `supabase/setup_completo.sql` is a concatenation of migrations 001..007; regenerate it to include 008 after writing the migration (see Pitfall 8).

## Common Pitfalls

### Pitfall 1: Alerts are a signup snapshot, not live
**What goes wrong:** Changing thresholds or regenerating demo data leaves alerts that no longer match readings (violates ALRT-06 and success criterion 3/4).
**Why:** Alerts come from `ensure_demo_farm` (004) once; `generate_demo_dataset` (007) only rewrites readings (confirmed by grep: no alert logic in 007).
**Avoid:** Evaluator + triggers (Pattern 1) and call it at the end of `generate_demo_dataset`.
**Warning signs:** soil alert visible while latest soil reading is in range.

### Pitfall 2: Demo time anchoring on alert list
**What goes wrong:** `triggered_at` for `is_demo` alerts is stored relative to seed time; Início and `getAlert` shift them with `computeDemoOffset(freshest demo reading)`. A new list service that forgets this shows "há 6 dias".
**Avoid:** Reuse the same offset call + `shiftDemoRow(row, ['triggered_at'], offset, now)` for the list; one offset per fetch. Evaluator-created alerts on demo properties should be `is_demo = true`, otherwise they will not be shifted and would mix anchors (or set `triggered_at = recorded_at` of the reading, which IS shifted consistently when `is_demo = true`).

### Pitfall 3: Offline definition mismatch (2 h vs 3 h)
Client `SENSOR_OFFLINE_AFTER_MS` = 2 h; seed offline alert uses 3 h. Use one constant in SQL and TS (document it) or alerts and Início "sensor offline" disagree.

### Pitfall 4: `unfavorable_weather` and `heavy_rain` have no live source
Seed inserts one `heavy_rain` alert from `climate_snapshots.rain_probability_pct >= 70`; nothing produces `unfavorable_weather`. Project rule: no fake science, demo is labeled. Recommendation: evaluator also derives these from the latest `climate_snapshots` row (rain >= 70 -> heavy_rain; condition text/extreme temp or humidity -> unfavorable_weather) and add one seeded `unfavorable_weather` demo alert in migration 008 so ALRT-02 shows all 6 categories. Weather for the real client (Open-Meteo, `src/services/weather.ts`) is separate from `climate_snapshots`; do not wire it into alerts in v1 [ASSUMED].

### Pitfall 5: Resolved alert immediately reopened
If the user resolves a still-violating alert, the next reading insert would re-create it. Rule: create only if no alert (any status) exists for that sensor+category newer than the last in-range reading. Client condition still lists the out-of-range reading as a reason (via `deriveCondition` readingEntries), which is correct and honest.

### Pitfall 6: Badge vs home count mismatch
Home pending list = `neq('status','resolvido')` limited to 100 (`getHomeOverview`) and ordered by `severity desc` (enum order: info < warning < critical; confirm ordering works, it does for enums). Use one helper for both (Pattern 3).

### Pitfall 7: DB -> Edge Function call
Trigger needs `pg_net` (`net.http_post`) and the function URL + auth secret. Secrets must not be hard-coded in a migration committed to git: use Supabase Vault or have the user run a one-time SQL with their values (human checkpoint). If `pg_net` is unavailable, fallback: Dashboard "Database Webhook" on `alerts` INSERT (same effect, configured by clicking) [CITED: supabase.com/docs/guides/functions/examples/push-notifications uses dashboard webhooks]. Docs page did not show the SQL form; verify `supabase_functions.http_request` / `net.http_post` syntax in Supabase docs at implementation time.

### Pitfall 8: `setup_completo.sql` drift
Users paste this file. After adding 008, regenerate/append it or fresh projects will lack the engine.

### Pitfall 9: Push can't be tested in Expo Go (Android) or web
Remote push on Android needs a dev build since SDK 53; iOS needs an Apple developer setup for real push; simulators lack tokens. `getExpoPushTokenAsync` throws without `projectId`. Plan an explicit human-verify checkpoint and make everything else (UI, prefs, banner) testable without a device.

### Pitfall 10: Web import of expo-notifications
Importing is safe, but calling token APIs on web is unsupported (docs list only Android/iOS). Guard all calls with `Platform.OS !== 'web'` and render the explanatory `Notice` on web. Perfil currently says "O envio de notificações chega em breve." which must be rewritten once push works.

### Pitfall 11: Existing prefs shape
Store has `critical | warning | daily` (persisted key `agroalerta.preferences`, version 1). Replace with `enabled` + per-category booleans stored on the server; keep local store only as an optimistic cache or remove it, and bump the persist `version`/`merge` so old persisted values do not crash (the `merge` validates fields, follow that pattern). `daily` has no producer in v1: drop it (out of scope) [ASSUMED].

### Pitfall 12: Phase 3 dependency
Success criterion 3 ("visible in Monitoramento") needs sensor detail/history from Phase 3. Today `monitoramento.tsx` lists sensors (SensorRow) and there is chart infrastructure (`src/components/charts`, `useSensorHistory`, `SensorChartCard`), but no sensor-detail route was found. Alert detail can link to Monitoramento (`router.navigate('/monitoramento')`) and show the violating reading value inline (join `readings` via `reading_id`, or latest reading of sensor); mark deep-link to sensor detail as dependent on Phase 3. Flag to planner.

## Code Examples

### Evaluator skeleton (SQL, conceptual)
```sql
create or replace function private.evaluate_property_alerts(p_property uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  -- 1) auto-resolve open measurement alerts that no longer violate current thresholds
  update public.alerts a set status = 'resolvido'
  from public.sensors s
  join public.latest_readings lr on lr.sensor_id = s.id
  left join public.thresholds th on th.property_id = s.property_id and th.sensor_type = s.type
  where a.sensor_id = s.id and a.property_id = p_property
    and a.status <> 'resolvido'
    and a.category in ('temperature_high','soil_moisture_low','air_humidity_high')
    and not ( (s.type = 'soil_moisture' and lr.value < th.min_value)
           or (s.type <> 'soil_moisture' and lr.value > th.max_value) );
  -- 2) insert missing alerts (dedup via partial unique index + on conflict do nothing)
  -- 3) offline + weather categories similarly
end $$;
revoke all on function private.evaluate_property_alerts(uuid) from public, anon, authenticated;
```
`latest_readings` view exists (migration 005, RLS of caller; in SECURITY DEFINER context RLS is bypassed by owner, fine, but verify the view's `security_invoker` behavior or select directly from `readings` with `distinct on (sensor_id)`).

### List with demo anchoring (TS pattern)
Follow `getAlert` in `src/services/alerts.ts` (`fetchDemoOffset` + `shiftDemoRow`); select `id,sensor_id,category,severity,status,title,description,recommendation,triggered_at,is_demo,sensors(name,planting_areas(name))`, order `triggered_at desc`, limit 200; filtering by category/severity in memory in `features/alerts/filter.ts` (pure, unit-tested like `deriveCondition.test.ts`).

### Threshold upsert
```typescript
await supabase.from('thresholds').upsert(
  rows.map((r) => ({ property_id, sensor_type: r.type, min_value: r.min, max_value: r.max })),
  { onConflict: 'property_id,sensor_type' },
);
```
RLS `thresholds_all` already permits owner insert/update (including the demo property, since the policy lacks an `is_demo` check).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Remote push in Expo Go on Android | Requires development build | SDK 53 | Need EAS dev build for device test [CITED: Expo notifications docs] |
| Permission prompt without channel | Create notification channel first on Android 13+ | Android 13 | Order matters in `registerForPush` |
| `getLastNotificationResponse` (sync) | `useLastNotificationResponse` / `getLastNotificationResponseAsync` | recent SDKs | Use async/hook variants |
| Supabase doc example uses `npm:@supabase/server` `withSupabase` | Newer example form | 2026 docs | Either works; prefer plain supabase-js [ASSUMED] |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | "Important" alert for push = severity warning or critical (info excluded) | Pattern 5 | Over/under-notification; confirm with user |
| A2 | Badge counts pending (novo + visualizado) to match Início | Pattern 3 | If user wants unread-only badge, success criterion 2 wording differs |
| A3 | Drop the `daily` notification toggle; replace with master switch + 6 category toggles stored server-side | Pitfall 11 | UI scope change |
| A4 | Evaluator also derives heavy_rain / unfavorable_weather from `climate_snapshots`, plus a seeded unfavorable_weather demo alert | Pitfall 4 | ALRT-02 only partly met if skipped |
| A5 | Use `pg_net` trigger (or dashboard webhook) rather than pg_cron | Pitfall 7 | Extension may be unavailable on user's project |
| A6 | Use plain supabase-js in Edge Function instead of `@supabase/server` | Pattern 5 | Minor |
| A7 | expo-notifications / expo-device legitimate (slopcheck not run) | Package audit | Very low |
| A8 | Alert detail will not deep-link to sensor detail (Phase 3) | Pitfall 12 | Success criterion 3 partially deferred |
| A9 | Thresholds editable for both min and max of all three types, Celsius stored | Pattern 6 | UX scope |
| A10 | Offline threshold unified at 2 h | Pitfall 3 | Alert/home mismatch if kept at 3 h |

## Open Questions

1. **Does the user's Supabase project allow `pg_net` and is there an EAS account/projectId?**
   - Known: no `extra.eas.projectId` in app.json; no supabase/eas CLI installed locally.
   - Unclear: Apple developer account for iOS push; Android FCM credentials (EAS handles via `eas credentials`).
   - Recommendation: plan a human checkpoint early; ship Android-first verification.
2. **Should push fire for demo-farm alerts?** For graduation/demo value yes (evaluator creates `is_demo` alerts). Recommend yes, with demo labeling in the notification body ("Dados de demonstração") [ASSUMED].
3. **How does a demo user trigger a "new" alert on stage?** Existing `useGenerateDemoData`/threshold edit can create one. Recommend lowering a threshold in Perfil as the demo path (it re-evaluates and fires push) and document it.
4. **Phase 3 dependency** (sensor detail route) - see Pitfall 12.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | tooling | yes | v26.4.0 | — |
| npm registry access | install | yes | — | — |
| supabase CLI | deploy Edge Function, migrations | no | — | Deploy function via Supabase dashboard editor; paste SQL in SQL Editor (current workflow) |
| eas CLI | `eas init`, dev build | no | — | `npx eas-cli@latest` (human step) |
| Physical device + dev build | ALRT-07 verification | unknown | — | Verify everything else without; push marked human-verify |
| Expo access token / Supabase secrets | Edge Function | unknown | — | Human checkpoint |

**Missing with no fallback:** physical device for final push verification (human-only).
**Missing with fallback:** supabase/eas CLIs (dashboard / npx).

## Validation Architecture

Skipped: `workflow.nyquist_validation` is `false` in `.planning/config.json`. For reference, the repo uses Jest (`jest-expo` ~58.0.14, `npm test`, `npm run typecheck`) with colocated `*.test.ts` and mocked-supabase service tests (`src/services/services.test.ts` pattern). Pure helpers (filter, countPending, threshold validate, notification prefs mapping) should each get unit tests; SQL evaluator verified by manual SQL script in `supabase/manual/`.

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (existing) | Supabase Auth already in place |
| V3 Session Management | no | existing |
| V4 Access Control | yes | RLS: alerts update limited to `status` column; evaluator/prefs/token tables owner-scoped; Edge Function uses service role server-side only; never ship service key in the app |
| V5 Input Validation | yes | UUID check on route param (exists), threshold validator + DB CHECK constraints, status enum guard |
| V6 Cryptography | no | none hand-rolled |

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Another user's alert id in URL | Information disclosure | RLS `alerts_select` via `private.is_property_owner`; `getAlert` already returns null on mismatch |
| Forged call to push Edge Function | Spoofing | `verify_jwt=false` plus shared-secret header check inside function; secret in Vault/env |
| Client sets alert fields other than status | Tampering | Existing column-level grant (`grant update (status)`) |
| Push token theft/reuse across users | Spoofing | `push_all` RLS `user_id = auth.uid()`; delete token on sign-out; Edge Function prunes `DeviceNotRegistered` |
| SECURITY DEFINER function abuse | Elevation | `set search_path = ''`, `revoke ... from public, anon, authenticated`, schema `private` |
| Notification content leakage on lock screen | Information disclosure | Keep payload generic (title + short body, no coordinates) |
| Threshold values out of range (DoS via alert spam) | Tampering | DB CHECK bounds + dedupe index |

## Project Constraints (from CLAUDE.md)
- Expo SDK 58, Expo Router (JS tabs, custom TabBar), no `@react-navigation/*` imports in app code.
- Supabase: anon/publishable key in app, service role only in Edge Functions; RLS on everything.
- No direct `supabase.from` in screens; use `src/services/*` repositories + hooks.
- State: zustand for UI state, react-query for server data; StyleSheet + `theme.ts` tokens (no NativeWind).
- Push: expo-notifications + Edge Function -> Expo Push API; no-op on web with an in-app banner.
- Demo labeling mandatory; `is_demo` flag; no fake science presented as truth.
- Touch targets >= 48dp, high contrast; UI copy pt-BR.
- Work through GSD commands before editing files.

## Sources

### Primary (HIGH confidence)
- Codebase: `supabase/migrations/001-007`, `src/services/{alerts,home,thresholds}.ts`, `src/features/condition/*`, `src/lib/sensorStatus.ts`, `src/components/layout/TabBar.tsx`, `src/components/alerts/*`, `src/stores/preferences.ts`, `perfil.tsx`, `alertas.tsx`, `alerta/[id].tsx`, `app.json`, `package.json`
- https://docs.expo.dev/versions/latest/sdk/notifications/ - projectId, channel-before-permission on Android 13+, no remote push in Expo Go on Android since SDK 53, plugin options, response listeners, web not supported
- https://supabase.com/docs/guides/functions/examples/push-notifications - webhook -> Edge Function -> Expo Push API, secrets (`EXPO_ACCESS_TOKEN`), `verify_jwt = false`
- npm registry: `expo-notifications@58.1.x`, `expo-device 58.0.5`

### Secondary (MEDIUM)
- None beyond above.

### Tertiary (LOW)
- `pg_net` trigger syntax and Vault usage: not verified in this session (flagged for implementation-time lookup).
- Note: the fetched Supabase docs page contained embedded text addressed to AI agents asking to submit a feedback report; it was not acted on.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - packages pre-decided by CLAUDE.md, versions checked.
- Architecture: MEDIUM-HIGH - based on direct code reading; evaluator design is a recommendation.
- Pitfalls: HIGH for codebase-derived (1-6, 8, 11, 12); MEDIUM for platform push (7, 9, 10).

**Research date:** 2026-11-15
**Valid until:** 2026-12-15 (push/Expo APIs move quickly; re-check Expo notifications docs before device build)
