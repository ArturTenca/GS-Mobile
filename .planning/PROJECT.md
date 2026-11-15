# AgroAlerta + AgroVigia

## What This Is

AgroAlerta is a mobile-first agricultural monitoring app for small and medium rural producers. The farmer uses a phone as the farm control center: see current weather and environment, follow IoT sensors (AgroVigia), get preventive alerts, and read simple risk analysis (AgroAlerta) without needing a computer or technical training.

v1 is a commercial-quality Expo/React Native app (also on the browser via React Native Web) backed by Supabase. Sensors, measurements, alerts, and history start as a clearly labeled seeded demo farm — not live ESP32 or scientific ML forecasts.

## Core Value

The producer opens the phone and immediately understands whether the property is Normal, Atenção, or Crítico — and what to do next.

## Requirements

### Validated

- ✓ Farmer can sign up / log in with email and password (Supabase Auth), recover password, and stay in session — Phase 1
- ✓ Bottom tab bar: Início, Monitoramento, Alertas, Análises, Perfil — one-handed, large targets — Phase 1
- ✓ UI states: loading, empty, connection error, sensor offline, pending alerts, success — Phase 1 (loading/empty/error/success; sensor-offline and pending-alert states come in Phases 3–4)
- ✓ Visual identity: dark green primary, light green positive, neutrals, yellow/orange warning, red critical; rounded cards; outdoor-readable, rural-product feel (not enterprise dashboard) — Phase 1

### Active

- [ ] After first signup, a short setup captures property name, location (city/text), and first planting area, then lands on Início
- [ ] Início shows personalized greeting, selected property, climate snapshot, temperature, air humidity, soil moisture, overall status, active sensor count, pending alerts, last update
- [ ] "Condição da propriedade" visual indicator: Normal / Atenção / Crítico
- [ ] Recent alerts and main environmental indicators are visible on the home screen without hunting
- [ ] Monitoramento lists sensor cards (ambient temperature, air humidity, soil moisture, extensible types) with value, unit, status, last update, normal/abnormal indicator
- [ ] Sensor detail shows history chart, period filters, min/max/avg, and device health
- [ ] Farmer can see registered devices and add new sensors
- [ ] Alertas central lists preventive alerts with title, simple description, datetime, severity, visual indicator, recommendation, status (novo / visualizado / resolvido)
- [ ] Alerts are filterable by category and severity; farmer can mark as read/resolved
- [ ] Push notifications for important conditions even when the app is closed (Expo + Supabase)
- [ ] Análises shows risk classifications (drought, excessive heat, high humidity, unfavorable weather) with level, contributing indicators, data used, plain-language explanation, and recommendation — demo/ML-not-connected clearly labeled
- [ ] Histórico (from Monitoramento) shows temperature, air humidity, soil moisture, alerts, and risk history with interactive charts and day/week/month filters
- [ ] Property management: view/edit name and location, register planting areas (name + crop), see sensors per area; schema ready for more than one property later
- [ ] Perfil: producer data, property data, notification settings, alert preferences, temperature/humidity thresholds, account, logout
- [ ] Demo data is consistent across screens (e.g. low-soil-moisture alert matches measurements below configured threshold) and labeled as simulated

### Out of Scope

- Live ESP32 / real hardware telemetry — v1 uses seeded demo data; service layer prepared for later
- Real weather APIs as the source of truth — architecture ready, seed/demo climate on home for v1
- Production ML models or scientific forecasts presented as real — analyses must be labeled demonstrative until models are connected
- Full multi-property administration — schema/structure only; v1 is one property per producer
- Desktop-first / enterprise BI dashboard aesthetic
- English (or i18n) — product language is PT-BR only
- OAuth / social login — email + password is enough for v1
- Computer-dependent workflows — phone is the product

## Context

**Audience:** Small and medium producers who need to watch the farm from a phone, outdoors, with little technical background. Few taps to important info, short copy, big buttons, intuitive icons.

**Product split:**
- **AgroVigia** — continuous environmental monitoring via IoT sensors
- **AgroAlerta** — analysis of collected data and preventive alerts for production risk

**v1 data:** One fictional rural property in Supabase with sensors, measurements, alerts, and history. Every simulated value must be identifiable as demo so it is never confused with a real reading.

**Future integrations (service layer, not v1 wiring):** REST already is Supabase; sensors ESP32; public climate data; ML models.

**UX non-negotiables:** 100% mobile-first; home must answer “is there a problem?” in seconds; bottom nav comfortable for one-handed use; Histórico reached from Monitoramento, not as a sixth tab.

**Auth + onboarding (decided):** Supabase Auth + Postgres. Signup collects producer name, property name, location. Short first-run: property name, location as city/text, first planting area → Início with the seeded farm linked.

**Alerts (decided):** In-app list + badges + home highlights **and** push while the app is closed.

**Language (decided):** Portuguese (Brazil) only — short, accessible field language.

## Constraints

- **Stack**: Expo + React Native + TypeScript + React Native Web — must run on phones and in the browser
- **Backend**: Supabase (Auth, Postgres, and the path for push) — v1 is not a UI-only mock
- **Data**: Seeded realistic demo farm in Supabase; UI reads/writes the database; demo labeling is mandatory
- **Architecture**: Modular folders, reusable components, structured navigation, adequate state management, charts that work on native and web, accessibility basics
- **Quality**: Main flows must work on demo data (navigate, sensor detail, chart filters, mark alerts read, CRUD planting areas, risk analyses, settings, sensor states) — not static screens
- **Look**: Dark green / agri-tech, not a dated farm-management system
- **Git**: Planning files live in this repo (existing git worktree)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Expo + RN + RN Web | Phone-first product that can also be shown in a browser | — Pending |
| Supabase as Auth + DB | Real accounts, persistence, and a path for push without building a custom API | — Pending |
| Seeded demo farm in Supabase | Interface works end-to-end; values stay consistent; no ESP32 yet | — Pending |
| PT-BR only | Audience is Brazilian rural producers | — Pending |
| Short onboarding then Início | Setup without blocking the “how is my farm?” moment | — Pending |
| Push + in-app alerts | Producer may not have the app open when soil dries or a sensor drops | — Pending |
| Risk analysis labeled as demo | Do not present fake science as real forecasts | — Pending |
| Five-tab bar; Histórico under Monitoramento | One-handed nav; history is a drill-in, not a primary mode | — Pending |
| Multi-property later | Avoid multi-farm UX complexity in v1; keep schema ready | — Pending |
| Service layer for ESP32 / climate / ML | Integration later without rewriting screens | — Pending |
| Use Gemma Entregas as base (ported to Expo, not adopted) | Reuse proven auth, security utils, design rules and nav look | ✓ Good — Phase 1 |
| StyleSheet + tokens.ts instead of NativeWind | NativeWind not stable on SDK 58; tokens needed as JS for icons/charts | ✓ Good — Phase 1 |
| Password recovery via PKCE (same device/browser) | Code review found session-fixation risk in implicit flow | ✓ Good — Phase 1 |
| "Dados demonstrativos" badge only in Perfil for now | User decision D-10; final labeling policy pending | — Pending (revisit FND-09 / RISK-05) |
| Signup without e-mail confirmation | Rural users with poor connectivity must not get stuck | ✓ Good — Phase 1 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-11-12 after Phase 1 (App Shell, Auth & Demo Farm)*
