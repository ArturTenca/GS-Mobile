# Phase 2: Onboarding & Início - Pattern Map

**Mapped:** 2026-11-12
**Files analyzed:** 38 (new + modified)
**Analogs found:** 33 / 38 (5 pure-logic files have no analog; they follow RESEARCH.md contracts and `format.ts` + `format.test.ts` style)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `supabase/migrations/005_latest_readings.sql` (+ append to `supabase/setup_completo.sql`) | migration | request-response (read view) | `supabase/migrations/004_review_fixes.sql` | role-match |
| `src/types/database.ts` (modify) | model | n/a | itself (existing interfaces) | exact |
| `src/services/producers.ts` (modify: select `onboarding_completed_at`) | service | CRUD read | itself | exact |
| `src/services/onboarding.ts` | service | CRUD write | `src/services/properties.ts` | role-match |
| `src/services/home.ts` (`getHomeOverview`) | service | batch / request-response | `src/services/properties.ts` `getHomeSummary` | exact |
| `src/services/alerts.ts` (`getAlert`) | service | request-response | `src/services/properties.ts` `queryFirstProperty` | role-match |
| `src/services/demoTime.ts` | utility | transform | none (pure fn; style of `src/lib/format.ts`) | no analog |
| `src/services/demoTime.test.ts`, `home.test.ts`, `onboarding.test.ts` | test | n/a | `src/services/services.test.ts` | exact |
| `src/services/services.test.ts` (modify: producer shape, richer mock) | test | n/a | itself | exact |
| `src/lib/sensorStatus.ts` | utility | transform | `src/lib/format.ts` | partial |
| `src/lib/formatTime.ts`, `src/lib/formatNumber.ts` (+ tests) | utility | transform | `src/lib/format.ts` + `format.test.ts` | exact |
| `src/features/condition/deriveCondition.ts`, `selectMetric.ts`, `reasons.ts` (+ tests) | utility | transform | none (pure; style of `format.ts`) | no analog |
| `src/features/onboarding/validate.ts`, `ufs.ts` (+ test) | utility | transform | `src/lib/security/validate.ts` (not read; check before writing) + `format.test.ts` | partial |
| `src/hooks/useHomeOverview.ts`, `useAlert.ts` | hook | request-response | `src/hooks/useHomeSummary.ts` | exact |
| `src/hooks/useCompleteOnboarding.ts` | hook | CRUD write (mutation) | `useProducer.ts` (key shape) + RESEARCH hook example | partial |
| `src/hooks/useNow.ts` | hook | event-driven (interval) | none | no analog |
| `src/app/(app)/_layout.tsx` (modify: onboarding gate) | layout/route guard | request-response | `src/app/_layout.tsx` `Navigator` | exact |
| `src/app/(app)/onboarding.tsx` | component (screen) | CRUD write | `src/app/(app)/(tabs)/perfil.tsx` (Modal logout, ScreenHeader/Container) | role-match |
| `src/app/(app)/(tabs)/index.tsx` (rewrite) | component (screen) | request-response | itself (Phase 1 Início) | exact |
| `src/app/(app)/alerta/[id].tsx` | component (screen) | request-response | `src/app/(app)/(tabs)/index.tsx` | role-match |
| `src/app/(app)/(tabs)/_layout.tsx` (modify: `initialRouteName` -> `anchor`) | config | n/a | itself | exact |
| `src/components/home/ConditionHero.tsx`, `ClimateCard.tsx` | component | request-response | `src/components/ui/MetricTile.tsx` + `Badge.tsx` | role-match |
| `src/components/alerts/AlertRow.tsx` | component | request-response | `src/components/ui/ListRow.tsx` (not read) + `Card.tsx` Pressable | role-match |
| `src/components/ui/MetricTile.tsx` (modify) | component | n/a | itself | exact |
| `src/components/ui/Card.tsx` (modify: `padded?`) | component | n/a | itself | exact |
| `src/components/layout/ScreenContainer.tsx` (modify: refresh) | component | n/a | itself | exact |
| `src/components/layout/ScreenHeader.tsx` (modify: `onBack`) | component | n/a | itself | exact |
| `src/theme/tokens.ts` (modify: `display` typography) | config | n/a | itself | exact |

## Pattern Assignments

### `src/services/home.ts` (service, batch)

**Analog:** `src/services/properties.ts` (`getHomeSummary`, lines 34-64)

**Imports + message constants** (lines 1-6):
```typescript
import { supabase } from '@/lib/supabase';
import { ServiceError } from '@/services/ServiceError';
import type { HomeSummary, Property } from '@/types/database';

const MSG_LOAD = 'Não foi possível carregar a propriedade.';
```

**Core pattern: parallel queries, check each `.error`, rethrow ServiceError, wrap unknown** (lines 34-64):
```typescript
export async function getHomeSummary(): Promise<HomeSummary | null> {
  try {
    const property = await getCurrentProperty();
    if (!property) return null;

    const [sensors, alerts] = await Promise.all([
      supabase.from('sensors').select('id', { count: 'exact', head: true }).eq('property_id', property.id),
      supabase.from('alerts').select('id', { count: 'exact', head: true })
        .eq('property_id', property.id).neq('status', 'resolvido'),
    ]);
    if (sensors.error) throw new ServiceError(MSG_LOAD, sensors.error);
    if (alerts.error) throw new ServiceError(MSG_LOAD, alerts.error);
    return { /* plain camelCase object */ };
  } catch (e) {
    if (e instanceof ServiceError) throw e;
    throw new ServiceError(MSG_LOAD, e);
  }
}
```
Rules to copy: friendly PT-BR message, raw error only in `cause`, no `supabase` import outside `src/services/*` (ESLint). Cast rows (`data as Property | null`). Climate failure must NOT reject the whole call (return `climate: { error: true }`), per RESEARCH Pattern 3. Query shapes are in RESEARCH lines 186-196. `getHomeSummary` stays (still used by existing `useHomeSummary`); keep its test green.

---

### `src/services/onboarding.ts` (service, CRUD write)

**Analog:** `src/services/properties.ts` (error handling) + `src/services/producers.ts` (auth user lookup, lines 7-24)

**Auth + ServiceError wrap** (producers.ts 9-23):
```typescript
const { data: auth, error: authError } = await supabase.auth.getUser();
if (authError || !auth.user) throw new ServiceError(MSG, authError);
...
} catch (e) {
  if (e instanceof ServiceError) throw e;
  throw new ServiceError(MSG, e);
}
```
Copy the body of `completeOnboarding` from RESEARCH.md lines 400-415 (update property -> find-or-update-or-insert single non-demo area -> set `onboarding_completed_at` last; each write chained `.select('id')` and zero rows = failure). Wrap in the same try/catch. Message from UI-SPEC: "Não foi possível salvar. Verifique sua internet e toque em Concluir configuração de novo." Omit `is_demo` in the insert (RLS `areas_insert` requires `is_demo = false`, 004 lines 26-27).

---

### `src/services/producers.ts` (modify)

Current select/return (lines 12-19):
```typescript
.select('id, full_name')
...
return { id: data.id as string, fullName: data.full_name as string };
```
Change to `.select('id, full_name, onboarding_completed_at')` and return `onboardingCompletedAt: (data.onboarding_completed_at as string | null) ?? null`. Extend `ProducerProfile` in `types/database.ts` (lines 66-69). Update the existing `getProducer` `toEqual` test (services.test.ts line 126).

---

### `src/services/alerts.ts` (`getAlert`)

**Analog:** `queryFirstProperty` (properties.ts 8-17): `.maybeSingle()`, `if (error) throw new ServiceError(...)`, `return (data as X | null) ?? null`. Validate UUID shape first and return `null` (not found) for invalid ids (RESEARCH pitfall 9). Not-found = `null`, not an error. Apply `fetchDemoOffset` + `shiftDemoRow` from `demoTime.ts` for `triggered_at`.

---

### Service tests: `src/services/*.test.ts`

**Analog:** `src/services/services.test.ts` (lines 1-38 mock infra; 40-120 style)

**Mock builder (to extend, lines 5-30):**
```typescript
type Result = { data?: unknown; error?: unknown; count?: number | null };
const mockResults: Record<string, Result[]> = {};
const mockRpc = jest.fn();
const mockGetUser = jest.fn();

function mockBuilder(table: string) {
  const b: Record<string, unknown> = {};
  const next = (): Promise<Result> => {
    const r = mockResults[table]?.shift() ?? { data: null, error: null };
    if (r.error === 'throw') return Promise.reject(new Error('network'));
    return Promise.resolve(r);
  };
  for (const m of ['select', 'order', 'limit', 'neq', 'eq']) b[m] = () => b;
  b.maybeSingle = next;
  b.then = (res, rej) => next().then(res, rej);
  return b;
}
jest.mock('@/lib/supabase', () => ({
  supabase: { from: (t: string) => mockBuilder(t), rpc: (...a: unknown[]) => mockRpc(...a), auth: { getUser: () => mockGetUser() } },
}));
beforeEach(() => { for (const k of Object.keys(mockResults)) delete mockResults[k]; mockRpc.mockReset(); mockGetUser.mockReset(); });
```
Extension needed: add `'insert','update','in','gte','single'` to the chainable list and `single` to the terminal list (`b.single = next`). Results are consumed FIFO per table, so for parallel `Promise.all` queries on the SAME table queue results in call order. The view is mocked as table `'latest_readings'`. Keep the friendly-error assertion style (lines 67-75):
```typescript
const err = await getCurrentProperty().catch((e) => e);
expect(err).toBeInstanceOf(ServiceError);
expect(err.message).not.toContain('secret');
expect(err.cause).toBe(raw);
```
Best option: put the richer builder in a shared `src/services/testUtils.ts` or duplicate in the new test files (jest.mock factories cannot import out-of-scope vars; only `mock*`-prefixed names are allowed, as already done here).

---

### `src/hooks/useHomeOverview.ts`, `useAlert.ts`

**Analog:** `src/hooks/useHomeSummary.ts` (entire file, lines 1-14)
```typescript
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/AuthProvider';
import { getHomeSummary } from '@/services/properties';

export function useHomeSummary() {
  const userId = useAuth().user?.id ?? null;
  // Keys are scoped per user so a session swap can never render another owner's cache.
  return useQuery({ queryKey: ['home-summary', userId], queryFn: getHomeSummary, enabled: !!userId });
}
```
New keys: `['home', 'overview', userId, propertyId]` (add `enabled: !!userId && !!propertyId`, queryFn closes over `propertyId`) and `['alert', userId, id]`. Keep the user-scope comment. `useCompleteOnboarding`: `useMutation` + `setQueryData(['producer', userId], ...)` + invalidate `['property']`, `['home']`, `['home-summary']` (RESEARCH 421-427). `useProducer.ts` key is `['producer', userId]`; `useCurrentProperty.ts` key is `['property', 'current', userId]`.

---

### `src/app/(app)/_layout.tsx` (modify: onboarding gate)

**Analog:** `src/app/_layout.tsx` `Navigator` (lines 19-51): loading branch before the Stack, then `Stack.Protected` pairs.

**Loading full-screen pattern** (lines 23-37):
```tsx
const styles = useMemo(() => StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
}), [colors]);
if (loading) return (<View style={styles.loading}><LoadingState /></View>);
```
**Guard pattern** (lines 40-49):
```tsx
<Stack screenOptions={{ headerShown: false }}>
  <Stack.Protected guard={!!session}><Stack.Screen name="(app)" /></Stack.Protected>
  <Stack.Protected guard={!session}><Stack.Screen name="(auth)" /></Stack.Protected>
  <Stack.Screen name="reset-password" />
</Stack>
```
Current `(app)/_layout.tsx` (9 lines) is just `<Stack screenOptions={{ headerShown: false }}><Stack.Screen name="(tabs)" /></Stack>`. Replace per RESEARCH Pattern 1 (lines 148-165): hooks first (`useProducer`, `useTheme`), loading/error branch, then two `Stack.Protected` groups with `redirectTo` (`"/"` and `"/onboarding"`). Error branch: `ErrorState` + ghost "Sair da conta" (uses `signOut` from `useAuth`, see perfil.tsx 50-59). Do not add `unstable_settings.anchor` here. Group name `(tabs)` and `alerta/[id]` go in the non-onboarding group.

---

### `src/app/(app)/(tabs)/index.tsx` (rewrite)

**Analog:** itself (Phase 1 Início, lines 17-70)

**Imports / screen frame / AsyncBoundary usage** (lines 1-40):
```tsx
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
...
const query = useHomeSummary();
return (<>
  <ScreenHeader brand />
  <ScreenContainer>
    <AsyncBoundary query={query} isEmpty={!summary} loadingMessage="Preparando sua propriedade…"
      empty={<EmptyState icon={Sprout} title="Sua propriedade ainda não está pronta"
        description="Estamos preparando sua propriedade de demonstração. Toque em tentar novamente."
        actionLabel="Tentar novamente" onAction={() => void query.refetch()} />}>
```
Reuse as-is: greeting `Text variant="heading" weight="semibold" accessibilityRole="header"` with `firstName(user?.user_metadata?.name)`; `router.navigate('/alertas')` for tab navigation (-> also `'/monitoramento'`); `StyleSheet.create({ greeting: { gap: spacing.xs } })` using `spacing` tokens. Changes: pass `AsyncBoundary` `{ ...query, isError: query.isError && !query.data }` and show refresh-failed `Notice` when `isError && data` (RESEARCH anti-pattern 1); `ScreenContainer refreshing/onRefresh` with local `refreshing` state (RESEARCH 384). Compose `useCurrentProperty()` -> `useHomeOverview(property.id)` -> `deriveCondition({ ...overview, now: overview.asOf })`.

---

### `src/app/(app)/alerta/[id].tsx`

**Analog:** same Início screen frame (`ScreenHeader` + `ScreenContainer` + `AsyncBoundary` with `EmptyState`). Read param with `useLocalSearchParams<{ id: string }>()`. Back: `onBack = () => (router.canGoBack() ? router.back() : router.replace('/'))`. Use `Card variant="important"` (Card.tsx line 8) for the header block, plain `Card` for the other two. `AsyncBoundary isEmpty={!alert}` with `EmptyState icon={BellOff}` for not found. Navigate to it with `router.push({ pathname: '/alerta/[id]', params: { id } })`.

---

### `src/app/(app)/onboarding.tsx`

**Analog:** `src/app/(app)/(tabs)/perfil.tsx`

**Logout Modal flow to copy** (lines 50-59, 107-117):
```tsx
async function handleSignOut() {
  setSigningOut(true);
  try { await signOut(); queryClient.clear(); } finally { setSigningOut(false); setConfirmOpen(false); }
}
<Modal open={confirmOpen} title="Sair da conta?" onClose={() => (signingOut ? undefined : setConfirmOpen(false))}>
  <Text variant="label" tone="muted">Você vai precisar entrar de novo com e-mail e senha.</Text>
  <Button variant="danger" fullWidth loading={signingOut} loadingLabel="Saindo…" onPress={() => void handleSignOut()}>Sair da conta</Button>
  <Button variant="secondary" fullWidth disabled={signingOut} onPress={() => setConfirmOpen(false)}>Continuar conectado</Button>
</Modal>
```
Theme-dependent styles: `const { colors } = useTheme(); const styles = useMemo(() => StyleSheet.create({...}), [colors]);` (perfil 30-48). Form components: `Input` props `{ label, error, helper, ...TextInputProps }` (Input.tsx 11-18; `label` is also the a11y label); `Select` props `{ label, options: {value,label}[], value, onChange, error, placeholder, disabled }` (Select.tsx 9-19); `Button` props seen: `variant` (`primary|secondary|ghost|danger`), `size`, `fullWidth`, `icon`, `loading`, `loadingLabel`, `disabled`. Card header row with icon: icon 20 + 8 gap + Body semibold. Wrap `ScreenContainer` in `KeyboardAvoidingView behavior="padding"` on iOS only. Prefill from `useCurrentProperty()`; do not prefill Ibiúna/SP. Validation in `features/onboarding/validate.ts` (trim, limits, UF whitelist, first invalid key).

---

### `src/components/ui/MetricTile.tsx` (modify)

Current props (lines 17-24): `{ label, value, unit?, status?: 'normal'|'atencao'|'critico', icon?, onPress? }`; `icon` is declared but NOT rendered, and `status` map is local `STATUS` (lines 11-15) using `Badge`. Value is `Text variant="body" weight="semibold" numeric` (line 36) -> change to `heading`. Add `context?: string` and `status: 'semDados'` (Badge `default`, `WifiOff`, "Sem dados"). Both branches wrap in `Card` (pressable via `Card onPress`, else `View accessible`). A11y label format (line 28) -> `"{label}: {value} {unit}, {mark}, {context}"`. Valid `Badge` variants: `default|primary|success|warning|alert|error` with optional `icon` (LucideIcon) (Badge.tsx 12-19).

---

### `src/components/ui/Card.tsx` (modify)

Add `padded?: boolean` (default true): in the `useMemo` style at line 23 `padding: spacing.lg` -> `padding: padded ? spacing.lg : 0`, add `padded` to deps (line 27). Pressed style at line 36: `{ backgroundColor: colors.background }`; mirror this for `AlertRow`.

---

### `src/components/layout/ScreenContainer.tsx` (modify)

Wrap `ScrollView` props (lines 33-36). Add `RefreshControl` only when `onRefresh && Platform.OS !== 'web'` (RESEARCH 378-382); `colors` already available from `useTheme()` (line 14).

---

### `src/components/layout/ScreenHeader.tsx` (modify)

Row is `height: 56, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center'` (lines 26-33). Add optional `onBack` rendering a 48x48 `Pressable` before the title (use `touch.min` token from tokens.ts line 102), `accessibilityRole="button"`, `accessibilityLabel="Voltar"`. This file uses a static `StyleSheet` (no `useTheme`); the pressed bg needs `useTheme` -> switch to `useMemo`/inline pattern as in Card.tsx.

---

### `src/theme/tokens.ts` (modify)

Add to `typography` (lines 109-114): `display: { fontSize: 28, lineHeight: 36 },`. `TypographyVariant` is derived (`keyof typeof typography`), so `Text variant="display"` works. `tokens.test.ts` exists; check it for any exhaustive-key assertion before changing.

---

### `src/components/home/ConditionHero.tsx` / `ClimateCard.tsx` / `src/components/alerts/AlertRow.tsx`

**Analog:** `MetricTile.tsx` (status map -> variant + icon, `useTheme` + `useMemo(StyleSheet.create)` for colors) and `Badge.tsx` `STATUS_MAP` (lines 66-72):
```typescript
const STATUS_MAP: Record<Status, { label: string; variant: BadgeVariant; icon: LucideIcon }> = {
  normal: { label: 'Normal', variant: 'success', icon: CircleCheck },
  atencao: { label: 'Atenção', variant: 'warning', icon: TriangleAlert },
  critico: { label: 'Crítico', variant: 'error', icon: OctagonAlert },
};
```
`Status` type is exported from `Badge.tsx` (line 66): reuse it for `deriveCondition` output. Hero uses color tokens `successSoft/success/successText`, `warningSoft/warning/warningText`, `errorSoft/error` (tokens.ts 18-30) via `useTheme().colors`; never hex. `Text` props in use: `variant`, `weight="semibold"`, `tone="muted"|"error"`, `numeric`, `accessibilityRole`, `style`.

---

### `supabase/migrations/005_latest_readings.sql`

**Analog:** `supabase/migrations/004_review_fixes.sql`

**Header convention (lines 1-8, ASCII-only Portuguese, no accents in comments):**
```sql
-- AgroAlerta - 004: correcoes da revisao de codigo da fase 01
-- Depende de: 001, 002, 003
--
-- IMPORTANTE (projetos que ja rodaram 001..003):
--   Este arquivo NAO e aplicado sozinho. Abra o SQL Editor do Supabase,
--   cole todo o conteudo deste arquivo e clique em Run.
--   E seguro rodar mais de uma vez (drop policy if exists / create or replace).
-- Projetos novos: basta colar supabase/setup_completo.sql (ja inclui esta 004).
```
**Grant/revoke convention** (lines 34-35, 76, 135, 306): `revoke update on ... from authenticated; grant update (cols) on ... to authenticated;`, `revoke all on function ... from public, anon;`, idempotency via `create or replace` / `drop ... if exists`. Body: use SQL from RESEARCH lines 281-294 (`create or replace view ... with (security_invoker = true)`, `revoke all ... from public, anon; grant select ... to authenticated;`). Update `supabase/setup_completo.sql` header ("generated from 001..004") and append 005. Confirm PG >= 15 before running (assumption A3). Plan needs a `checkpoint:human-action` for running it. Demo seed facts (004 lines 160-177): property `'Minha Propriedade','Ibiúna','SP'`; 3 areas; 6 sensors; thresholds temp 10-32, air 30-85, soil 25-80; Pomar temp `stop_h = 52`; climate `observed_at = now()`; rain alert `now() - 30 minutes`; readings end at `date_trunc('hour', now())`.

---

### `src/lib/formatTime.ts`, `formatNumber.ts`, tests

**Analog:** `src/lib/format.ts` (pure, no imports, small exported functions with a module constant) and `src/lib/format.test.ts` (`describe` per function, `it` per case, `expect(...).toBe`).
```typescript
const FALLBACK_NAME = 'produtor(a)';
export function formatSensorsLine(sensors: number, pendingAlerts: number): string {
  const s = sensors === 1 ? 'sensor' : 'sensores';
  const a = pendingAlerts === 1 ? 'alerta pendente' : 'alertas pendentes';
  return `${sensors} ${s} · ${pendingAlerts} ${a}`;
}
```
Follow the same singular/plural inline style for "1 sensor ativo"/"{n} sensores ativos", "1 alerta pendente", "+1 outro ponto de atenção". `formatSensorsLine` is still used only by the old Início; keep it or remove with its test. Tests inject `now`; build dates with `new Date(y, m, d, h, mi)` (timezone-safe).

---

## Shared Patterns

### Service error handling
**Source:** `src/services/ServiceError.ts` + `properties.ts` lines 28-31
**Apply to:** `home.ts`, `onboarding.ts`, `alerts.ts`, modified `producers.ts`
```typescript
export class ServiceError extends Error {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) { super(message); this.name = 'ServiceError'; this.cause = cause; }
}
// usage
} catch (e) { if (e instanceof ServiceError) throw e; throw new ServiceError(MSG, e); }
```

### User-scoped query keys
**Source:** `src/hooks/useProducer.ts` lines 6-14
**Apply to:** all new hooks. Key always includes `userId`; `enabled: !!userId`.

### Route guard with Stack.Protected
**Source:** `src/app/_layout.tsx` lines 39-50
**Apply to:** `(app)/_layout.tsx` onboarding gate. `useAuth()` from `@/features/auth/AuthProvider`; providers (`QueryClientProvider`, `AuthProvider`) already wrap the navigator (lines 64-80), so `useProducer` is safe inside `(app)/_layout`.

### Screen frame and async states
**Source:** `src/app/(app)/(tabs)/index.tsx` lines 23-40, `AsyncBoundary.tsx` lines 15-22
**Apply to:** Início, alert detail, onboarding. Loading/error/empty/content handled by `AsyncBoundary`; note it hides content when `query.isError` even with data (adjust per RESEARCH).

### Styling rules
**Source:** `perfil.tsx` lines 30-48 and `tokens.ts`
**Apply to:** all components. `StyleSheet.create` only, colors via `useTheme().colors` inside `useMemo`, spacing via `spacing.*`, targets via `touch.min`; no hex outside `tokens.ts`, no `fontWeight`/`className` (`scripts/check-ui-rules.mjs`). Import alias `@/` everywhere. Icons from `lucide-react-native`. Copy in PT-BR.

### Supabase access boundary
No `supabase.from` or `@/lib/supabase` import in screens, hooks or components (ESLint `no-restricted-imports`); only `src/services/*`. `perfil.tsx` uses `queryClient` from `@/lib/queryClient` for `clear()` on sign-out.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/services/demoTime.ts` | utility | transform | No time/offset helpers exist; use RESEARCH lines 305-322 |
| `src/features/condition/deriveCondition.ts`, `selectMetric.ts`, `reasons.ts` | utility | transform | No domain logic yet; follow RESEARCH lines 328-372 (19-case test matrix) |
| `src/lib/sensorStatus.ts` | utility | transform | Follow RESEARCH lines 330-334 |
| `src/hooks/useNow.ts` | hook | event-driven | No interval hooks; simple `useState` + `setInterval` with cleanup |
| `src/features/onboarding/ufs.ts` | utility | static data | Static 27-UF list sorted by name |

(For `validate.ts`, `src/lib/security/validate.ts` and `limits.ts` exist and may hold reusable length/sanitize helpers; the planner should have the executor read them before writing new validation.)

## Other conventions and gotchas for the planner

- `src/app/(app)/(tabs)/_layout.tsx` line 5: `export const unstable_settings = { initialRouteName: 'index' };` -> change key to `anchor` (RESEARCH line 170).
- Tab navigation uses `router.navigate('/alertas')` (index.tsx line 59); tabs are `index, monitoramento, alertas, analises, perfil`.
- Existing types in `src/types/database.ts` already include `Producer.onboarding_completed_at`, `Sensor`, `Alert`; add `Threshold`, `Reading` (latest), `ClimateSnapshot`, `PlantingArea`, and extend `ProducerProfile` with `onboardingCompletedAt: string | null`.
- `AlertCategory` already includes `sensor_offline`, `heavy_rain`, `unfavorable_weather` (database.ts 4-10), needed for the dedup rules.
- Tests run with `npx jest` (jest-expo); static checks: `npm run typecheck`, `npm run lint`, `node scripts/check-ui-rules.mjs`.
- Not read in this mapping (read before editing): `ListRow.tsx`, `Button.tsx`, `Notice.tsx`, `EmptyState.tsx`, `Text.tsx`, `Modal.tsx`, `src/lib/security/*`, `002_rls.sql`.

## Metadata

**Analog search scope:** `src/**`, `supabase/migrations/**`
**Files scanned:** ~65 listed, 27 read in full or in part
**Pattern extraction date:** 2026-11-12
