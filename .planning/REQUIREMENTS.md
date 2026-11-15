# Requirements: AgroAlerta + AgroVigia

**Defined:** 2026-11-11
**Core Value:** The producer opens the phone and immediately understands whether the property is Normal, Atenção, or Crítico — and what to do next.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases. All user-facing copy is PT-BR.

### Foundation (App shell, theme, data)

- [x] **FND-01**: App runs from one Expo + TypeScript codebase on Android, iOS, and the browser (React Native Web)
- [x] **FND-02**: Bottom tab bar with five sections (Início, Monitoramento, Alertas, Análises, Perfil), large touch targets (≥48dp), comfortable for one-handed use, works on native and web
- [x] **FND-03**: Visual identity applied via design tokens: dark green primary, light green positive, neutral surfaces, yellow/orange warning, red critical, rounded cards, legible modern typography, outdoor-readable contrast
- [x] **FND-04**: Reusable component library (cards, status badge, metric tile, buttons, list rows, chips, section headers, screen states) used consistently across screens
- [x] **FND-05**: Every screen with remote data has loading, empty, connection-error, and success-feedback states
- [x] **FND-06**: Screens read and write data only through a service layer (no direct DB calls in UI), with adapters ready for REST/Supabase, ESP32 ingest, public climate data, and ML models
- [x] **FND-07**: Supabase schema with row-level security: producers, properties, planting areas, sensors, readings, thresholds, alerts, risk analyses, climate snapshots, push tokens — supports more than one property per producer at the schema level
- [x] **FND-08**: A realistic, internally consistent demo farm (sensors, ~30 days of readings, alerts, risk analyses, climate) is cloned per new user, and every simulated record carries an `is_demo` flag
- [x] **FND-09**: Simulated data is visibly labeled in the UI ("Dados demonstrativos") wherever it appears
- [x] **FND-10**: Basic accessibility: screen-reader labels on icons/controls, status not conveyed by color alone, text scales without breaking layout

### Authentication & Onboarding

- [x] **AUTH-01**: Producer can create an account with name, e-mail, and password
- [x] **AUTH-02**: Producer can log in with e-mail and password
- [x] **AUTH-03**: Producer can request a password reset by e-mail
- [x] **AUTH-04**: Session persists across app restarts and browser refresh
- [x] **AUTH-05**: Producer can log out from Perfil
- [ ] **ONB-01**: After the first signup, producer goes through a short setup capturing property name, location (city/state text), and first planting area (name + crop)
- [ ] **ONB-02**: Finishing setup lands on Início with the demo farm data linked to the new property

### Início (Dashboard)

- [ ] **HOME-01**: Personalized greeting with producer name and selected property name
- [ ] **HOME-02**: "Condição da propriedade" hero indicator showing Normal / Atenção / Crítico, derived from latest readings, configured thresholds, and open alerts
- [ ] **HOME-03**: Current climate snapshot (condition + short description)
- [ ] **HOME-04**: Current temperature, air humidity, and soil moisture with normal/abnormal indication
- [ ] **HOME-05**: Count of active sensors and count of pending alerts
- [ ] **HOME-06**: Last data update timestamp and pull-to-refresh
- [ ] **HOME-07**: Recent alerts section; tapping an alert opens its detail
- [ ] **HOME-08**: Main environmental indicators section linking into Monitoramento

### Fazendas & Sensores no mapa (Phase 2.1)

- [ ] **DATA-01**: New accounts start with no mock data; screens show empty states that lead to adding the first farm
- [ ] **NAV-01**: Tab bar is Início · Monitoramento · (+) · Alertas · Perfil, with a raised green circle "+" in the center that opens Adicionar (Fazenda / Sensor); Análises stays reachable from Monitoramento
- [ ] **FARM-01**: Producer can create a farm with basic info (name, CEP, address/city/UF auto-filled from CEP, optional main crop)
- [ ] **FARM-02**: Typing a CEP moves the map to that location
- [ ] **FARM-03**: Producer delimits the farm by tapping boundary points on the map (undo, clear, min 3 points); area in hectares is computed and the polygon is saved
- [ ] **FARM-04**: Producer with more than one farm can choose which farm Início and Monitoramento show
- [ ] **SENS-01**: Adding a sensor starts by selecting a farm; the map opens fitted to that farm's boundary and shows existing sensors
- [ ] **SENS-02**: Producer places the sensor point inside the farm, chooses sensor type, name and coverage radius (meters, shown as a circle), and registers it
- [ ] **SENS-03**: A registered sensor receives simulated readings labeled "Dados demonstrativos" so Início and Monitoramento work until real hardware sends data
- [ ] **MAP-01**: The map works on native and web, defaults to satellite imagery with a street-map toggle, and shows provider attribution

### Ajustes de UX, clima e dados demo (Phase 2.2)

- [ ] **PRF-06**: Perfil is a settings screen: theme Sistema/Claro/Escuro (persisted), editable name, default farm, notification preferences, °C/°F, data/demo explanation, about, logout
- [ ] **UX-01**: Every popup, selector and confirmation appears as a centered card sized to its content (no full-width sheets), on native and web
- [ ] **WX-01**: Início shows the real weather forecast for the selected farm (Open-Meteo, attributed): current conditions plus the 7 days of the week with icons, max/min and chance of rain
- [ ] **MAP-02**: The farm and sensor maps use a monochrome base map that follows the app's light/dark theme; farm and sensor overlays keep brand colors
- [ ] **DEMO-02**: Opening Análises for a farm with sensors and no generated data asks whether to generate demonstrative data; confirming generates 30 days of labeled readings for all of that farm's sensors
- [ ] **ANL-01**: Análises shows one chart per sensor of the selected farm with 24h / 7 dias / 30 dias filters, min/máx/média and the "Dados demonstrativos" label, on native and web

### Monitoramento (AgroVigia)

- [ ] **MON-01**: Sensor cards for ambient temperature, air humidity, soil moisture, and extensible sensor types, each showing name, current value, unit, sensor status, last update, and normal/abnormal indicator
- [ ] **MON-02**: Sensors display distinct states: online-normal, online-abnormal, and offline (no communication)
- [ ] **MON-03**: Sensor detail screen with evolution chart of measurements
- [ ] **MON-04**: Sensor detail period filter (day / week / month) updates chart and stats
- [ ] **MON-05**: Sensor detail shows min, max, and average for the selected period
- [ ] **MON-06**: Sensor detail shows operating status (last communication, health)
- [ ] **MON-07**: Devices list shows all registered sensors with their planting area
- [ ] **MON-08**: Producer can add a new sensor (name, type, planting area)
- [ ] **MON-09**: Charts render correctly on native and web

### Histórico

- [ ] **HIST-01**: Histórico is reachable from Monitoramento
- [ ] **HIST-02**: Producer can view temperature, air humidity, and soil moisture history with interactive charts
- [ ] **HIST-03**: Producer can view alert history
- [ ] **HIST-04**: Producer can view risk classification history
- [ ] **HIST-05**: Day / week / month filters apply to Histórico views

### Alertas (AgroAlerta)

- [ ] **ALRT-01**: Alert center lists alerts with title, simple description, date/time, severity level, visual indicator, preventive recommendation, and status (novo / visualizado / resolvido)
- [ ] **ALRT-02**: Alert types cover: temperature above limit, low soil moisture, high air humidity, heavy rain possibility, unfavorable weather, sensor without communication
- [ ] **ALRT-03**: Producer can filter alerts by category and by severity
- [ ] **ALRT-04**: Opening an alert marks it as visualizado; producer can mark it as resolvido
- [ ] **ALRT-05**: Pending-alert badge on the Alertas tab and home count stay in sync with alert status
- [ ] **ALRT-06**: Threshold-based alerts are consistent with readings (e.g. a low-soil-moisture alert corresponds to a soil reading below the configured limit)
- [ ] **ALRT-07**: Producer receives a push notification for new important alerts on a physical device while the app is closed; web degrades gracefully with an explanatory message

### Análises (Risk analysis)

- [ ] **RISK-01**: Análises screen shows risk classifications for drought, excessive heat, high humidity, and unfavorable weather
- [ ] **RISK-02**: Each analysis shows risk level (baixo / moderado / alto) with visual indicator
- [ ] **RISK-03**: Each analysis shows contributing indicators and the data used
- [ ] **RISK-04**: Each analysis shows a plain-language explanation and a preventive recommendation
- [ ] **RISK-05**: Analyses are clearly labeled as demonstrative / rule-based while ML models are not connected — never presented as scientific forecasts

### Propriedade & Áreas

- [ ] **PROP-01**: Producer can view property data (name, location, areas, sensor count)
- [ ] **PROP-02**: Producer can edit property name and location
- [ ] **PROP-03**: Producer can create a planting area with name and crop type
- [ ] **PROP-04**: Producer can edit and delete planting areas
- [ ] **PROP-05**: Producer can see sensors associated with each planting area

### Perfil & Configurações

- [ ] **PRF-01**: Producer can view and edit personal data (name)
- [ ] **PRF-02**: Perfil gives access to property data / management
- [ ] **PRF-03**: Producer can toggle notifications and choose which alert categories to be notified about
- [ ] **PRF-04**: Producer can set temperature and humidity (air and soil) thresholds; changes are reflected in property condition and sensor normal/abnormal state
- [ ] **PRF-05**: Account settings section (e-mail shown, change password via reset, logout)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Integrations

- **INT-01**: Live ESP32 sensor ingestion and device pairing flow
- **INT-02**: Public weather API feeding the climate snapshot
- **INT-03**: Real ML models writing risk analyses
- **INT-04**: Optional realtime reading subscription

### Scale & UX

- **SCL-01**: Property switcher for producers with multiple farms
- **SCL-02**: Notification quiet hours and per-category scheduling
- **SCL-03**: Offline-first sync queue

## Out of Scope

| Feature | Reason |
|---------|--------|
| Live ESP32 telemetry in v1 | Hardware/firmware dependency; seeded demo data + service layer instead |
| Unlabeled ML / scientific forecasts | Trust and liability; analyses must be labeled demonstrative |
| Weather API as source of truth | Rate limits and inconsistency with sensor data; adapter later |
| GIS / satellite maps | Heavy on native+web; city/text location is enough for v1 |
| Multi-farm switcher UX | Splits attention; schema-only in v1 |
| AI chat agronomist | Hallucination risk in production advice |
| OAuth / social login | E-mail + password sufficient |
| i18n / English | Audience is Brazilian producers — PT-BR only |
| Desktop / enterprise dashboard layout | Contradicts mobile-first rural UX |
| Spreadsheet export | Not the farmer-on-phone job |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FND-01 | Phase 1 | Complete |
| FND-02 | Phase 1 | Complete |
| FND-03 | Phase 1 | Complete |
| FND-04 | Phase 1 | Complete |
| FND-05 | Phase 1 | Complete |
| FND-06 | Phase 1 | Complete |
| FND-07 | Phase 1 | Complete |
| FND-08 | Phase 1 | Complete |
| FND-09 | Phase 1 | Complete |
| FND-10 | Phase 1 | Complete |
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| AUTH-05 | Phase 1 | Complete |
| ONB-01 | Phase 2 | Pending |
| ONB-02 | Phase 2 | Pending |
| HOME-01 | Phase 2 | Pending |
| HOME-02 | Phase 2 | Pending |
| HOME-03 | Phase 2 | Pending |
| HOME-04 | Phase 2 | Pending |
| HOME-05 | Phase 2 | Pending |
| HOME-06 | Phase 2 | Pending |
| HOME-07 | Phase 2 | Pending |
| HOME-08 | Phase 2 | Pending |
| DATA-01 | Phase 2.1 | Pending |
| NAV-01 | Phase 2.1 | Pending |
| FARM-01 | Phase 2.1 | In Progress |
| FARM-02 | Phase 2.1 | In Progress |
| FARM-03 | Phase 2.1 | In Progress |
| FARM-04 | Phase 2.1 | Pending |
| SENS-01 | Phase 2.1 | Pending |
| SENS-02 | Phase 2.1 | Pending |
| SENS-03 | Phase 2.1 | Pending |
| MAP-01 | Phase 2.1 | In Progress |
| PRF-06 | Phase 2.2 | Pending |
| UX-01 | Phase 2.2 | Pending |
| WX-01 | Phase 2.2 | Pending |
| MAP-02 | Phase 2.2 | Pending |
| DEMO-02 | Phase 2.2 | Pending |
| ANL-01 | Phase 2.2 | Pending |
| MON-01 | Phase 3 | Pending |
| MON-02 | Phase 3 | Pending |
| MON-03 | Phase 3 | Pending |
| MON-04 | Phase 3 | Pending |
| MON-05 | Phase 3 | Pending |
| MON-06 | Phase 3 | Pending |
| MON-07 | Phase 3 | Pending |
| MON-08 | Phase 3 | Pending |
| MON-09 | Phase 3 | Pending |
| HIST-01 | Phase 3 | Pending |
| HIST-02 | Phase 3 | Pending |
| HIST-03 | Phase 3 | Pending |
| HIST-04 | Phase 3 | Pending |
| HIST-05 | Phase 3 | Pending |
| ALRT-01 | Phase 4 | Pending |
| ALRT-02 | Phase 4 | Pending |
| ALRT-03 | Phase 4 | Pending |
| ALRT-04 | Phase 4 | Pending |
| ALRT-05 | Phase 4 | Pending |
| ALRT-06 | Phase 4 | Pending |
| ALRT-07 | Phase 4 | Pending |
| RISK-01 | Phase 5 | Pending |
| RISK-02 | Phase 5 | Pending |
| RISK-03 | Phase 5 | Pending |
| RISK-04 | Phase 5 | Pending |
| RISK-05 | Phase 5 | Pending |
| PROP-01 | Phase 5 | Pending |
| PROP-02 | Phase 5 | Pending |
| PROP-03 | Phase 5 | Pending |
| PROP-04 | Phase 5 | Pending |
| PROP-05 | Phase 5 | Pending |
| PRF-01 | Phase 5 | Pending |
| PRF-02 | Phase 5 | Pending |
| PRF-03 | Phase 4 | Pending |
| PRF-04 | Phase 4 | Pending |
| PRF-05 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 77 total
- Mapped to phases: 77
- Unmapped: 0 ✓

---
*Requirements defined: 2026-11-11*
*Last updated: 2026-11-12 after inserting Phase 2.1 (fazendas e sensores no mapa)*
