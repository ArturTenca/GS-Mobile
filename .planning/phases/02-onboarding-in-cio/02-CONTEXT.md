# Phase 2: Onboarding & Início - Context

**Gathered:** 2026-11-12
**Status:** Ready for planning

<domain>
## Phase Boundary

A new producer finishes a short first-run setup (property name, city/state, first planting area with crop) and lands on Início. Início answers within seconds "is my property Normal, Atenção or Crítico — and what should I do?" and shows greeting, property, climate snapshot, temperature / air humidity / soil moisture with normal/abnormal marks, active sensor count, pending alert count, last update with pull-to-refresh, recent alerts (tap → alert detail) and an indicators section linking to Monitoramento.

Requirements: ONB-01, ONB-02, HOME-01..HOME-08.
Not in this phase: Alertas center/filters/mark read-resolved (Phase 4), thresholds editing (Phase 4), Monitoramento sensor list/detail (Phase 3), Análises (Phase 5).

</domain>

<decisions>
## Implementation Decisions

### Regra "Condição da propriedade" (HOME-02) — discussed
- **D-01:** **Crítico** = there is at least one alert with `severity = 'critical'` and status `novo` or `visualizado` (not `resolvido`). Readings alone never make it Crítico.
- **D-02:** **Atenção** (when not Crítico) = ANY of: an unresolved alert with `severity = 'warning'` **or `'info'`** (user chose: info alerts also count); a sensor's latest reading outside the property's configured threshold range (`thresholds.min_value`/`max_value` for that `sensor_type`); a sensor offline.
- **D-03:** **Normal** = none of the above.
- **D-04:** `visualizado` alerts keep counting until `resolvido` (seeing an alert does not fix the problem). Status changes themselves arrive in Phase 4; Phase 2 only reads status.
- **D-05:** **Offline** = sensor's latest reading (or `last_seen_at`) older than **2 hours** relative to "now" (after the demo time anchoring in D-08). Single constant, e.g. `SENSOR_OFFLINE_AFTER_MS = 2h`, shared with Phase 3.
- **D-06:** Explanation on Início = **main reason + action**: the most severe reason first (critical alert → warning/info alert → out-of-range reading → offline sensor), shown as short PT-BR line + the preventive recommendation (use the alert's `recommendation` when the reason is an alert; a fixed short PT-BR action for out-of-range / offline). If more reasons exist, append "+N outros pontos de atenção". Example: "Crítico — Umidade do solo baixa na Horta de Folhosas. Verifique a necessidade de irrigação."
- **D-07:** **Normal** copy: "Normal — Tudo certo na sua propriedade. Sensores funcionando e sem alertas pendentes." Status always shown as color + icon + text (FND-10, StatusBadge pattern).

### Dados demo "no tempo" — decided during discussion
- **D-08:** **Time-anchor the demo farm at read time** (no cron, no DB writes). For demo data (`is_demo = true` rows of the demo property), the service layer computes `offset = now − (latest demo reading recorded_at for the property)` and shifts every demo timestamp it returns (readings `recorded_at`, sensors `last_seen_at`, alerts `triggered_at`, climate `observed_at`, risk `analyzed_at`) by that offset, so the freshest reading always looks a few minutes old. Relative gaps are preserved: the Pomar temperature sensor (stopped ~52 h before the end of the seed) stays offline, the others are online. Real (non-demo) data is NEVER shifted. Implement once in the service layer (single helper, unit-tested) so Phases 3–5 reuse it; condition/offline logic runs on shifted values.

### Claude's Discretion (user deferred these to Claude)
- **Onboarding flow (ONB-01/02):** shown when `producers.onboarding_completed_at` is null, right after signup, before the tabs (route guard similar to the auth guard). Not skippable. Short: 1–2 steps on one screen (property name + city + UF select; first planting area name + crop). Values **rename/update the existing cloned demo property** (`properties.name/city/state`, columns already grantable) and **create the first planting area as a new, non-demo area** in that property (`is_demo = false`, allowed by RLS). Demo areas/sensors stay as-is (demo data stays linked — ONB-02). On finish set `onboarding_completed_at = now()` and land on Início. Prefill: property name "Minha Propriedade" placeholder, empty city. Existing accounts with null `onboarding_completed_at` also see it once.
- **Início layout (HOME-01..08)** top-to-bottom: greeting (Olá, {primeiro nome}) + property name/city → **hero "Condição da propriedade" card** (large status, reason + action, "Atualizado há X min") → climate snapshot card (condition + short description, temp/humidity/rain chance from `climate_snapshots`) → indicators: three MetricTiles (temperatura, umidade do ar, umidade do solo — latest value with normal/abnormal mark vs thresholds; when multiple sensors of a type, show the most critical / out-of-range one, else the property average — planner/UI-SPEC pick and document) + "6 sensores ativos" + "Ver monitoramento" → recent alerts: up to 3 unresolved, most severe/recent first, each opening alert detail; "Ver todos" → Alertas tab. Pull-to-refresh refetches everything. Exact visuals → `/gsd:ui-phase 2`.
- **Alert detail (HOME-07):** minimal read-only screen (e.g. `src/app/(app)/alertas/[id].tsx`) with title, description, date/time, severity badge, recommendation, status. Marking visualizado/resolvido stays in Phase 4 (ALRT-04) — do not implement status changes here.
- **"Active sensors" count (HOME-05)** = sensors not offline per D-05; pending alerts = unresolved alerts (novo + visualizado).
- **Last update (HOME-06)** = most recent (time-anchored) reading across the property.
- Condition computed client-side in a pure, unit-tested function (e.g. `src/features/condition/deriveCondition.ts`) over data from services — easy to swap for a backend computation later.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope & requirements
- `.planning/ROADMAP.md` §Phase 2 — goal + 4 success criteria
- `.planning/REQUIREMENTS.md` — ONB-01, ONB-02, HOME-01..08
- `.planning/PROJECT.md` — core value, constraints, key decisions

### Prior phase (patterns to reuse)
- `.planning/phases/01-app-shell-auth-demo-farm/01-CONTEXT.md` — D-01..D-18 (Gemma port, tokens, D-10 demo badge only in Perfil)
- `.planning/phases/01-app-shell-auth-demo-farm/01-UI-SPEC.md` — design contract (tokens, components, copy rules)
- `.planning/phases/01-app-shell-auth-demo-farm/01-07-SUMMARY.md` — service layer + hooks + ESLint guard
- `.planning/phases/01-app-shell-auth-demo-farm/01-REVIEW-FIX.md` — query keys scoped by user id, PKCE, etc.

### Data
- `supabase/migrations/001_schema.sql` — tables/enums (alerts severity/status, thresholds, readings, sensors.last_seen_at, climate_snapshots)
- `supabase/migrations/003_demo_farm.sql` + `004_review_fixes.sql` — demo farm content (6 sensors, Pomar temp offline ~52 h, Horta soil below 25% with critical alert, 7 alerts, thresholds temp 10–32 / air 30–85 / soil 25–80)
- `supabase/migrations/002_rls.sql` + 004 — what the client may update (properties name/city/state; producers onboarding_completed_at; areas insert non-demo)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/(app)/(tabs)/index.tsx` — Phase 1 minimal Início (greeting + property card) to evolve
- `src/services/properties.ts` (`getCurrentProperty`, `getHomeSummary`), `src/services/producers.ts`, `ServiceError.ts`
- `src/hooks/useHomeSummary.ts`, `useCurrentProperty.ts`, `useProducer.ts` (React Query, keys scoped by user id)
- UI: `MetricTile`, `ListRow`, `SectionHeader`, `Chip`, `StatusBadge`, `Badge`, `Card`, `AsyncBoundary`, `EmptyState`, `ErrorState`, `Input`, `Select`, `Button`, `Notice`
- `src/lib/format.ts` (`firstName`, `formatSensorsLine`)
- Root layout guards with `Stack.Protected` (`src/app/_layout.tsx`) — pattern for the onboarding guard

### Established Patterns
- Screens → hooks → `src/services/*` → supabase (ESLint `no-restricted-imports` enforces)
- StyleSheet + `src/theme/tokens.ts` only (no hex outside tokens; `scripts/check-ui-rules.mjs`)
- PT-BR copy, 48dp targets, status never color-only

### Integration Points
- New service functions: latest reading per sensor, thresholds, unresolved alerts (recent), climate snapshot, producer onboarding update, property update, area insert
- Demo time-anchor helper inside services (D-08)

</code_context>

<specifics>
## Specific Ideas

- Example Crítico line: "Crítico — Umidade do solo baixa na Horta de Folhosas. Verifique a necessidade de irrigação."
- Normal line: "Normal — Tudo certo na sua propriedade. Sensores funcionando e sem alertas pendentes."
- "+N outros pontos de atenção" when there is more than one reason.

</specifics>

<deferred>
## Deferred Ideas

- Final "Dados demonstrativos" labeling policy (still pending from Phase 1, D-10) — Início shows demo data without a badge until the user defines it.
- Real periodic demo data generation (pg_cron) — rejected in favor of read-time anchoring (D-08); could return with ESP32 ingestion.

</deferred>

---

*Phase: 02-onboarding-in-cio*
*Context gathered: 2026-11-12*
