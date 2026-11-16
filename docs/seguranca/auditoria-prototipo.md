# Auditoria de taint do prototipo

Gerado em 2026-11-16T21:47:12.453Z. Fluxos rastreados: 51 (bloqueados: 1, sanitizados: 50, inseguros: 0).

O rastreador estatico (`node scripts/taint-audit.mjs`) usa a API do compilador TypeScript sobre `src/`, propaga o dado da origem ate o destino e classifica cada fluxo. Valores reais nunca aparecem aqui: apenas arquivo, linha e nomes de simbolos.

- **blocked**: o fluxo passa por uma guarda de sink (`guardSink`, `unwrapFor`, `assertAllowedUrl`) que bloqueia ou mascara o dado.
- **sanitized**: o fluxo passa por um sanitizador (`sanitizeFreeText`, `redact`, `sanitizeCause`, `onlyDigits`, `assertCoarseCoord`...).
- **unsafe**: nenhuma guarda no caminho. Deve ser zero ou estar justificado em `scripts/taint-baseline.json`.

## Fluxos

| Fluxo | Origem -> Destino | Controle | Status | Teste |
| --- | --- | --- | --- | --- |
| T-001 | db_response (src/services/alerts.ts:83) -> service_error (src/services/alerts.ts:91) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-002 | db_response (src/services/alerts.ts:103) -> service_error (src/services/alerts.ts:108) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-003 | db_response (src/services/alerts.ts:123) -> service_error (src/services/alerts.ts:124) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-004 | db_response (src/services/alerts.ts:127) -> service_error (src/services/alerts.ts:128) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-005 | caught_error (src/services/alerts.ts:129) -> service_error (src/services/alerts.ts:131) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-006 | db_response (src/services/alerts.ts:140) -> service_error (src/services/alerts.ts:147) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-007 | caught_error (src/services/alerts.ts:193) -> service_error (src/services/alerts.ts:195) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-008 | db_response (src/services/alerts.ts:203) -> service_error (src/services/alerts.ts:211) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-009 | caught_error (src/services/alerts.ts:236) -> service_error (src/services/alerts.ts:238) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-010 | db_response (src/services/farms.ts:44) -> service_error (src/services/farms.ts:48) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-011 | caught_error (src/services/farms.ts:50) -> service_error (src/services/farms.ts:52) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-012 | db_response (src/services/farms.ts:63) -> service_error (src/services/farms.ts:64) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-013 | db_response (src/services/farms.ts:88) -> service_error (src/services/farms.ts:89) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-014 | db_response (src/services/farms.ts:66) -> service_error (src/services/farms.ts:92) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-015 | db_response (src/services/farms.ts:66) -> service_error (src/services/farms.ts:93) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-016 | caught_error (src/services/farms.ts:97) -> service_error (src/services/farms.ts:99) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-017 | form_field (src/services/geocoding.ts:171) -> fetch (src/services/geocoding.ts:66) | unwrapFor | blocked | `src/security/taint/taint.inaction.test.ts`: blocks a CPF typed in Endereco before Nominatim |
| T-018 | db_response (src/services/home.ts:94) -> service_error (src/services/home.ts:135) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-019 | db_response (src/services/home.ts:94) -> service_error (src/services/home.ts:136) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-020 | db_response (src/services/home.ts:94) -> service_error (src/services/home.ts:137) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-021 | db_response (src/services/home.ts:94) -> service_error (src/services/home.ts:138) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-022 | caught_error (src/services/home.ts:219) -> service_error (src/services/home.ts:221) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-023 | db_response (src/services/notifications.ts:26) -> service_error (src/services/notifications.ts:27) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-024 | db_response (src/services/notifications.ts:29) -> service_error (src/services/notifications.ts:34) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-025 | caught_error (src/services/notifications.ts:36) -> service_error (src/services/notifications.ts:38) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-026 | db_response (src/services/notifications.ts:45) -> service_error (src/services/notifications.ts:46) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-027 | db_response (src/services/notifications.ts:57) -> service_error (src/services/notifications.ts:63) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-028 | caught_error (src/services/notifications.ts:65) -> service_error (src/services/notifications.ts:67) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-029 | db_response (src/services/producers.ts:13) -> service_error (src/services/producers.ts:18) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-030 | caught_error (src/services/producers.ts:25) -> service_error (src/services/producers.ts:27) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-031 | db_response (src/services/producers.ts:41) -> service_error (src/services/producers.ts:42) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-032 | db_response (src/services/producers.ts:44) -> service_error (src/services/producers.ts:50) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-033 | caught_error (src/services/producers.ts:59) -> service_error (src/services/producers.ts:61) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-034 | db_response (src/services/properties.ts:13) -> service_error (src/services/properties.ts:19) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-035 | caught_error (src/services/properties.ts:21) -> service_error (src/services/properties.ts:23) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-036 | db_response (src/services/readings.ts:30) -> service_error (src/services/readings.ts:34) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-037 | caught_error (src/services/readings.ts:46) -> service_error (src/services/readings.ts:48) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-038 | db_response (src/services/readings.ts:66) -> service_error (src/services/readings.ts:73) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-039 | caught_error (src/services/readings.ts:86) -> service_error (src/services/readings.ts:88) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-040 | db_response (src/services/sensors.ts:51) -> service_error (src/services/sensors.ts:56) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-041 | caught_error (src/services/sensors.ts:68) -> service_error (src/services/sensors.ts:70) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-042 | db_response (src/services/sensors.ts:77) -> service_error (src/services/sensors.ts:87) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-043 | db_response (src/services/sensors.ts:77) -> service_error (src/services/sensors.ts:88) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-044 | db_response (src/services/sensors.ts:77) -> service_error (src/services/sensors.ts:89) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-045 | caught_error (src/services/sensors.ts:93) -> service_error (src/services/sensors.ts:95) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-046 | db_response (src/services/thresholds.ts:24) -> service_error (src/services/thresholds.ts:28) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-047 | caught_error (src/services/thresholds.ts:34) -> service_error (src/services/thresholds.ts:36) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-048 | db_response (src/services/thresholds.ts:50) -> service_error (src/services/thresholds.ts:59) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-049 | caught_error (src/services/thresholds.ts:60) -> service_error (src/services/thresholds.ts:62) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |
| T-050 | geo_coords (src/services/weather.ts:104) -> fetch (src/services/weather.ts:120) | assertCoarseCoord | sanitized | `src/security/taint/taint.inaction.test.ts`: rounds weather coordinates and records a location event |
| T-051 | caught_error (src/services/weather.ts:124) -> service_error (src/services/weather.ts:125) | ServiceError->sanitizeCause | sanitized | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only |

## Em ação

Os testes abaixo foram executados com `--with-tests` e provam, com valores sintéticos, o comportamento em tempo de execução.

| Evidência | Teste (jest) | Resultado |
| --- | --- | --- |
| CPF digitado em Endereço é bloqueado antes do Nominatim | `src/security/taint/taint.inaction.test.ts`: blocks a CPF typed in Endereco before Nominatim | passou (1) |
| E-mail é mascarado no console (safeLog) | `src/security/taint/taint.inaction.test.ts`: redacts e-mail in safeLog | passou (1) |
| Causa do ServiceError é reduzida a nome/código | `src/security/taint/taint.inaction.test.ts`: strips ServiceError cause to name only | passou (1) |
| Coordenadas do clima arredondadas a 2 casas decimais | `src/security/taint/taint.inaction.test.ts`: rounds weather coordinates and records a location event | passou (1) |
| Prompt de LLM com PII é bloqueado e o evento guarda só prévia mascarada | `src/security/taint/taint.inaction.test.ts`: blocks LLM prompt with PII and records only a masked preview | passou (1) |
| Corpo de push é redigido e coincide com o motor de PII | `src/security/taint/pushParity.test.ts`: agree on every positive | passou (1) |
| Guarda de sink bloqueia/mascara conforme a política | `src/security/taint/taint.test.ts`: blocks a CPF going to geocode_http | passou (1) |
| Campos aceitos só com allowlist de caracteres | `src/lib/security/fieldPolicies.test.ts`: rejects  | passou (11) |
| PII em campo de texto é rejeitada na entrada | `src/lib/security/fieldPolicies.test.ts`: blocks PII in | passou (4) |
| Nenhum sink HTML perigoso em src (dangerouslySetInnerHTML, innerHTML, eval...) | `src/security/noDangerousSinks.test.ts`: has no  | passou (6) |
| Nenhum SQL dinâmico concatenado nas migrations | `src/security/sqlAudit.test.ts`: never concatenates into execute | passou (1) |
| Política CSP da web endurecida | `src/security/webCsp.test.ts`: is a single-line policy with the hardening directives | passou (1) |
| Varredor de PII encontra CPF, e-mail e JWT sem imprimir o valor bruto | `src/security/pii/cli.test.ts`: --self-test passa e nao imprime valores brutos | passou (1) |

## Prova de detecção (fixture vulnerável)

O arquivo `scripts/fixtures/taint-vulnerable.ts` vaza dados de propósito. O auto-teste (`node scripts/taint-audit.mjs --self-test`) exige pelo menos 3 fluxos inseguros nele e zero nas variantes protegidas. Resultado nesta geração: 3 fluxos inseguros nas funções vulneráveis, 0 nas protegidas.

| Fluxo da fixture | Destino | Status |
| --- | --- | --- |
| leakyConsole | console (linha 20) | unsafe |
| leakyFetch | fetch (linha 24) | unsafe |
| leakyCause | service_error (linha 28) | unsafe |
| guardedConsole | console (linha 32) | sanitized |
| guardedFetch | fetch (linha 37) | blocked |
| guardedCause | service_error (linha 41) | sanitized |
| guardedFreeText | fetch (linha 45) | sanitized |

## Limitações

- O rastreador segue variáveis, atribuições, templates, objetos, desestruturação, funções do app (parâmetro -> retorno e parâmetro -> sink) e `useState`. Props de JSX e estado fora de `useState` não são seguidos; o complemento são os testes de execução acima.
- A lista de fontes e sinks fica em `scripts/taint/config.mjs`.
