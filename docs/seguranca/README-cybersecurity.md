# Cybersecurity — AgroAlerta + AgroVigia

Entrega da disciplina de **Cybersecurity** (CitizenTech). O módulo de segurança foi construído dentro do app AgroAlerta (Expo + Supabase): ele encontra dados pessoais (PII), rastreia por onde esses dados passam (taint analysis), bloqueia vazamentos, traduz as falhas em alertas simples com IA e mostra tudo num painel com o indicador **Risco Cidadão**.

> A parte de app (telas, como rodar, entrega de Mobile) está no [README principal](../../README.md).
> Todos os exemplos e relatórios usam **dados sintéticos**. Nenhum relatório, evento ou ZIP guarda o valor real de um dado pessoal.

## Mapa da entrega

| Pedido do professor | Pontos | Onde está | Como conferir |
| --- | --- | --- | --- |
| **Mapeamento de PII:** regras no motor de parsing para dados sensíveis (CPF, saúde, senhas) | 3,0 | `src/security/pii/` | `npx jest src/security/pii` e `node scripts/pii-scan.mjs --self-test` |
| **Taint Analysis:** rastrear o fluxo e bloquear vazamentos em saídas inseguras | 3,0 | `src/security/taint/` (em execução) e `scripts/taint-audit.mjs` (estático) | `node scripts/taint-audit.mjs --with-tests --fail-on-unsafe` |
| **Tradução via IA:** falhas técnicas viram alertas claros ao cidadão | 2,0 | `supabase/functions/explain-risk/` | Perfil > Segurança e privacidade > Rodar auditoria (selo "Explicado por IA") |
| **Dashboard Executivo — Risco Cidadão** | 2,0 | tela `src/app/(app)/seguranca.tsx` | Perfil > Segurança e privacidade |
| **Código do novo módulo** (ZIP com as regras PII) | — | `node scripts/build-zip.mjs` | gera `dist-zip/AgroAlerta-Cybersecurity-<data>.zip` |
| **Auditoria do protótipo** (evidências do taint em ação) | — | [auditoria-prototipo.md](auditoria-prototipo.md) e [pii-scan-report.md](pii-scan-report.md) | relatórios gerados pelos scripts |
| **Dashboard atualizado** (vídeo + print do indicador) | — | `docs/seguranca/dashboard/` | prints e vídeo capturados pela equipe |

Extras pedidos pela equipe: **sanitização de todos os campos de entrada** (SQL injection, XSS e outras injeções) e **correção de 10 falhas no login**.

---

## 1. Motor de parsing de PII (3,0 pts)

`src/security/pii/engine.ts` expõe `scan`, `redact`, `redactDeep` e `hasPii`. As regras ficam em `rules.ts` e os validadores em `validators.ts`. É TypeScript puro, sem dependências, e roda tanto no app quanto nos scripts de terminal.

**19 regras:**

| Regra | O que detecta | Severidade |
| --- | --- | --- |
| `cpf` | CPF com ou sem máscara, **validado pelos dígitos verificadores** | crítica |
| `cpf_masked` | CPF parcialmente mascarado | baixa |
| `cnpj` | CNPJ validado pelos dígitos verificadores | alta |
| `rg` | RG com contexto ("RG", "identidade") | média |
| `email` | endereço de e-mail | média |
| `br_phone` | telefone brasileiro com **DDD válido** | média |
| `cep` | CEP | baixa |
| `card` | cartão de pagamento validado pelo **algoritmo de Luhn** | crítica |
| `jwt` | token de sessão (JWT) | crítica |
| `anthropic_key`, `generic_secret_key`, `supabase_secret` | chaves secretas de serviços | crítica |
| `supabase_publishable` | chave pública do banco fora do lugar | baixa |
| `expo_push_token` | endereço de notificação do aparelho | média |
| `password_kv` | senha escrita em texto (`senha=...`, `password: ...`) | alta |
| `cid10` | código de doença CID-10 (só com contexto de saúde) | alta |
| `health_keyword` | termos de saúde em texto livre | média |
| `geo_precise` | par de coordenadas com 4+ casas decimais dentro do Brasil | alta |
| `geo_single` | coordenada isolada de alta precisão | média |

**Por que é robusto:**
- Cada regra só reporta se a **validação** passar (dígito verificador, Luhn, DDD, faixa geográfica), o que derruba falsos positivos. Os testes conferem que 1.000 CPFs válidos são todos detectados e que, de 1.000 números aleatórios de 11 dígitos, só cerca de 1% passa como CPF, como esperado matematicamente.
- Regras ambíguas (CID-10, RG) exigem **palavras de contexto** por perto.
- Achados que se sobrepõem são resolvidos ficando o mais específico.
- Cada achado sai com uma **prévia mascarada** (`***.***.***-35`, `[REDACTED:jwt]`); o valor original nunca é guardado. Os testes serializam os resultados e confirmam que o valor bruto não aparece.

**Scanner do repositório:** `node scripts/pii-scan.mjs --fail-on-critical` varre todos os arquivos versionados e os seeds SQL e grava [pii-scan-report.md](pii-scan-report.md). Exceções (CPFs falsos usados em testes) ficam em `scripts/pii-scan-allowlist.json`, cada uma com justificativa. Resultado atual: **0 achados críticos fora da allowlist**.

## 2. Taint Analysis (3,0 pts)

O dado digitado pelo usuário ou vindo de fora é tratado como **contaminado** (tainted) desde a origem até a saída. Antes de chegar a uma saída insegura, ele é bloqueado ou mascarado.

**Origens:** texto digitado, parâmetros de rota e deep link, respostas de APIs externas, dados da conta e da fazenda, erros do servidor e coordenadas da propriedade.

**Saídas (sinks) e política** (`src/security/taint/policy.ts`):

| Saída | Ação |
| --- | --- |
| `console` (logs) | mascara tudo; `safeLog` é o único ponto autorizado a escrever no console (o ESLint proíbe `console` no resto do código) |
| `geocode_http` (busca de endereço) | **bloqueia** dado pessoal antes de sair para o Nominatim |
| `weather_http` (clima) | coordenadas arredondadas a 2 casas (~1 km) |
| `service_error`, `ui_error` | mensagem neutra; a causa técnica vira só `{name, code}` |
| `push_payload` | mascara documentos e chaves no texto da notificação |
| `llm_prompt` | **bloqueia** qualquer PII antes de chegar à IA |
| `open_url` | bloqueia credenciais e dados pessoais em links |
| `db_write` | **bloqueia** dado pessoal em campos que não deveriam ter (ex.: CPF no nome do sensor) |
| armazenamento no aparelho | o cache do Início não guarda endereço, CEP, contorno nem coordenada exata e passa os textos pelo motor de PII |

**Duas camadas:**
1. **Em execução** (`guardSink`, `unwrapFor`): aplica a política, registra um evento com regra, severidade, saída e prévia mascarada e lança `TaintBlockedError` quando bloqueia.
2. **Estática** (`scripts/taint-audit.mjs`): usa a API do compilador TypeScript para seguir o dado por variáveis, templates, objetos, desestruturação, chamadas de função e `useState`, e classifica cada fluxo em `blocked`, `sanitized` ou `unsafe`.

**Evidência (ver [auditoria-prototipo.md](auditoria-prototipo.md)):**
- App atual: **56 fluxos analisados — 1 bloqueado, 55 sanitizados, 0 inseguros**.
- **Prova de detecção:** o arquivo `scripts/fixtures/taint-vulnerable.ts` vaza dados de propósito; o detector precisa flagrar pelo menos 3 fluxos inseguros nele (console, fetch e erro) e nenhum nas versões protegidas (`--self-test`).
- **Em ação:** 13 testes com valores sintéticos provam o bloqueio de verdade (CPF barrado antes da busca de endereço, e-mail mascarado no log, causa de erro reduzida, coordenadas arredondadas, prompt da IA bloqueado, push mascarado, campos rejeitando PII, ausência de SQL dinâmico e de injeção de HTML).

## 3. Tradução via IA (2,0 pts)

A Edge Function `explain-risk` (Supabase) usa o **Claude Opus 5.5** (SDK oficial da Anthropic) para transformar cada tipo de achado em um alerta claro em português, no formato:

```json
{ "titulo": "...", "risco_real": "...", "o_que_fazer": "...", "nivel": "baixo | moderado | alto | critico" }
```

**Segurança da própria IA:**
- A função só recebe **ids de regra permitidos** (`cpf`, `email`, ...), gravidade, saída e contagem. Nenhum texto do usuário entra no prompt, então não há como injetar instruções na IA.
- Antes de chamar a IA, o prompt é verificado: se contiver qualquer dado sensível, a chamada é recusada.
- A resposta é validada contra um esquema JSON estrito (tamanhos, valores permitidos, sem links, números longos ou e-mails).
- Exige usuário logado (JWT verificado) e responde com CORS.
- Se a chave não existir, a IA recusar, a chamada falhar ou a resposta vier inválida, o app usa **textos padrão** equivalentes (selo "Texto padrão" em vez de "Explicado por IA"). O app nunca fica sem explicação.
- Traduções são guardadas por tipo de achado para não pagar duas vezes pela mesma explicação.

**Como ativar:**
1. Crie uma chave em [platform.claude.com](https://platform.claude.com) (Settings > API Keys) e coloque créditos na conta.
2. No Supabase, em **Edge Functions > Secrets**, crie `ANTHROPIC_API_KEY` com a chave. Ela nunca vai para o app, o `.env`, o git ou o ZIP.
3. Crie a função **`explain-risk`** com os arquivos `supabase/functions/explain-risk/index.ts` e `logic.ts`, com **Verify JWT** ligado.

## 4. Dashboard Executivo — Risco Cidadão (2,0 pts)

Tela **Perfil > Segurança e privacidade** (`src/app/(app)/seguranca.tsx`), no celular e no navegador. Mostra:
- O **indicador Risco Cidadão** de 0 a 100 com o nível (ícone + texto + cor).
- Contadores por categoria e gravidade.
- **Vazamentos bloqueados** e achados recentes, sempre com prévia mascarada.
- Os **alertas traduzidos pela IA** ("O que isso significa").
- Botão **Rodar auditoria**, que varre os dados da conta com o motor de PII.

**Fórmula** (`src/security/score.ts`, com testes): para cada evento não resolvido,

`pontos = peso(gravidade) × min(ocorrências, 5) × multiplicador(ação)`

- Pesos: baixa 1, média 4, alta 10, crítica 25.
- Multiplicadores: detectado 1, mascarado 0,5, bloqueado 0,25 (o bloqueio reduz o risco, mas mostra comportamento arriscado).
- `nota = round(100 × (1 − e^(−soma/60)))`: cresce rápido no começo e satura perto de 100.

| Nota | Nível |
| --- | --- |
| 0 a 24 | baixo |
| 25 a 49 | moderado |
| 50 a 74 | alto |
| 75 a 100 | crítico |

Exemplos testados: 1 achado crítico = 34, 3 = 71, 5 = 88.

Os eventos ficam na tabela `security_events` (migração `010_security_events.sql`) com RLS por dono. Só a função `record_security_events` grava, validando cada campo e limitando o volume. Nunca é guardado o valor do dado, só metadados e a prévia mascarada.

**Como gerar o print/vídeo do indicador:** abra o painel (risco baixo) → em "+" > Fazenda, digite `Rua das Flores 111.444.777-35` no Endereço (CPF de teste) → o app bloqueia → volte ao painel (risco sobe, vazamento bloqueado aparece) → **Rodar auditoria**. Detalhes em `docs/seguranca/dashboard/README.txt`.

---

## Sanitização de todos os campos de entrada

- **Componente central:** todo campo de texto do app usa `src/components/ui/Input.tsx` com sanitização embutida: remove caracteres de controle, invisíveis (zero-width, bidi) e `<`/`>`, normaliza Unicode e aplica limite de tamanho.
- **Política por campo** (`src/lib/security/fieldPolicies.ts`): nome, nome da fazenda, rua, bairro, cidade, cultura e nome do sensor têm lista de caracteres permitidos, limite igual ao do banco e **rejeitam dado pessoal** ("Não coloque CPF, telefone ou outros dados pessoais neste campo.").
- **Texto vindo de APIs** (endereço retornado pela busca de CEP) também é sanitizado.
- **SQL injection:** o app só usa consultas parametrizadas do Supabase (PostgREST e RPC); não existe SQL montado com texto. O teste `src/security/sqlAudit.test.ts` falha se alguma migração usar `execute` com concatenação. O ESLint proíbe template strings em filtros (`.or`, `.ilike`, `.like`, `.filter`).
- **XSS:** `src/security/noDangerousSinks.test.ts` garante que não existem `dangerouslySetInnerHTML`, `innerHTML`, `eval` ou `new Function`. O mapa (Leaflet) roda em iframe isolado e nunca recebe texto do usuário.
- **Banco:** `CHECK` de tamanho, formato e caracteres de controle nas colunas de texto; RLS em todas as tabelas; o papel anônimo não escreve em nenhuma tabela (migração 009); funções `SECURITY DEFINER` com `search_path` vazio.
- **CSP para a web:** política em `src/security/webCsp.ts`, para ser enviada como cabeçalho `Content-Security-Policy` caso o app seja hospedado.

## Correções no login

| # | Falha encontrada | Correção |
| --- | --- | --- |
| A1 | Qualquer erro desconhecido aparecia como "Sem conexão" | Mapa de erros por código; mensagem neutra para o resto |
| A2 | "Esqueci a senha" dizia "enviado" mesmo sem internet | Falha de rede é informada |
| A3 | Erro de rede contava como tentativa de senha errada | Só senha errada conta para o bloqueio de 5 tentativas |
| A4 | Dois toques rápidos enviavam o formulário duas vezes | Trava contra envio duplo |
| A5 | Senha fraca aceita (`12345678`) | Mínimo de 8 caracteres, pelo menos uma letra e um número, lista de senhas comuns e proibição do próprio e-mail, com mensagem específica para cada caso |
| A6 | O intervalo de 60 s para reenviar o link podia ser burlado | O botão respeita a contagem |
| A7 | Senha longa era cortada sem aviso | Rejeitada com "Senha muito longa" |
| A8 | Erro do cadastro identificado por pedaço de texto | Erro vem com o campo certo |
| A9 | Sair da conta não limpava dados locais | Limpa a fazenda selecionada e o cache do aparelho |
| A10 | "Usuário já existe" revelava que o e-mail tinha conta | Mensagem neutra (evita enumeração de contas) |

Também foi corrigido um travamento do Início ("Preparando sua propriedade…" para sempre) causado pela limpeza do cache no primeiro login, e todas as chamadas ao Supabase ganharam prazo de 20 s.

## Como verificar tudo

| Objetivo | Comando |
| --- | --- |
| Todos os testes | `npm test` |
| Só segurança | `npx jest src/security src/lib/security src/features/auth` |
| Scanner de PII + relatório | `node scripts/pii-scan.mjs --fail-on-critical` |
| Taint estático + testes de evidência + relatório | `node scripts/taint-audit.mjs --with-tests --fail-on-unsafe` |
| Prova de que o detector pega vazamentos | `node scripts/taint-audit.mjs --self-test` |
| Banco protegido (migração 010) | `node --env-file-if-exists=.env scripts/probe-010.mjs` |
| ZIP de entrega | `node scripts/build-zip.mjs` |

Os scripts `.mjs` exigem Node 22.18 ou superior.

## ZIP de entrega

`node scripts/build-zip.mjs` gera `dist-zip/AgroAlerta-Cybersecurity-<data>.zip` sem precisar de nenhum programa instalado. O ZIP leva o código do app e do módulo (`src/security`, regras de PII, Edge Function, migrações, scripts e estes relatórios) e **exclui** `.env*` (mantém só o `.env.example`, sem valores), `node_modules`, `.git` e certificados. Antes de gravar, ele varre cada arquivo com o motor de PII e **se recusa a gerar o ZIP** se encontrar uma credencial.

## Arquivos desta pasta

| Arquivo | Conteúdo |
| --- | --- |
| `README-cybersecurity.md` | este documento |
| `auditoria-prototipo.md` / `.json` | Auditoria do protótipo: fluxos do taint, evidências em ação e prova de detecção |
| `pii-scan-report.md` / `.json` | resultado do scanner de PII no repositório |
| `dashboard/` | prints e vídeo do painel Risco Cidadão |
