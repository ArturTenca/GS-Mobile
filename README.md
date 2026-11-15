# AgroAlerta + AgroVigia

![Expo SDK 58](https://img.shields.io/badge/Expo-SDK%2058-000020) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6) ![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20Postgres-3ecf8e)

Aplicativo de monitoramento agrícola para o pequeno e médio produtor rural, pensado para o celular. O produtor abre o app e entende na hora se a propriedade está **Normal**, em **Atenção** ou **Crítica**, e o que fazer em seguida. Roda no celular (Expo Go / build nativo) e no navegador (React Native Web), com backend no Supabase.

> Os sensores, medições e alertas de demonstração são **dados demonstrativos**, rotulados como tal no app. Não há sensor ESP32 real nem previsão científica de ML nesta entrega.

## Ficha da CitizenTech

| Campo | Conteúdo |
| --- | --- |
| Nome do projeto | AgroAlerta + AgroVigia |
| Integrantes / RM | [CONFIRMAR PELA EQUIPE: nomes e RM dos integrantes] |
| Eixo / tema / ODS | [CONFIRMAR PELA EQUIPE: eixo e ODS conforme a Ficha oficial] |
| Problema | O produtor rural precisa saber se a propriedade está Normal, em Atenção ou Crítica (clima, umidade do solo, temperatura) sem conhecimento técnico e sem ficar diante de um computador. |
| Público | Pequenos e médios produtores rurais. |
| Jornada principal do cidadão | **Consultar** (Início: condição da propriedade, clima e indicadores), **registrar** (cadastrar fazenda e sensores, definir limites) e **receber informação** (central de Alertas com filtros e status; push em finalização). |
| Solução | App mobile-first com painel simples de condição, alertas preventivos com recomendação e análises de risco demonstrativas. |
| URL do repositório | [CONFIRMAR PELA EQUIPE: URL do repositório] |
| Demais campos da Ficha oficial | [CONFIRMAR PELA EQUIPE: copiar da Ficha oficial do enunciado] |

## Funcionalidades

Somente o que existe hoje no app:

- Login, cadastro e recuperação de senha (Supabase Auth).
- **Início**: condição da propriedade, clima atual e previsão (Open-Meteo), indicadores e alertas recentes.
- Cadastro de **fazenda por CEP** com desenho do limite no mapa.
- Cadastro de **sensor** posicionado no mapa.
- **Monitoramento**: lista de sensores com valor, unidade e estado.
- **Alertas**: lista com filtros, detalhe, marcar como visualizado/resolvido e contador (badge) de pendentes.
- **Análises**: classificações de risco e gráficos com **dados demonstrativos**.
- **Perfil**: tema claro/escuro, unidades, limites de temperatura/umidade e preferências de notificação.

## Aderência aos critérios do professor

| Critério | Onde está no app |
| --- | --- |
| Telas e navegação | Abas JS em `src/app/(app)/(tabs)/` (Início, Monitoramento, Alertas, Perfil) com botão "+" central (`src/components/layout/TabBar.tsx`); detalhe `alerta/[id].tsx`; fluxos `adicionar/{fazenda,sensor}.tsx`; `analises.tsx`; autenticação em `src/app/(auth)/` e `reset-password.tsx`. |
| Consumo de dados | Open-Meteo (`src/services/weather.ts`, `WeatherCard`), consulta de CEP (`src/services/geocoding.ts`) e Supabase (`src/services/*`), com estados de carregando, vazio e erro (`AsyncBoundary`, `LoadingState`, `ErrorState`, `EmptyState`). |
| Banco de dados | Supabase Postgres com RLS por dono: `supabase/migrations/001..009` e `supabase/setup_completo.sql`. Fazenda, sensor, limites, status de alerta e preferências são gravados e lidos de volta. |
| Acessibilidade | Rótulos e papéis em componentes `src/components/ui/*`, alvos >= 48dp, tema claro/escuro. Detalhes e checklist em [docs/acessibilidade.md](docs/acessibilidade.md). |
| Aderência ao problema | Jornada consultar, registrar e receber informação (ver Ficha). |
| Documentação | Este README, [docs/roteiro-video.md](docs/roteiro-video.md) e [docs/acessibilidade.md](docs/acessibilidade.md). |

## Tecnologias

Expo SDK 58, React Native 0.88, Expo Router, TypeScript, Supabase (Auth, Postgres, RLS), TanStack React Query, Zustand, react-native-gifted-charts, Leaflet (WebView/iframe) e Open-Meteo.

## Como rodar

Requisitos: Node >= 22.13, npm, uma conta gratuita no Supabase e Expo Go ou um navegador.

```bash
git clone [CONFIRMAR PELA EQUIPE: URL do repositório]
cd GS-Mobile
npm install
```

1. **Variáveis de ambiente**: copie `.env.example` para `.env` e preencha as duas variáveis (`EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY`) com os valores do seu projeto Supabase (Project Settings, API). Nunca faça commit do `.env`.
2. **Banco novo**: no SQL Editor do Supabase, cole e execute `supabase/setup_completo.sql` (já inclui as migrações 001 a 009).
3. **Banco já existente**: execute `supabase/atualizar_004_007.sql` e, depois, as migrações `008` e `009` de `supabase/migrations/`.
4. **Auth**: em Authentication, desligue "Confirm email"; caso contrário o cadastro pede confirmação por e-mail.
5. Execute:

```bash
npm run web        # navegador
npm start          # QR code para o Expo Go
npm run android    # emulador/dispositivo Android
npm run ios        # simulador iOS
npm test           # testes (jest)
npm run typecheck  # verificação de tipos
```

Push de notificações: **em finalização (Fase 4)**; exige build de desenvolvimento (EAS) em dispositivo físico e no web mostra apenas um aviso.

## Dados demonstrativos

Sensores, medições, alertas e análises iniciais são simulados e aparecem com o rótulo "Dados demonstrativos". Para criar alertas de exemplo em uma conta, use `supabase/manual/seed_alertas_demo.sql` no SQL Editor.

## Prints

Os prints serão adicionados em `docs/prints/`.

![Login](docs/prints/00-login.png)
![Início](docs/prints/01-inicio.png)
![Monitoramento](docs/prints/02-monitoramento.png)
![Alertas](docs/prints/03-alertas.png)
![Detalhe do alerta](docs/prints/04-alerta-detalhe.png)
![Nova fazenda](docs/prints/05-fazenda.png)
![Novo sensor](docs/prints/06-sensor.png)
![Análises](docs/prints/07-analises.png)
![Perfil e limites](docs/prints/08-perfil.png)

## Vídeo (até 3 minutos)

[COLAR LINK DO VÍDEO]

Resumo: problema e Ficha, login e Início, cadastro de fazenda e sensor, Alertas, ajuste de limites no Perfil, acessibilidade e fechamento. Roteiro completo em [docs/roteiro-video.md](docs/roteiro-video.md).

## Acessibilidade

- Alvos de toque de pelo menos 48dp (botões pequenos ampliados com `hitSlop`).
- Rótulos e papéis para leitor de tela nos controles.
- Estado indicado por ícone e texto, não apenas por cor.
- Respeito à escala de fonte do sistema.
- Tema claro e escuro.

Checklist manual: [docs/acessibilidade.md](docs/acessibilidade.md).

## Estrutura do projeto

```
src/app         rotas (Expo Router): (auth), (app)/(tabs), adicionar, alerta
src/components  UI reutilizável, layout, mapa, clima, perfil
src/features    lógica por domínio (ex.: notificações)
src/hooks       hooks de dados (React Query)
src/services    repositórios Supabase / Open-Meteo
src/lib         cliente Supabase e utilitários
src/stores      estado de UI (Zustand)
src/theme       tokens de design
supabase/       migrações, setup_completo.sql, SQL manual, Edge Function
scripts/        verificações (regras de UI e probes de RLS/RPC)
```

## Segurança e limitações

- RLS por dono em todas as tabelas; a migração 009 remove escrita do papel anônimo.
- O app usa apenas a chave anônima (pública por natureza); nenhuma chave service-role está no app.
- Sem sensor ESP32 real; análises e medições são demonstrativas.
- Fora do escopo desta entrega: detalhe de sensor, histórico de sensor e CRUD de áreas de plantio.
- Push de notificações: em finalização (Fase 4); não afirmamos funcionamento completo.

## Créditos

- Dados meteorológicos: [Open-Meteo](https://open-meteo.com/) (CC BY 4.0).
- Mapas: OpenStreetMap e Esri.
- Equipe: [CONFIRMAR PELA EQUIPE: nomes e RM]
