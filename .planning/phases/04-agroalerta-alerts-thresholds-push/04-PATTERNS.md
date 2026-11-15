# Phase 4: AgroAlerta Alerts, Thresholds & Push - Pattern Map

**Mapped:** 2026-11-15
**Files analyzed:** 33 new/modified
**Analogs found:** 30 / 33

All paths relative to `/home/artur/Área de trabalho/GS-Mobile`. Path alias `@/` = `src/`. Layering: services -> hooks -> screens; no `supabase.from` in screens. Query keys are `[domain, userId, ...ids]`.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `supabase/migrations/008_alerts_engine.sql` | migration | event-driven (triggers) | `supabase/migrations/007_demo_dataset.sql` (+ 004 alert SQL) | exact |
| `supabase/setup_completo.sql` (regen) | config | batch | itself (concat 001..007) | exact |
| `supabase/functions/push-alert/index.ts` | service (Edge Fn) | event-driven | none in repo | no analog |
| `supabase/manual/008_*.sql` (evaluator check, secrets) | script | batch | `supabase/manual/006b_cleanup_demo_optional.sql` | role-match |
| `src/services/alerts.ts` (+ listAlerts, updateAlertStatus, reading evidence) | service | CRUD | itself (`getAlert`) | exact |
| `src/services/alerts.test.ts` (extend) | test | request-response | itself | exact |
| `src/services/thresholds.ts` (+ saveThresholds) | service | CRUD | itself + `producers.ts` `updateProducerName` | exact |
| `src/services/notifications.ts` | service | CRUD | `src/services/producers.ts` | role-match |
| `src/hooks/useAlerts.ts` | hook | CRUD (read) | `src/hooks/useAlert.ts` | exact |
| `src/hooks/usePendingAlertCount.ts` | hook | transform | `src/hooks/useAlert.ts` | role-match |
| `src/hooks/useUpdateAlertStatus.ts` | hook | CRUD (write) | `src/hooks/useUpdateProducerName.ts` / `useGenerateDemoData.ts` | exact |
| `src/hooks/useSaveThresholds.ts` | hook | CRUD (write) | `src/hooks/useGenerateDemoData.ts` (multi-key invalidate) | exact |
| `src/hooks/useNotificationPrefs.ts` | hook | CRUD | `src/hooks/useProducer.ts` + `useUpdateProducerName.ts` | role-match |
| `src/hooks/usePushRegistration.ts` | hook | event-driven | none | no analog |
| `src/features/alerts/filter.ts` (+test) | utility | transform | `src/features/condition/deriveCondition.ts` (+test) | exact |
| `src/features/alerts/useAlertFilterStore.ts` (zustand UI) | store | state | `src/stores/selectedFarm.ts` | role-match |
| `src/features/thresholds/validate.ts` (+test) | utility | transform | `src/features/profile/validateName.ts`, `src/features/farm/validate.ts` | exact |
| `src/features/notifications/registerPush.ts` | utility | request-response | RESEARCH Pattern 4 | no analog |
| `src/components/alerts/alertMeta.ts` (+CATEGORY_META) | config | transform | itself | exact |
| `src/components/alerts/AlertRow.tsx` (variant full) | component | request-response | itself | exact |
| `src/components/alerts/AlertFilters.tsx` | component | request-response | `src/components/ui/Tabs.tsx`, `Select.tsx`, `Chip.tsx`, perfil Tabs usage | role-match |
| `src/components/alerts/ReadingEvidence.tsx` | component | transform | `Card` usage in `alerta/[id].tsx` | role-match |
| `src/components/profile/ThresholdsSection.tsx` | component | CRUD | `perfil.tsx` name-edit block (Input + Button + Notice) | role-match |
| `src/components/profile/NotificationsSection.tsx` | component | CRUD | `perfil.tsx` NOTIFICATION_ROWS block + `SettingsRow` | exact |
| `src/components/settings/SettingsRow.tsx` (+disabled) | component | - | itself | exact |
| `src/components/layout/TabBar.tsx` (badge) | component | - | itself (lines 95-101 reserved) | exact |
| `src/app/(app)/(tabs)/alertas.tsx` | screen | CRUD (read) | itself (stub) + `index.tsx` alert list | role-match |
| `src/app/(app)/(tabs)/_layout.tsx` | layout | - | itself | exact |
| `src/app/(app)/(tabs)/perfil.tsx` | screen | CRUD | itself | exact |
| `src/app/(app)/(tabs)/index.tsx` (use shared count) | screen | read | itself | exact |
| `src/app/(app)/alerta/[id].tsx` | screen | CRUD | itself | exact |
| `src/app/(app)/_layout.tsx` (notification tap listener) | layout | event-driven | itself | partial |
| `src/stores/preferences.ts` (drop critical/warning/daily, version 2) | store | state | itself | exact |
| `app.json` (plugin, `extra.eas.projectId`) | config | - | itself | exact |

## Pattern Assignments

### `supabase/migrations/008_alerts_engine.sql` (migration, event-driven)

**Analog:** `supabase/migrations/007_demo_dataset.sql` (header/idempotency/private-fn style) and `004_review_fixes.sql` lines 214-275 (alert wording and severity formula to reuse verbatim).

**Header / idempotent / transaction style** (007 lines 1-22): pt-BR comment header with "IMPORTANTE ... cole no SQL Editor ... idempotente", `begin; ... commit;`, `add column if not exists`, `create or replace`.

**Private SECURITY DEFINER function pattern** (007 lines 32-50, 117):
```sql
create or replace function private.generate_sensor_readings(...)
returns integer
language plpgsql
security definer
set search_path = ''
as $$ ... $$;
revoke all on function private.generate_sensor_readings(uuid, uuid, public.sensor_type, timestamptz, timestamptz) from public, anon, authenticated;
```
Copy for `private.evaluate_property_alerts(uuid)`; always schema-qualify (`public.`) since `search_path = ''`.

**Public RPC with owner check** (007 lines 122-148): `v_uid := (select auth.uid())`, `raise exception ... using errcode = '42501'`. Add a call `perform private.evaluate_property_alerts(p_property_id);` after the readings loop (before the `demo_data_generated_at` update at line 171).

**Alert insert wording/severity to reuse** (004 lines 242-267):
```sql
(case when (case when e.type = 'soil_moisture' then (e.tmin - e.vmin) / e.tmin else (e.vmax - e.tmax) / e.tmax end) >= 0.15
      then 'critical' else 'warning' end)::public.alert_severity,
...
case e.type when 'temperature' then 'Temperatura acima do limite'
            when 'soil_moisture' then 'Solo seco: umidade abaixo do mínimo'
            else 'Umidade do ar acima do limite' end,
-- offline (004 262-267): 'Sensor sem comunicação', '%s não envia dados há mais de 3 horas.'  -> change to 2 hours (Pitfall 3)
-- rain (004 269-275): heavy_rain from climate_snapshots.rain_probability_pct >= 70
```
Insert columns: `(property_id, sensor_id, reading_id, category, severity, status, title, description, recommendation, triggered_at, is_demo)`. Set `is_demo = true` for demo properties (Pitfall 2).

**RLS/grants analog** (002 lines 25-29, 55-56): `revoke update ... ; grant update (cols) ...`; `push_all` policy `user_id = (select auth.uid())`. New prefs columns on `producers` must be added to the `grant update (full_name, onboarding_completed_at, ...)` list (002 line 29) or stored in a new owner-scoped table; both need RLS.

**Existing tables to build on:** `push_tokens(id,user_id,token unique,platform in ('ios','android'),created_at)` (001 lines 116-122). Add `alerts.notified_at`, partial unique index `(sensor_id, category) where status <> 'resolvido' and sensor_id is not null`, thresholds `check (min_value < max_value)` bounds, backfill `notified_at = now()`.

---

### `supabase/functions/push-alert/index.ts` (Edge Function)
No analog (no `supabase/functions` dir). Use RESEARCH Pattern 5 and Supabase push example. Plain `createClient` from `jsr:@supabase/supabase-js@2` with `SUPABASE_SERVICE_ROLE_KEY`; shared-secret header check; chunk <=100; prune `DeviceNotRegistered`; set `notified_at`. Copy for push text from UI-SPEC S6. Copy severity labels from `SEVERITY_META` (`Crítico`/`Atenção`).

---

### `src/services/alerts.ts` (service, CRUD)

**Analog:** itself. Keep imports (lines 1-4):
```typescript
import { supabase } from '@/lib/supabase';
import { computeDemoOffset, shiftDemoRow } from '@/services/demoTime';
import { ServiceError } from '@/services/ServiceError';
import type { AlertCategory, AlertSeverity, AlertStatus } from '@/types/database';
```
**Reuse** `first()`, `fetchDemoOffset(propertyId, now)` (lines 45-63), the `AlertRow` embed interfaces (22-43), and the try/catch wrap (lines 98-101):
```typescript
} catch (e) {
  if (e instanceof ServiceError) throw e;
  throw new ServiceError(MSG_LOAD, e);
}
```
**listAlerts core:** same select string as `getAlert` (line 73), `.eq('property_id', propertyId).order('triggered_at', {ascending:false}).limit(200)`, then one `fetchDemoOffset` and `shiftDemoRow(row, ['triggered_at'], offset, now)` per demo row (as lines 81-84), map to `AlertDetail`-like items (add `isDemo`, `sensorId`). Sort severity desc then `triggered_at` desc (copy `SEVERITY_RANK` and comparator from `src/services/home.ts` lines 74, 190-194).
**updateAlertStatus:** RESEARCH Pattern 2 (guard `.eq('status','novo')` for visualizado). Error message per UI-SPEC copy: "Não foi possível atualizar o alerta. Verifique sua internet e tente de novo." Follow `producers.ts` 43-49 style: `.select().single()` turns an RLS silent zero-row update into an error (not for the guarded visualizado case, where zero rows is fine).
**UUID guard:** `UUID_RE` line 7; apply to any id passed in.
**Evidence (reading) for S2:** extend `AlertDetail` with `readingValue`, `readingAt`, `unit`, `threshold`; fetch `readings` by `reading_id` (or `latest_readings`, see home.ts line 118) and `thresholds` (reuse `listThresholds`).

**Test analog:** `src/services/alerts.test.ts` lines 1-60: module-level `mockResults[table]` queue + chainable builder (`for (const m of ['select','order','limit','eq']) b[m] = () => b; b.maybeSingle = next;`). Extend the builder with `update`, `neq`, `in`, and a thenable for list queries; keep `jest.spyOn(Date,'now')` and fixed NOW.

---

### `src/services/thresholds.ts` (+ saveThresholds)

**Analog:** itself (lines 1-36) and `producers.ts` `updateProducerName` (30-62).
```typescript
const MSG_SAVE = 'Não foi possível salvar os limites. Verifique sua internet e tente de novo.';
export async function saveThresholds(propertyId: string, rows: {type: SensorType; min: number|null; max: number|null}[]) {
  try {
    const { error } = await supabase.from('thresholds').upsert(
      rows.map((r) => ({ property_id: propertyId, sensor_type: r.type, min_value: r.min, max_value: r.max })),
      { onConflict: 'property_id,sensor_type' });
    if (error) throw new ServiceError(MSG_SAVE, error);
  } catch (e) { if (e instanceof ServiceError) throw e; throw new ServiceError(MSG_SAVE, e); }
}
```
Reuse `ThresholdRow`/`num()` for reads. Always store Celsius.

### `src/services/notifications.ts`
**Analog:** `src/services/producers.ts` (getUser then table op, `ServiceError` messages). Functions: `getNotificationPrefs`, `saveNotificationPrefs`, `upsertPushToken(token, platform)` with `onConflict: 'token'`, `deletePushToken(token)`. Messages from UI-SPEC ("Não foi possível salvar a preferência. ...").

---

### Hooks

**`useAlerts.ts`** analog `src/hooks/useAlert.ts` (full file):
```typescript
const userId = useAuth().user?.id ?? null;
return useQuery({
  queryKey: ['alerts', userId, propertyId],
  queryFn: () => listAlerts(propertyId as string),
  enabled: !!userId && !!propertyId,
});
```
Refetch on focus; add `staleTime` like `useThresholds.ts` if needed.

**`usePendingAlertCount.ts`:** derive from `useAlerts` (or `useHomeOverview`) data via `countPending` (see filter.ts). Home currently uses `overview.alerts` limited to 100 (`home.ts` 123-132); to guarantee equal numbers either point both at the same query or have Início use `usePendingAlertCount`. `isPending` is `status === 'novo' || 'visualizado'` at `src/features/condition/deriveCondition.ts:19` (export/reuse it, do not redefine).

**`useUpdateAlertStatus.ts`** analog `src/hooks/useUpdateProducerName.ts` (inFlight ref guard + mutateAsync boolean result, lines 6-36) with invalidations like `useGenerateDemoData.ts` 18-25:
```typescript
onSuccess: async () => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['alerts'] }),
    queryClient.invalidateQueries({ queryKey: ['alert'] }),
    queryClient.invalidateQueries({ queryKey: ['home'] }),
  ]);
},
```
**`useSaveThresholds.ts`:** same; invalidate `['readings']` (thresholds key is `['readings','thresholds',userId,propertyId]`), `['home']`, `['alerts']`, `['alert']`, `['sensors']` (`useFarmSensors` key `['sensors', userId, propertyId]`).

**`useNotificationPrefs.ts`:** query key `['notifications','prefs',userId]`; optimistic switch + revert on error (use `useMutation` `onMutate/onError`).

---

### `src/features/alerts/filter.ts` (+ `filter.test.ts`) (utility, transform)

**Analog:** `src/features/condition/deriveCondition.ts` (pure, typed input, `isPending` helper line 19) and `deriveCondition.test.ts`. Export `countPending`, `filterAlerts({status:'pendentes'|'resolvidos'|'todos', category|null, severity|null})`, `sortAlerts`. Labels via `pendingAlertsLabel` from `src/lib/formatNumber.ts:13` (do not reimplement).

### `src/features/thresholds/validate.ts` (+test)

**Analog:** `src/features/profile/validateName.ts` (full file shape):
```typescript
export type NameValidation = { value: string; error: string | null };
export function validateFullName(input: string): NameValidation {
  const value = input.trim().replace(/\s+/g, ' ');
  if (value.length === 0) return { value, error: 'Informe seu nome.' };
  ...
  return { value, error: null };
}
```
and `src/features/farm/validate.ts` (per-field `errors` record, `valid`, `firstInvalid`, constants `*_MAX`). Return `{ valid, errors: Partial<Record<field,string>> , values }`; accept "," or "."; copy error strings from UI-SPEC "Perfil — Limites". Convert °F -> °C using existing helper (see `src/lib/format*.ts` `convertTemperature`/`formatTemperature`; confirm exports).

### `src/features/alerts/useAlertFilterStore.ts` (zustand, not persisted)
**Analog:** `src/stores/selectedFarm.ts` (zustand store shape) but WITHOUT `persist` (UI-SPEC U14). Fields: `status`, `category`, `severity`, `clear()`.

### `src/stores/preferences.ts`
Remove `NotificationKey/NotificationPrefs/notifications/setNotification` (lines 9-10, 15, 18, 21, 30, 33-34, 40, 44, 49-53); bump `version: 1` -> `2` and keep the validating `merge` (lines 42-55) for `theme`/`tempUnit` only so old persisted `notifications` is ignored. Update `preferences.test.ts` accordingly. `perfil.tsx` lines 30, 49-53, 77-79 depend on the removed API.

---

### `src/components/alerts/alertMeta.ts` (config)
**Analog:** itself. Pattern (lines 1-72): lucide imports, `Record<Enum, {label, icon...}>`, `getXLabel()` helpers.
```typescript
export const STATUS_META: Record<AlertStatus, StatusMeta> = {
  novo: { label: 'Novo', icon: CircleDot, badge: 'default' }, ...
};
export function getStatusLabel(status: AlertStatus): string { return STATUS_META[status].label; }
```
Add `CATEGORY_META: Record<AlertCategory, {label; icon; notificationDescription}>` and `getCategoryLabel`. Labels/descriptions verbatim from UI-SPEC Categories table. Verify lucide exports (`Thermometer, Sprout, Droplets, CloudRain, CloudLightning, WifiOff`).

### `src/components/alerts/AlertRow.tsx`
**Analog:** itself. Keep `useMemo(StyleSheet.create(...))` with `[colors,...]` deps (lines 31-56), `Pressable` with a11y label (59-63), `Badge` row (75-82). Add optional props `category, description, recommendation, variant = 'compact'`; `full` adds description (`variant="label"`, `numberOfLines={2}`), recommendation row (`ListChecks` 16 + "O que fazer: ..."), meta `"{categoria} · {área} · {relativo}"`. Compact output must remain byte-identical for Início. Existing subtitle logic line 29: `${areaName || 'Propriedade'} · ${formatRelative(triggeredAt, now)}`.

### `src/components/alerts/AlertFilters.tsx`
**Analogs:** `Tabs` use in `perfil.tsx` 228-234 / 305-311:
```tsx
<Tabs semantics="radio" accessibilityLabel="Tema" tabs={THEME_TABS} active={preference} onChange={(id) => setPreference(id as ThemePreference)} />
```
(use `semantics="tabs"` and label "Situação" here), `Select` (perfil 247-251: `options=[{value,label}]`, `value`, `onChange`), `Chip` from `src/components/ui/Chip.tsx` (read before use; `role="radio"`). Wrap chips in `flexWrap: 'wrap'` view with `accessibilityRole="radiogroup"`. Result line live region.

### `src/components/alerts/ReadingEvidence.tsx`
**Analog:** `Card` blocks in `alerta/[id].tsx` lines 99-120 (`Card` > `View style={styles.cardBody}` > `Text variant="body" weight="semibold"`; icon row `titleRow`). Value coloring via `colors.error` / `colors.warningText`; `Text numeric`; time via `formatDateTime` (`@/lib/formatTime`); decimals/units via `formatDecimal`/`formatTemperature` (`@/lib/formatNumber`).

### `src/components/profile/ThresholdsSection.tsx`
**Analog:** `perfil.tsx` name-edit block lines 176-205 (`Input` with `error`, `Button size="sm" loading loadingLabel="Salvando…"`, `Notice variant="error"|"success"`) and `SettingsSection` (line 239 usage) / `styles.box` (`padding: spacing.lg, gap: spacing.md`). Use `useSelectedFarm()` (perfil line 74) for the property, `useThresholds(farm?.id)` to prefill, `AsyncBoundary`-style Loading/Error states from line 159-163:
```tsx
{query.isLoading ? <LoadingState message="Carregando perfil…" /> : query.isError ? <ErrorState onRetry={() => void query.refetch()} retrying={query.isFetching} /> : ...}
```
Use local `useState` draft per field (pattern: `draft`/`savedOverride`, lines 82-93) and re-key the section on `farm.id` to discard edits.

### `src/components/profile/NotificationsSection.tsx`
**Analog:** `perfil.tsx` lines 266-299 (the block being replaced): `SettingsSection` with `footer` footnote (`Info` 16 + `Text variant="label" tone="muted"`) and `SettingsRow trailing="switch" switchValue onSwitchChange isLast`. Replace rows with master + 6 category rows from `CATEGORY_META`; rewrite footnote copy (UI-SPEC S5). Platform guard: `Platform.OS === 'web'` (already imported in perfil line 5); `Linking.openSettings()` (Linking imported line 5).

### `src/components/settings/SettingsRow.tsx`
Add `disabled?: boolean` prop to `SettingsRowProps` (lines 9-23); apply opacity 0.5, pass `disabled` to `Switch` and `accessibilityState`, skip `onPress`. Existing switch wrap `pointerEvents: 'none'` (line 59) means the row Pressable handles toggling; keep that.

### `src/components/layout/TabBar.tsx` (badge)
Replace the reserved lines 98-100:
```tsx
// Reserved for Phase 4 (unread alerts badge); intentionally not rendered yet.
const _badge = descriptors[route.key]?.options.tabBarBadge;
void _badge;
```
with a real `badge` render absolutely positioned inside the `pill` View (line 127-137; make `pill` `position: 'relative'`; `overflow` not hidden). Style via the `styles` useMemo (lines 40-90) using `colors.errorFill`, `colors.onPrimary`, `colors.card` ring, `radius.pill`. Update a11y label (line 121) to `Alertas, ${pendingAlertsLabel(n)}`. `tabBarBadge` type is `number|string|undefined`; compute "9+" in TabBar.

### `src/app/(app)/(tabs)/_layout.tsx`
Add `const count = usePendingAlertCount(property?.id)`; `<Tabs.Screen name="alertas" options={{ title: 'Alertas', tabBarBadge: count > 0 ? count : undefined }} />` (file lines 11-17). Get property via `useCurrentProperty` / `useSelectedFarm` (see `alertas.tsx` line 13).

### `src/app/(app)/(tabs)/alertas.tsx`
**Analog:** itself. Keep state ladder (lines 15-33): `property.isLoading -> LoadingState`, `isError -> ErrorState`, `!property.data -> EmptyState` (unchanged), else list. Replace the final stub `EmptyState` (line 32) with filters + list: `ScreenContainer` (drop `centered` when a farm exists), `Card padded={false}` with `AlertRow variant="full"` rows, `router.push({ pathname: '/alerta/[id]', params: { id } })`. `useNow()` for `now` (see `[id].tsx` line 26). Pull-to-refresh via `refreshing/onRefresh` props on `ScreenContainer` (verify support). Refetch on focus via `useFocusEffect` from `expo-router`.

### `src/app/(app)/(tabs)/perfil.tsx`
Remove `NOTIFICATION_ROWS`, `NotificationKey` import, `notifications` store usage (lines 30, 49-53, 77-79, 266-299); insert `<ThresholdsSection />` after Fazenda (line 264) and `<NotificationsSection />` in its place. Keep `sections` gap xl.

### `src/app/(app)/alerta/[id].tsx`
**Analog:** itself. Add: category `Badge variant="default" icon={CATEGORY_META[..].icon}` in badges row (line 71-78); `<ReadingEvidence>` card between header card (97) and "O que aconteceu" (99); action group replacing lines 122-130: primary "Marcar como resolvido" -> `ConfirmDialog` (pattern: perfil lines 357-368, `open/tone/title/message/confirmLabel/loading/loadingLabel/cancelLabel/onConfirm/onCancel`, tone `primary`), `Notice variant="success"`, secondary "Ver no Monitoramento" (`router.navigate('/monitoramento')`), ghost "Ver todos os alertas". Visualizado on open: `useEffect` with `useRef` guard when `alert?.status === 'novo'`. `goBack` (line 43): change `router.replace('/')` to `router.replace('/alertas')`. Existing `AsyncBoundary` wrapper (53-66) stays.

### `src/app/(app)/_layout.tsx` (push tap + foreground handler)
Add inside `AppLayout` after the producer guards; `Notifications.useLastNotificationResponse()` effect -> `router.push({ pathname: '/alerta/[id]', params: { id } })` after UUID-validating `data.alertId`. Hooks must stay above the early returns (lines 34-57) to obey rules of hooks. Call `Notifications.setNotificationHandler` once at module scope behind `Platform.OS !== 'web'`.

### `src/features/notifications/registerPush.ts` / `usePushRegistration.ts`
No in-repo analog. Copy RESEARCH Pattern 4 code (guard `Platform.OS === 'web' || !Device.isDevice`; Android channel `alertas` before permission; `projectId` from `Constants.expoConfig?.extra?.eas?.projectId`). Request permission only from the master switch tap. Constants import style: `import Constants from 'expo-constants';` (perfil line 1).

### `app.json`
Add `expo-notifications` plugin `{ color: <lightColors.primary>, defaultChannel: 'alertas' }` and `extra.eas.projectId` (human checkpoint). Only place a hex may appear outside tokens (UI-SPEC S6; `scripts/check-ui-rules.mjs`).

---

## Shared Patterns

### ServiceError wrap (all services)
**Source:** `src/services/alerts.ts` 98-101, `thresholds.ts` 32-35, `producers.ts` 58-61. pt-BR user message; original error as cause; rethrow `ServiceError` unchanged.

### Query keys scoped per user
**Source:** `src/hooks/useAlert.ts` 8-14, `useThresholds.ts`, `useHomeOverview.ts:11`, `useFarmSensors.ts:9`. `['x', userId, ...ids]`, `enabled: !!userId && !!id`. Invalidate by prefix (`['alerts']`, `['alert']`, `['home']`, `['readings']`, `['sensors']`).

### Mutation hook with in-flight guard
**Source:** `src/hooks/useUpdateProducerName.ts` 6-36 (returns `{ save, isSaving, errorMessage, reset }`, boolean result, never throws to the UI).

### Demo-time anchoring
**Source:** `src/services/alerts.ts` 50-63 + 81-84; `computeDemoOffset`/`shiftDemoRow` from `@/services/demoTime`. Required for every list/detail of `is_demo` alerts.

### Screen state ladder and UI primitives
**Source:** `alertas.tsx` 15-33, `perfil.tsx` 159-163; `AsyncBoundary`, `LoadingState`, `ErrorState`, `EmptyState`, `Notice`, `ConfirmDialog` from `@/components/ui/*`. Styles: `useMemo(() => StyleSheet.create({...}), [colors])` with tokens from `@/theme/tokens` (no hex/rgba; `scripts/check-ui-rules.mjs`). No `Alert.alert`/`window.confirm`.

### Pure feature logic + colocated tests
**Source:** `src/features/condition/deriveCondition.ts` (+`.test.ts`), `src/features/profile/validateName.ts` (+test), `src/features/farm/validate.ts` (+test). Jest (`jest-expo`), tests beside source.

### SQL security
**Source:** 007 lines 117, 122-128, 175; 002 lines 25-29, 55-56. `security definer set search_path = ''`, `revoke all ... from public, anon, authenticated`, owner check with `(select auth.uid())`, column-level `grant update (...)`.

### Offline definition constant
`SENSOR_OFFLINE_AFTER_MS` (2 h) in `src/lib/sensorStatus.ts`; seed used 3 h (004 line 267). Use 2 h in the new evaluator and in the new text.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `supabase/functions/push-alert/index.ts` | Edge Function | event-driven | No `supabase/functions` directory yet; use RESEARCH Pattern 5 |
| `src/features/notifications/registerPush.ts`, `src/hooks/usePushRegistration.ts` | utility/hook | request-response / event | expo-notifications not installed; use RESEARCH Pattern 4 |
| Notification tap/foreground handling in `(app)/_layout.tsx` | layout | event-driven | No existing event-listener integration; use RESEARCH Pattern 4 tap handling |

## Notes for Planner
- `.env.example` is deleted and `tsconfig.json` modified in the working tree (pre-existing, unrelated).
- `src/app/(app)/(tabs)/index.tsx:354` renders `pendingAlertsLabel(pendingAlerts.length)` from `overview.alerts` (limit 100 at `home.ts:131`); switch to the shared count (S7) so it equals the tab badge.
- DB trigger on `readings` must be statement-level; `generate_demo_dataset` (007 lines 150-170) deletes then reinserts per sensor, so evaluator must be idempotent.
- No sensor detail route exists; detail screen links to `/monitoramento` only.

## Metadata

**Analog search scope:** `src/services`, `src/hooks`, `src/features`, `src/components/{alerts,layout,settings,ui}`, `src/stores`, `src/app/(app)`, `supabase/migrations`
**Files scanned:** ~25 read in full or in part; ~150 listed
**Pattern extraction date:** 2026-11-15
