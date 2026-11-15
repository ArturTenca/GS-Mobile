# Architecture Research

**Domain:** Expo/RN/Web farm monitor + Supabase IoT seed
**Researched:** 2026-11-11
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Expo app (iOS / Android / Web) — PT-BR, 5 tabs             │
│  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌─────────┐ ┌───────┐ │
│  │ Início  │ │ Monitor. │ │Alertas │ │Análises │ │Perfil │ │
│  └────┬────┘ └────┬─────┘ └───┬────┘ └────┬────┘ └───┬───┘ │
│       └───────────┴───────────┴───────────┴──────────┘     │
│                         UI kit + theme                      │
├─────────────────────────────────────────────────────────────┤
│  Hooks (React Query)     Zustand (property, filters)        │
│  services/  ← ONLY place that calls Supabase                │
├─────────────────────────────────────────────────────────────┤
│  Supabase                                                   │
│  Auth │ Postgres+RLS │ Storage (unused v1) │ Edge Functions │
│       │ seed farm    │                     │ send-push      │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Auth group (`app/(auth)`) | Login, signup, recovery | Expo Router stack; supabase.auth |
| Onboarding | First property + area | Flag `profiles.onboarding_completed_at` |
| Tabs group (`app/(app)/(tabs)`) | Five sections | Custom tab bar |
| Stacks (sensor/[id], history, area forms) | Drill-in | Nested stacks inside tabs |
| UI kit | Card, StatusPill, SensorCard, EmptyState, DemoBanner | `src/components/ui` |
| Domain services | properties, sensors, readings, alerts, analyses, devices | `src/services` |
| Query hooks | cache, retry, invalidation | `src/hooks` |
| Theme | Colors, type, spacing, 48dp targets | `src/theme` |
| Postgres | Source of truth | migrations + seed.sql |
| Edge `send-push` | Alert INSERT → Expo Push | service role; never in the client |
| `is_demo` | Trust boundary | Column + banner on every demo surface |

## Recommended Project Structure

```
src/
├── app/                    # Expo Router (or project root app/)
│   ├── (auth)/             # login, signup, recover
│   ├── (onboarding)/       # short setup
│   └── (app)/
│       ├── (tabs)/
│       │   ├── index.tsx           # Início
│       │   ├── monitoramento.tsx
│       │   ├── alertas.tsx
│       │   ├── analises.tsx
│       │   └── perfil.tsx
│       └── monitoramento/
│           ├── [sensorId].tsx
│           ├── historico.tsx
│           └── dispositivos.tsx
├── components/
│   ├── ui/                 # Button, Card, Text, StatusPill, Banner
│   └── farm/               # SensorCard, AlertRow, RiskCard, ConditionHero
├── services/               # Supabase repositories (no UI imports)
├── hooks/
├── theme/
├── types/
└── lib/
    ├── supabase.ts
    └── queryClient.ts
supabase/
├── migrations/
├── seed.sql
└── functions/send-push/
```

### Structure Rationale

- **`app/`:** Router owns navigation; five tabs match the product IA.
- **`services/`:** Swap seed Supabase for ESP32 ingest later without rewriting screens.
- **`components/farm` vs `ui`:** Keep agri widgets from becoming a junk drawer.
- **`supabase/`:** Schema and seed versioned with the app so demo consistency is reviewable.

## Architectural Patterns

### Pattern 1: Repository per aggregate

**What:** Screens never call `supabase.from`. Services return typed DTOs (`Sensor`, `Alert`).
**When to use:** Always in this project (ESP32/ML later).
**Trade-offs:** Extra files; prevents leaky PostgREST in UI.

**Example:**
```typescript
export async function listSensors(propertyId: string): Promise<Sensor[]> {
  const { data, error } = await supabase
    .from('sensors')
    .select('*, latest:readings(*)')
    .eq('property_id', propertyId);
  if (error) throw error;
  return data.map(toSensor);
}
```

### Pattern 2: Derived farm condition

**What:** `Normal | Atenção | Crítico` is computed from latest readings vs thresholds and open alerts — not a stored vanity field (except a cache column updated by trigger if needed).
**When to use:** Home hero.
**Trade-offs:** Must keep seed + settings in sync; one function `deriveCondition()`.

### Pattern 3: Demo as data, not as a UI mock

**What:** Every reading/alert/analysis row has `is_demo boolean default true` in v1. UI shows `DemoBanner` when any visible row is demo.
**When to use:** Trust + future real devices mixed on the same farm.
**Trade-offs:** Slightly noisier schema; avoids a second fake API.

## Data Flow

### Request Flow

```
User opens Início
    ↓
usePropertyDashboard(propertyId)
    ↓
services.dashboard.getSnapshot()
    ↓
Supabase: property + latest readings + open alerts + thresholds
    ↓
deriveCondition() + map DTOs
    ↓
Hero + indicator cards + recent alerts
```

### State Management

```
React Query cache  — server entities
Zustand            — selectedPropertyId, chartRange, alertFilters
Auth session       — supabase-js + expo-sqlite
```

### Key Data Flows

1. **Signup → onboarding → seed link:** Create profile; create property; attach or copy demo farm sensors/readings for that user (prefer per-user clone of seed so edits don’t smash a global farm).
2. **Threshold change:** Update `alert_thresholds`; recompute displayed condition; optionally spawn demo alerts if seed job runs.
3. **Alert insert:** DB webhook → Edge Function → Expo Push; client invalidates `alerts` query on foreground.
4. **Add sensor:** Insert `sensors` row (demo, offline until readings exist).
5. **Charts:** `readings` queried by `sensor_id` + time bucket; min/max/avg in SQL.

## Schema sketch (v1)

- `profiles` (id=auth.uid, full_name, onboarding_completed_at)
- `properties` (id, owner_id, name, location_text, created_at) — extra farms allowed later
- `planting_areas` (id, property_id, name, crop_type)
- `sensors` (id, property_id, area_id null, name, type enum, unit, status, is_demo)
- `readings` (id, sensor_id, value, recorded_at, is_demo)
- `alert_thresholds` (property_id, temp_min/max, air_humidity_min/max, soil_moisture_min/max)
- `alerts` (id, property_id, sensor_id null, category, severity, title, body, recommendation, status, created_at, is_demo)
- `risk_analyses` (id, property_id, kind, level, explanation, recommendation, inputs jsonb, is_demo, computed_at)
- `push_tokens` (token PK, user_id, platform, updated_at)
- `climate_snapshots` (property_id, temperature, humidity, summary, is_demo, captured_at)

RLS: owner via `properties.owner_id = auth.uid()` (join policies). Service role only in Edge Functions.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–1k users (v1) | One Supabase project, polling, seed clone on signup |
| 1k–100k | Index `(sensor_id, recorded_at desc)`; downsample history; queue push |
| 100k+ | Time-series store / rollups; ingest from ESP32 via separate pipeline |

### Scaling Priorities

1. **First bottleneck:** Unbounded `readings` history per chart query — always range + limit.
2. **Second bottleneck:** Fan-out push on noisy alerts — debounce / severity gate in the function.

## Anti-Patterns

### Anti-Pattern 1: Screens talking to Supabase

**What people do:** `supabase.from('readings')` in each screen with different filters.
**Why it's wrong:** Home and Alertas disagree; ESP32 swap rewrites the app.
**Do this instead:** Services + shared mappers.

### Anti-Pattern 2: One global demo farm for all users

**What people do:** Everyone reads property_id=seed.
**Why it's wrong:** RLS nightmare; one user marking alerts resolved affects others.
**Do this instead:** Clone seed per user on signup (SQL function `clone_demo_farm(uid)`).

### Anti-Pattern 3: Storing “Crítico” as the only status

**What people do:** Manual enum on property.
**Why it's wrong:** Divorced from sensors/thresholds.
**Do this instead:** Derive from data; tests on `deriveCondition`.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase Auth | supabase-js | PT-BR email templates in dashboard |
| PostgREST | repositories | RLS on day one |
| Expo Push | Edge Function on alerts INSERT | Web/sim: skip token; still show in-app |
| Future ESP32 | Insert into `readings` with `is_demo=false` | Same tables |
| Future weather | Fill `climate_snapshots` | Home already reads that table |
| Future ML | Replace `risk_analyses` writer | UI already consumes rows |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| UI ↔ services | async functions + DTOs | No Supabase types in visual components |
| Query hooks ↔ services | React Query queryFn | Keys: `['sensors', propertyId]` |
| DB ↔ push | webhook → function | Client never sends the push itself |

## Suggested build order

1. Expo app shell, theme, tab bar, design tokens, empty states
2. Supabase project, schema, RLS, clone_demo_farm, seed
3. Auth + onboarding
4. Services + Início (core value)
5. Monitoramento + sensor detail + charts
6. Alertas + thresholds + push
7. Análises + Histórico
8. Property/areas/devices CRUD + perfil

## Sources

- Expo Router + SDK 58 docs (HIGH)
- Expo using Supabase (HIGH)
- Supabase Expo push example (HIGH)
- PROJECT.md constraints (HIGH)

---
*Architecture research for: mobile agri-IoT monitoring*
*Researched: 2026-11-11*
