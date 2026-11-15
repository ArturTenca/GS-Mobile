# Feature Research

**Domain:** Agricultural IoT monitoring apps for small/medium producers
**Researched:** 2026-11-11
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Email/password auth + session | Account owns the farm | MEDIUM | Supabase Auth; persist session |
| Password recovery | Field users lock themselves out | LOW | Supabase email templates in PT-BR |
| Home “is my farm OK?” | Core value | MEDIUM | Status Normal / Atenção / Crítico from live thresholds + latest readings |
| Current temp, air humidity, soil moisture | What they check first | LOW | Cards on Início + Monitoramento |
| Sensor list with last-seen | Trust the hardware | MEDIUM | Online / offline / abnormal |
| Sensor history chart + period filters | “Is this getting worse?” | MEDIUM | Day / week / month |
| Alert list with severity | Why they installed the app | MEDIUM | novo / visualizado / resolvido |
| Mark alert read/resolved | Inbox must be workable | LOW | Consistent with home badge |
| Push for critical/offline | App is not always open | HIGH | Expo token + Edge Function; no-op on web/sim |
| Property + planting areas | Mental model of the land | MEDIUM | Name, location text, crop type |
| Threshold settings | Alerts must be “mine” | MEDIUM | Temp / humidity limits drive status + alerts |
| Logout / profile | Account hygiene | LOW | |
| Loading / empty / error / offline states | Rural networks | MEDIUM | Not optional polish |
| Demo data clearly labeled | Legal/trust | LOW | `is_demo` + UI chip “Dados demonstrativos” |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| One-glance farm condition + recent alerts on home | Built for the field, not a BI console | MEDIUM | This IS the product |
| Plain-language recommendations on every alert | Non-technical producers | LOW | Copy, not models |
| Risk analysis screen with labeled demo intelligence | AgroAlerta brand without fake science | MEDIUM | Rule-based now, swap ML later |
| Extensible sensor types | Future ESP32 variety | LOW | Type enum + card factory |
| Multi-property schema (single farm UX) | Grow without rewrite | LOW | `properties` table now, switcher later |
| Outdoor-readable agri visual identity | Trust + usability in sun | MEDIUM | Tokens, 48dp targets, contrast |
| Consistent demo farm across all screens | Feels like a real product | MEDIUM | Seed derived from same readings/thresholds |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Live ESP32 in v1 | “Real IoT” | Hardware, firmware, pairing, flaky demos | Seeded readings + device registry UI |
| Unlabeled ML drought forecasts | Sounds smart | Liability; PROJECT.md forbids | Rule-based scores + “demonstrativo” |
| Public weather API as source of truth | Home “clima” | Rate limits, location quality, inconsistency with soil sensors | Seed climate snapshot; adapter later |
| Full GIS / satellite maps | Modern agri look | Heavy web/native maps, GPS accuracy | Text city/location in v1 |
| Multi-farm switcher UX | “Scale” | Splits attention before core works | Schema only |
| ChatGPT agronomist | Differentiation | Hallucinations in production advice | Fixed recommendation strings |
| OAuth / Gov.br | Enterprise | Extra IdP without v1 need | Email/password |
| Realtime websocket for every reading | “Live” | Battery, cost, RN Web sockets | Poll on focus + pull-to-refresh; optional realtime later |
| Desktop spreadsheet export | Managers | Not the farmer-on-phone job | Histórico charts |
| Native iOS-only tab chrome | Pretty | Breaks web + brand-sized targets | Custom tab bar |

## Feature Dependencies

```
Auth / session
    └──requires──> Profile + property row
                       └──requires──> Short onboarding (name, location, first area)
                              └──requires──> Seeded farm link (demo property)

Thresholds
    └──requires──> Property
    └──enhances──> Farm condition
    └──enhances──> Alert generation (seed + future jobs)

Readings
    └──requires──> Sensors
                       └──requires──> Areas (optional FK)
    └──enhances──> Home indicators, charts, risk inputs

Alerts
    └──requires──> Readings + thresholds (consistency)
    └──enhances──> Home badges, push

Push
    └──requires──> Auth + alert insert webhook
    └──conflicts──> Web/simulator (must degrade)

Risk analyses
    └──requires──> Readings + (optional) climate seed
    └──requires──> Demo labeling

Histórico
    └──requires──> Readings + alerts + analyses
```

### Dependency Notes

- **Home requires sensors + alerts + thresholds:** Status is derived, not a hardcoded enum on the property.
- **Alerts must match readings:** Seed script generates both from the same limits.
- **Push conflicts with web:** Feature must be designed as “best effort”; in-app is source of truth.
- **Risk analyses require demo labeling:** Shipping without the chip is a product bug, not a polish miss.

## MVP Definition

### Launch With (v1)

- [ ] Auth (signup, login, recovery, session, logout)
- [ ] Short onboarding → Início
- [ ] Início: greeting, property, climate snapshot, indicators, condition, sensor count, pending alerts, last update
- [ ] Monitoramento: sensor cards + detail (chart, min/max/avg, health) + device list + add sensor
- [ ] Alertas: list, filters, statuses, recommendations; mark read/resolved
- [ ] Push for new alerts (native devices)
- [ ] Análises: four risk types, levels, explanation, recommendation, demo chip
- [ ] Histórico from Monitoramento (day/week/month)
- [ ] Property + planting areas CRUD
- [ ] Perfil: data, notification prefs, thresholds
- [ ] Five-tab bar, PT-BR, agri theme, UI states, `is_demo` labeling

### Add After Validation (v1.x)

- [ ] Pull climate from a public API into the same snapshot shape
- [ ] Optional realtime reading subscription
- [ ] Property switcher (second farm)
- [ ] Alert notification categories / quiet hours
- [ ] Pairing flow for a first ESP32

### Future Consideration (v2+)

- [ ] Real ML models
- [ ] Satellite / NDVI
- [ ] Irrigation control actuators
- [ ] Agronomist marketplace / chat
- [ ] Offline-first sync queue
- [ ] i18n

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Home farm condition | HIGH | MEDIUM | P1 |
| Sensors + history | HIGH | MEDIUM | P1 |
| Alerts + mark status | HIGH | MEDIUM | P1 |
| Auth + onboarding | HIGH | MEDIUM | P1 |
| Thresholds | HIGH | LOW | P1 |
| Demo labeling + consistent seed | HIGH | MEDIUM | P1 |
| Push | HIGH | HIGH | P1 |
| Risk analyses (demo) | MEDIUM | MEDIUM | P1 |
| Planting areas | MEDIUM | MEDIUM | P1 |
| Histórico hub | MEDIUM | MEDIUM | P1 |
| Add sensor form | MEDIUM | LOW | P1 |
| Public weather API | MEDIUM | MEDIUM | P2 |
| Realtime | LOW | MEDIUM | P3 |
| Multi-farm UX | LOW | MEDIUM | P3 |
| ESP32 | HIGH later | HIGH | P3 |
| Real ML | MEDIUM later | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Typical agri dashboard (web) | Consumer plant apps | Our Approach |
|---------|------------------------------|---------------------|--------------|
| Home | Dense charts | Pretty weather | One status word + 4 numbers |
| Sensors | Device tables | Hidden | Big cards, last update, offline |
| Alerts | Email/SMS ops | Push only | In-app + push + recommendation |
| Intelligence | Opaque “AI score” | Tips | Labeled demo rules |
| Language | Technical PT/EN | Casual | Short field PT-BR |
| Hardware | Assumes gateway | Bluetooth plant stick | Seed now, ESP32 later |

## Sources

- PROJECT.md decisions (auth, seed, push, PT-BR, short onboarding)
- Common agri-IoT products: FarmLogs/Climate FieldView class dashboards, CropX/Teralytic soil probes, Brazilian “monitoramento rural” dashboards — pattern: they over-index on desktop density (HIGH as anti-pattern)
- Expo/Supabase push docs (HIGH) for feasibility of P1 push

---
*Feature research for: mobile agri-IoT monitoring*
*Researched: 2026-11-11*
