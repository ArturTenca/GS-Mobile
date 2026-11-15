# Project Research Summary

**Project:** AgroAlerta + AgroVigia
**Domain:** Mobile-first agricultural IoT monitoring (Expo + Supabase)
**Researched:** 2026-11-11
**Confidence:** HIGH

## Executive Summary

AgroAlerta is a phone-first farm control center, not a desktop agri BI tool. Experts build this as an Expo app with a thin service layer over Postgres: sensors and time-series in the database, derived farm status on the home screen, and alerts that share the same thresholds as the charts.

The recommended approach is Expo SDK 58 + Expo Router + React Native Web, Supabase Auth/Postgres/Edge Functions, Zustand + React Query, and SVG gifted-charts (not Skia). Seed a **per-user clone** of a demo farm with `is_demo` on every measurement so ESP32 and ML can arrive later without a rewrite.

Main risks: presenting demo risk scores as science, inconsistent numbers across tabs, charts breaking on web, and push that only exists as a permission prompt. Prevent them with labeled demo data, SQL-generated alerts from readings, a custom high-contrast tab bar, and a real Expo Push Edge Function with a web no-op.

## Key Findings

### Recommended Stack

Locked: Expo, RN Web, TypeScript, Supabase. Use **SDK 58** (RN 0.88, RN Web 0.21, Node ≥ 22.13) and `@supabase/supabase-js` **2.119.0**. Navigation is Expo Router with a **custom 5-tab bar** (branded targets; NativeTabs fight web + outdoor UX). Charts: **react-native-gifted-charts**, not victory-native. Push: `expo-notifications` + `push_tokens` + Edge Function. Session: official Expo+Supabase (`expo-sqlite`), not AsyncStorage.

**Core technologies:**
- Expo SDK 58: one runtime for phone and browser
- Expo Router: file-based tabs + stacks
- Supabase: Auth, RLS Postgres, Edge Functions for push
- gifted-charts + React Query + Zustand: history UX without Skia/web pain

### Expected Features

**Must have (table stakes):**
- Auth (email/password, recovery, session) — users expect an account for “my farm”
- Início condition Normal/Atenção/Crítico + live indicators
- Sensor cards, detail charts, offline state
- Alerts with recommendation + mark read/resolved
- Push on a real device
- Property, planting areas, thresholds
- Demo labeling and consistent seed
- PT-BR, outdoor-readable UI states

**Should have (competitive):**
- Plain-language recommendations
- Demo-labeled risk analyses (AgroAlerta)
- Extensible sensor types + multi-property schema without switcher UX

**Defer (v2+):**
- ESP32 ingest, public weather as source of truth, real ML, maps, realtime websockets, multi-farm switcher, i18n

### Architecture Approach

UI → hooks → **services only** → Supabase. Derive farm condition from readings + thresholds + open alerts. Clone demo farm per signup so RLS holds. Home reads `climate_snapshots`; future weather APIs fill the same table. Risk UI reads `risk_analyses` rows so ML is a writer swap.

**Major components:**
1. Expo Router shell + theme — first impression and nav
2. Auth/onboarding — session + short property setup
3. Services + dashboard snapshot — core value
4. Sensors/charts/history — AgroVigia
5. Alerts + thresholds + push — AgroAlerta
6. Analyses + property/perfil CRUD — remaining loops

### Critical Pitfalls

1. **Fake science** — `is_demo` + banner + non-scientific copy
2. **Inconsistent seed** — generate alerts from the same readings/thresholds
3. **Desktop dashboard UX** — hero status, 48dp tabs, high contrast
4. **Skia charts on web** — gifted-charts; test `--web`
5. **Push client-only** — tokens + Edge Function; web fallback copy
6. **Shared global farm / late RLS** — clone per user from migration 1

## Implications for Roadmap

Granularity is **coarse** (3–5 phases). Suggested grouping:

### Phase 1: App shell, theme, Supabase foundation
**Rationale:** Outdoor UX and RLS/clone must exist before screens hardcode numbers.
**Delivers:** Expo 58 app on web+native, tokens, 5-tab custom bar, empty/error states, schema+RLS+seed function.
**Addresses:** Visual identity, folder layout, demo farm data model
**Avoids:** Dashboard soup, Router nav imports, global seed farm

### Phase 2: Auth, onboarding, Início (core value)
**Rationale:** The product is “open phone → farm OK?”. Needs session + snapshot service.
**Delivers:** Signup/login/recovery, short onboarding, home hero + indicators + recent alerts + demo chip.
**Uses:** supabase-js session, React Query, deriveCondition()
**Implements:** dashboard service

### Phase 3: AgroVigia — sensors, charts, histórico, devices
**Rationale:** Cards and history are how the home numbers earn trust.
**Delivers:** Sensor list/detail, period filters, min/max/avg, add device, offline sensor, histórico.
**Avoids:** Web-blank charts; pretty-but-meaningless online status

### Phase 4: AgroAlerta — alerts, thresholds, push, analyses, property/perfil
**Rationale:** Closing the loop: settings change condition; alerts match soil; push fires; analyses labeled.
**Delivers:** Alert center + filters + statuses, push pipeline, risk screen, areas CRUD, perfil.
**Avoids:** Half-done push, unlabeled ML, inconsistent thresholds

### Phase Ordering Rationale

- Shell + schema before features so every screen uses tokens and services.
- Home before deep sensors so core value ships early (vertical slice inside later execute-phase).
- Charts before push so alerts have a real measurement story.
- Push/analyses last among product surfaces because they depend on alerts + readings.

### Research Flags

- **Phase 4 (push):** Expo projectId, Edge Function secrets, web no-op — needs extra care at plan time
- **Phase 3 (charts on web):** gifted-charts vs `react-gifted-charts` split

Phases with standard patterns:
- **Phase 1–2 auth/theme:** well-documented Expo + Supabase

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official Expo 58 + npm supabase-js 2.119 verified 2026-11-11 |
| Features | HIGH | Mapped from PROJECT.md + agri-IoT table stakes |
| Architecture | HIGH | Standard Expo+Supabase; clone-farm is a known tenancy pattern |
| Pitfalls | HIGH | Push/charts/RLS/demo-labeling are well-documented failure modes |

**Overall confidence:** HIGH

### Gaps to Address

- **Exact seed farm narrative (crop, city, sensor names):** invent a coherent Fazenda in planning, keep PT-BR.
- **Expo push on web:** treat as unsupported; copy only.
- **Password recovery deep links:** confirm Expo scheme in plan-phase; in-app “email enviado” is enough if deep link slips.
- **Per-user clone vs template farm:** planning should specify SQL `clone_demo_farm(uid)`.

## Sources

### Primary (HIGH confidence)
- https://docs.expo.dev/versions/latest — SDK 58
- https://docs.expo.dev/guides/using-supabase
- https://docs.expo.dev/push-notifications/push-notifications-setup/
- https://supabase.com/docs/guides/functions/examples/push-notifications?platform=expo
- https://www.npmjs.com/package/@supabase/supabase-js — 2.119.0

### Secondary (MEDIUM confidence)
- Gifted-charts web guidance / issue #609
- victory-native 43 Skia web caveats

---
*Research completed: 2026-11-11*
*Ready for roadmap: yes*
