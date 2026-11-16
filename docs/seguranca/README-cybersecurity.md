# Cybersecurity no AgroAlerta + AgroVigia

Documentação da entrega de cibersegurança (Fase 04.2): detecção de dados pessoais (PII), análise de taint, remediação com IA, painel de risco e correções de autenticação. Todos os exemplos usam valores sintéticos; nenhum relatório contém dado real.

## Visão geral do módulo

| Camada | Onde | O que faz |
| --- | --- | --- |
| Motor de PII | `src/security/pii/` | Detecta e mascara 19 tipos de dado sensível em texto livre. Puro TypeScript, sem dependências. |
| Taint em tempo de execução | `src/security/taint/` | Guardas nos sinks (rede, log, erro, push, LLM) que bloqueiam ou mascaram PII antes de sair do app. |
| Taint estático | `scripts/taint-audit.mjs`, `scripts/taint/` | Rastreia origem -> destino com a API do compilador TypeScript e gera `auditoria-prototipo.{json,md}`. |
| Remediação com IA | `supabase/functions/explain-risk`, `src/security/remediation/` | Explica cada tipo de achado em linguagem simples, com IA ou texto padrão. |
| Risco Cidadão | tela `Segurança e privacidade`, tabela `security_events` | Nota de 0 a 100 calculada a partir dos eventos. |
| Sanitização | `src/lib/security/` | Allowlist por campo, limites e rejeição de PII na entrada. |
| Empacotamento | `scripts/build-zip.mjs` | ZIP de entrega sem segredos. |

## Motor de PII

O motor (`src/security/pii/engine.ts`) expõe `scan`, `redact`, `redactDeep` e `hasPii`. As regras ficam em `rules.ts`; os validadores (dígito verificador de CPF/CNPJ, Luhn, DDD, faixa geográfica do Brasil) ficam em `validators.ts`. Um achado só é reportado se a validação passar, o que mantém falsos positivos baixos (1000 números aleatórios de 11 dígitos geram cerca de 1% de CPFs válidos, e o teste confere isso).

| Regra (`ruleId`) | Categoria | Severidade |
| --- | --- | --- |
| `cpf` | identity | critical |
| `cpf_masked` | identity | low |
| `cnpj` | identity | high |
| `rg` | identity | medium |
| `email` | contact | medium |
| `br_phone` | contact | medium |
| `cep` | address | low |
| `card` | financial | critical |
| `jwt` | credential | critical |
| `anthropic_key` | credential | critical |
| `generic_secret_key` | credential | critical |
| `supabase_secret` | credential | critical |
| `supabase_publishable` | credential | low |
| `expo_push_token` | credential | medium |
| `password_kv` | credential | high |
| `cid10` | health | high |
| `health_keyword` | health | medium |
| `geo_precise` | location | high |
| `geo_single` | location | medium |

**Redação.** Cada achado tem uma prévia mascarada (por exemplo `***.***.***-09`, `[REDACTED:jwt]`). Nenhum resultado, evento ou relatório guarda o valor original; os testes serializam os achados e conferem que o valor bruto não aparece.

**Scanner do repositório.** `node scripts/pii-scan.mjs --fail-on-critical` varre os arquivos versionados e os seeds SQL e grava `pii-scan-report.{json,md}` nesta pasta. Exceções ficam em `scripts/pii-scan-allowlist.json`, sempre com `reason`.

## Taint analysis

**Fontes.** Texto digitado (`onChangeText`), parâmetros de rota e deep link (`useLocalSearchParams`, `useLinkingURL`), `await response.json()`, campos de formulário e da conta (`values.street`, `user.email`, `producer.fullName`), respostas e erros do Supabase, exceções capturadas e coordenadas da propriedade.

**Sinks.** `console.*`, `fetch(url, options)`, `Linking.openURL`, `Share`/`Clipboard`, `new ServiceError(msg, cause)` e a mensagem de push.

**Política por sink** (`src/security/taint/policy.ts`):

| Sink | Ação | Categorias |
| --- | --- | --- |
| `console` | mascarar | todas |
| `geocode_http` | bloquear | pessoais + localização (rua, cidade e CEP continuam permitidos) |
| `weather_http` | bloquear | pessoais; coordenadas arredondadas a 2 casas (`assertCoarseCoord`) |
| `service_error`, `ui_error` | mascarar | todas; a causa é reduzida a `{name, code}` (`sanitizeCause`) |
| `push_payload` | mascarar | pessoais |
| `llm_prompt` | bloquear | todas |
| `open_url` | bloquear | credencial, identidade, contato |
| `db_write` | bloquear | pessoais |

**Em tempo de execução.** `guardSink`/`unwrapFor` aplicam a política, registram um evento só com `ruleId`, categoria, severidade, sink, origem e prévia mascarada, e lançam `TaintBlockedError` quando a ação é bloquear. `safeLog` é o único ponto autorizado a chamar `console`.

**Em análise estática.** `node scripts/taint-audit.mjs --fail-on-unsafe` propaga o dado da origem ao destino sobre `src/` (variáveis, atribuições, templates, objetos, desestruturação, funções do app e `useState`) e classifica cada fluxo:

- `blocked`: passa por uma guarda de sink.
- `sanitized`: passa por um sanitizador (`sanitizeFreeText`, `redact`, `sanitizeCause`, `onlyDigits`, `assertCoarseCoord`).
- `unsafe`: sem controle no caminho. Só é aceito se estiver em `scripts/taint-baseline.json` com justificativa.

`--self-test` roda o detector sobre `scripts/fixtures/taint-vulnerable.ts` (que vaza dados de propósito) e exige pelo menos 3 fluxos inseguros nele e nenhum nas variantes protegidas. `--with-tests` executa os testes de evidência listados em `scripts/taint/evidence.json` e falha se algum não passar.

**Como ler `auditoria-prototipo.md`.** A tabela "Fluxos" traz origem, destino, controle, status e o teste jest que prova o comportamento. A seção "Em ação" lista os testes executados com valores sintéticos (CPF bloqueado antes do Nominatim, e-mail mascarado no console, causa do erro reduzida, coordenadas arredondadas, prompt de LLM bloqueado, corpo de push mascarado, campos rejeitando PII, ausência de sinks HTML perigosos, ausência de SQL dinâmico e a política CSP). A seção "Prova de detecção" mostra a fixture sendo flagrada.

## Remediação com IA

A função `explain-risk` (Supabase Edge Function) recebe somente ids de regra permitidos (por exemplo `cpf`, `email`), nunca texto do usuário, prévia ou identificador. Ela monta o prompt, recusa se ele contiver qualquer PII e chama o modelo `claude-opus-5-5` com saída estruturada (`json_schema`) em português do Brasil. O resultado é validado contra o esquema; se a chave não existir, a chamada falhar, houver recusa ou a saída for inválida, a função devolve os textos fixos de `src/security/remediation/templates.ts` (selo "Texto padrão" em vez de "IA"). O fallback entre modelos é feito no servidor da Anthropic.

O segredo `ANTHROPIC_API_KEY` existe somente nos secrets do Supabase (`supabase secrets set ANTHROPIC_API_KEY=...`). Nunca vai para o app, para o repositório ou para o ZIP; o scanner e o `build-zip` recusam credenciais.

## Risco Cidadão (nota de 0 a 100)

Maior nota significa mais risco; 0 significa nada exposto. Para cada evento não resolvido:

`pontos = peso(severidade) x min(ocorrências, 5) x multiplicador(ação)`

- Pesos: low 1, medium 4, high 10, critical 25.
- Teto de ocorrências: 5.
- Multiplicadores: `detected` 1, `redacted` 0,5, `blocked` 0,25 (vazamento bloqueado reduz o risco, mas mostra um comportamento arriscado).
- `bruto = soma(pontos)` e `score = round(100 * (1-exp(-raw/60)))`, isto é, `round(100 * (1 - e^(-bruto/60)))`, uma saturação suave: um único achado não trava a nota em 100.

| Nota | Nível |
| --- | --- |
| 0 a 24 | baixo |
| 25 a 49 | moderado |
| 50 a 74 | alto |
| 75 a 100 | crítico |

Eventos `resolved` valem 0 e a nota nunca diminui ao somar um evento novo. Referências: um achado crítico `detected` dá 34 (moderado), três dão 71 (alto) e cinco dão 87 (crítico).

Os eventos ficam na tabela `security_events` (migration `010_security_events.sql`), com RLS por dono e escrita apenas pela função `record_security_events`, que valida cada campo e limita o volume. Guardam metadados e prévia mascarada; nunca o valor.

## Sanitização de entradas

Inventário resumido (cada campo digitável tem limite e política):

- Autenticação: e-mail (254, sem caracteres de controle, minúsculas), senha (limite de 128 validado, nunca truncado em silêncio), nome (sanitizado).
- Propriedade: nome da fazenda, rua, bairro, cidade, cultura principal e nome do sensor passam por `validateField` (`src/lib/security/fieldPolicies.ts`): allowlist de caracteres, sem `<`/`>`, sem caracteres bidi/zero-width/nulos, NFC, limite por campo e rejeição de CPF, telefone e e-mail com a mensagem "Não coloque CPF, telefone ou outros dados pessoais neste campo."
- CEP e coordenadas: somente dígitos e faixas válidas; coordenadas enviadas ao clima com 2 casas decimais.
- Limiares e configurações numéricas: convertidos e limitados antes de gravar.
- Banco: `CHECK` de tamanho e formato nas colunas de texto e RLS em todas as tabelas; funções `SECURITY DEFINER` com `search_path` vazio.
- SQL: somente consultas parametrizadas do PostgREST e `format('%I'/'%L')` nas migrations; o teste `sqlAudit.test.ts` falha se houver concatenação em `execute`.
- XSS: `noDangerousSinks.test.ts` garante que `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function` e similares não existem em `src/`.

## Correções de login (A1 a A10)

| Id | Bug | Correção | Teste |
| --- | --- | --- | --- |
| A1 | Todo erro desconhecido virava "Sem conexão" | Mapa de erros por código; mensagem neutra para desconhecidos | `src/features/auth/authErrors.test.ts` |
| A2 | Recuperação de senha dizia "enviado" mesmo sem rede | Falha de transporte é reportada como offline | `src/features/auth/authErrors.test.ts` (mapeamento de erro de transporte) |
| A3 | Qualquer erro contava para o bloqueio de 5 tentativas | Só `invalid_credentials` conta (`shouldCountFailure`) | `src/features/auth/loginCooldown.test.ts` |
| A4 | Duplo toque enviava duas vezes | Trava síncrona com `useRef` | `src/features/auth/inFlightLock.test.ts` |
| A5 | Senha fraca aceita no cadastro (`12345678`) | `validatePasswordStrength` (8+, letra e dígito, lista de senhas comuns, sem o e-mail); login não aplica | `src/lib/security/security.test.ts` |
| A6 | Reenvio de recuperação burlava o intervalo de 60 s | Botão do painel de recuperação respeita a contagem | lógica de tela, sem teste unitário (revisão manual) |
| A7 | Senha truncada em silêncio a 128 | Validação rejeita "Senha muito longa" sem alterar o texto | `src/lib/security/security.test.ts` |
| A8 | Campo do erro de cadastro por substring | `validateSignup` devolve `{field, error}` | `src/lib/security/security.test.ts` |
| A9 | Logout não limpava a fazenda selecionada | Limpeza de sessão no `signOut` | `src/features/auth/sessionCleanup.test.ts` |
| A10 | `user_already_exists` confirmava que o e-mail tem conta | Mensagem neutra no cadastro (decisão do orquestrador; troca um pouco de usabilidade por privacidade) | `src/features/auth/authErrors.test.ts` |

## CSP para a web

A política vive em `src/security/webCsp.ts` (`WEB_CSP`) e é entregue como cabeçalho HTTP `Content-Security-Policy` pela hospedagem, não como meta tag (o build web é `single` e `frame-ancestors` não funciona em meta tag). Valor atual:

```
default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net; img-src 'self' data: blob: https://tile.openstreetmap.org https://server.arcgisonline.com https://unpkg.com https://cdn.jsdelivr.net; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.open-meteo.com https://brasilapi.com.br https://viacep.com.br https://nominatim.openstreetmap.org; frame-src 'self' about:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
```

`'unsafe-inline'` em `script-src` existe porque o mapa usa um iframe `srcDoc` com o script inline do Leaflet; não há `eval`. Sempre confira o valor atual em `src/security/webCsp.ts` antes de copiar.

Exemplo para Vercel (`vercel.json`):

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [{ "key": "Content-Security-Policy", "value": "<valor de WEB_CSP>" }]
    }
  ]
}
```

Exemplo para Netlify (`public/_headers`):

```
/*
  Content-Security-Policy: <valor de WEB_CSP>
```

## Configurações do Supabase Auth (checklist manual)

No painel do Supabase, em Authentication:

- [ ] URL Configuration > **Redirect URLs**: adicionar `<origem-da-web>/reset-password`, `agroalerta://reset-password` e, para testes no Expo Go, o padrão `exp://**`. Sem isso o link de redefinição de senha falha.
- [ ] Providers > Email: comprimento mínimo da senha 8 ou mais.
- [ ] Proteção contra senhas vazadas (leaked password protection), se o plano permitir.
- [ ] Conferir se "Confirm email" está no estado desejado; a mensagem de cadastro é neutra nos dois casos.

## Comandos

| Objetivo | Comando |
| --- | --- |
| Testes de segurança | `npx jest src/security src/lib/security src/features/auth --bail` |
| Tipos | `npx tsc --noEmit` |
| Scanner de PII | `node scripts/pii-scan.mjs --fail-on-critical` |
| Taint estático + testes de evidência | `node scripts/taint-audit.mjs --with-tests --fail-on-unsafe` |
| Auto-teste do detector | `node scripts/taint-audit.mjs --self-test` |
| ZIP de entrega | `node scripts/build-zip.mjs` |
| Verificação do banco (migration 010) | `node --env-file-if-exists=.env scripts/probe-010.mjs` |

Os scripts `.mjs` exigem Node 22.18 ou superior (importam TypeScript por type stripping nativo).

## Entrega em ZIP

`node scripts/build-zip.mjs` gera `dist-zip/AgroAlerta-Cybersecurity-AAAA-MM-DD.zip` (pasta ignorada pelo git) sem dependências externas. Exclui `.env*` (mantém `.env.example`), `node_modules`, `.git`, `.planning` (use `--with-planning` para incluir), chaves e certificados (`*.pem`, `*.key`, `*.p12`...) e logs. Antes de gravar, varre cada arquivo de texto com o motor de PII e **recusa** empacotar se houver credencial crítica fora da allowlist, imprimindo só caminhos e contagens.

## Pendências manuais

- Aplicar a migration `010_security_events.sql` no projeto Supabase e validar com `probe-010`.
- Fazer o deploy da função `explain-risk` e definir o secret `ANTHROPIC_API_KEY`.
- Configurar o cabeçalho CSP na hospedagem web e o checklist de Auth acima.
- Tirar os prints e gravar o vídeo do painel em `docs/seguranca/dashboard/` (ver `README.txt` da pasta).
- Regenerar os relatórios ao final (`node scripts/taint-audit.mjs --with-tests --fail-on-unsafe` e `node scripts/pii-scan.mjs --fail-on-critical`).
- Link no README principal: adicionar ao `README.md` principal um link para este arquivo após o plano 04.1-05 (não editado aqui).
