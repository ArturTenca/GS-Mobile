# AgroAlerta + AgroVigia

![Expo SDK 58](https://img.shields.io/badge/Expo-SDK%2058-000020) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6) ![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20Postgres-3ecf8e)

Aplicativo de monitoramento agrícola para o pequeno e médio produtor rural. O produtor abre o app e entende na hora se a propriedade está **Normal**, em **Atenção** ou **Crítica**, e o que fazer em seguida. O mesmo código roda no **navegador** (React Native Web) e no **celular** (Expo Go ou build nativo), com backend no **Supabase**.

> Entrega de **Mobile Development & IOT** (este arquivo). A entrega de **Cybersecurity** está documentada em [docs/seguranca/README-cybersecurity.md](docs/seguranca/README-cybersecurity.md).

> Sensores, medições e alertas de exemplo são **dados demonstrativos** e aparecem com esse rótulo no app. Não há sensor ESP32 real nem previsão científica de ML nesta entrega.

## Ficha da CitizenTech

| Campo | Conteúdo |
| --- | --- |
| Nome do projeto | AgroAlerta + AgroVigia |
| Integrantes / RM | Artur Alves Tenca RM 555171    João Pedro Signor Avelar RM 558375    Roger Cardoso Ferreira RM 557230
| Turma |3ESPW |
| Problema | O produtor rural precisa saber se a propriedade está Normal, em Atenção ou Crítica (clima, umidade do solo, temperatura) sem conhecimento técnico e sem ficar diante de um computador. |
| Público | Pequenos e médios produtores rurais. |
| Jornada principal do cidadão | **Consultar** (Início: condição da propriedade, clima e indicadores), **registrar** (cadastrar fazenda e sensores, definir limites) e **receber informação** (central de Alertas com filtros e status). |
| Solução | App com painel simples de condição, alertas preventivos com recomendação, análises de risco demonstrativas e painel de privacidade. |
| URL do repositório | https://github.com/ArturTenca/GS-Mobile |

## O que o app faz

- **Conta:** login, cadastro e recuperação de senha (Supabase Auth). Senha nova com no mínimo 8 caracteres, pelo menos uma letra e um número.
- **Início:** condição da propriedade, clima atual e previsão de 7 dias do bairro/cidade da fazenda (Open-Meteo), indicadores e alertas recentes.
- **Cadastro de fazenda por CEP** (BrasilAPI / ViaCEP) com desenho do limite no mapa.
- **Cadastro de sensor** posicionado dentro da fazenda no mapa.
- **Monitoramento:** sensores com valor, unidade e estado; acesso às **Análises** (gráficos e classificação de risco demonstrativos).
- **Alertas:** lista com filtros por status, categoria e gravidade; detalhe com a leitura que gerou o alerta; marcar como visualizado/resolvido; contador de pendentes na aba.
- **Perfil:** tema claro/escuro, unidade de temperatura, limites dos sensores, preferências de notificação e **Segurança e privacidade** (painel Risco Cidadão).

## Aderência aos critérios de avaliação

| Critério | Onde está |
| --- | --- |
| Telas e navegação | Expo Router: abas em `src/app/(app)/(tabs)/` (Início, Monitoramento, Alertas, Perfil) com botão "+" central (`src/components/layout/TabBar.tsx`); `alerta/[id].tsx`, `adicionar/{fazenda,sensor}.tsx`, `analises.tsx`, `seguranca.tsx`; autenticação em `src/app/(auth)/` e `reset-password.tsx`. |
| Consumo de dados | API Open-Meteo (`src/services/weather.ts`), APIs de CEP (`src/services/geocoding.ts`) e Supabase (`src/services/*`), sempre com estados de carregando, vazio e erro (`AsyncBoundary`). |
| Banco de dados | Supabase Postgres com RLS por dono (`supabase/migrations/001..010`). Fazenda, sensor, limites, status de alerta, preferências e eventos de segurança são gravados e lidos de volta. |
| Acessibilidade | Rótulos e papéis para leitor de tela, alvos de toque de pelo menos 48dp, estado por ícone + texto + cor, tema claro/escuro. Checklist em [docs/acessibilidade.md](docs/acessibilidade.md). |
| Aderência ao problema | Jornada consultar, registrar e receber informação (ver Ficha). |
| Documentação | Este README, [docs/roteiro-video.md](docs/roteiro-video.md), [docs/acessibilidade.md](docs/acessibilidade.md) e a documentação de Cybersecurity. |

## Tecnologias

Expo SDK 58, React Native 0.88, React Native Web, Expo Router, TypeScript, Supabase (Auth, Postgres, RLS, Edge Functions), TanStack React Query, Zustand, react-native-gifted-charts, Leaflet e Open-Meteo.

## Como rodar

### 1. Pré-requisitos

- Node.js 22.18 ou superior e npm.
- Uma conta gratuita no [Supabase](https://supabase.com).
- Um navegador (Chrome, Firefox, Edge) e, para testar no celular, o app **Expo Go**.

### 2. Instalar

```bash
git clone https://github.com/ArturTenca/GS-Mobile.git
cd GS-Mobile
npm install
```

### 3. Configurar o Supabase

1. Crie um projeto no Supabase.
2. Copie `.env.example` para `.env` e preencha com os valores de **Project Settings > API**:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<seu-projeto>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<chave anon/publishable>
   ```
   Use somente a chave **anon/publishable**. Nunca coloque a chave `service_role` no app e nunca faça commit do `.env`.
3. Crie o banco no **SQL Editor** do Supabase:
   - **Projeto novo:** cole e execute `supabase/setup_completo.sql` (inclui as migrações 001 a 010).
   - **Projeto que já rodou versões antigas:** execute `supabase/atualizar_004_007.sql` e depois, em ordem, `supabase/migrations/008_alerts_engine.sql`, `009_revoke_anon_writes.sql` e `010_security_events.sql`. Todos podem ser executados mais de uma vez.
4. Em **Authentication > Providers > Email**, desligue **Confirm email** para o cadastro entrar direto (opcional).
5. (Opcional) Alertas de exemplo: execute `supabase/manual/seed_alertas_demo.sql`.
6. (Opcional) Explicações por IA no painel de segurança: siga a seção "Remediação com IA" em [docs/seguranca/README-cybersecurity.md](docs/seguranca/README-cybersecurity.md). Sem essa etapa o app funciona e usa textos padrão.

### 4. Rodar no navegador (web)

**Para apresentar, gravar o vídeo ou tirar prints (abre na hora):**

```bash
npm run web:rapido
```

Gera o build de produção (cerca de 10 s) e serve o site localmente. Abra o endereço mostrado no terminal (normalmente `http://localhost:8081`). Depois de alterar o código, rode o comando de novo. Se a página parecer antiga, recarregue com **Ctrl+Shift+R**.

**Para desenvolver (recarrega ao salvar):**

```bash
npm run web
```

O modo de desenvolvimento compila o app inteiro na primeira abertura (cerca de 10 a 15 s); as aberturas seguintes são rápidas.

Para ver o app com formato de celular no navegador, use o modo responsivo (**Ctrl+Shift+M**).

### 5. Rodar no celular

```bash
npm start          # mostra um QR code: abra com o Expo Go
npm run android    # emulador ou aparelho Android
npm run ios        # simulador iOS (macOS)
```

### 6. Verificações

```bash
npm test           # testes automatizados (jest)
npm run typecheck  # verificação de tipos
npm run lint       # ESLint
```

## Desempenho

- O app abre sem esperar a checagem do servidor; ela roda em segundo plano.
- O último Início visto fica guardado no aparelho (sem endereço, CEP nem coordenada exata) e aparece na hora; os dados novos chegam em seguida.
- Toda chamada ao Supabase tem prazo de 20 s: se a conexão travar, aparece "Tentar de novo" em vez de carregar para sempre.
- Ícones importados um a um e só 2 pesos da fonte Inter: o JS inicial caiu de cerca de 4,2 MB para 1,7 MB.

## Dados demonstrativos

Sensores, medições, alertas e análises de exemplo são simulados e aparecem com o rótulo "Dados demonstrativos". Em **Análises**, o botão "Gerar dados demonstrativos" recria 30 dias de leituras para os sensores da fazenda selecionada.

## Prints

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

Roteiro: problema e Ficha, login e Início, cadastro de fazenda e sensor, Alertas, ajuste de limites no Perfil, acessibilidade e fechamento. Detalhes em [docs/roteiro-video.md](docs/roteiro-video.md).

## Estrutura do projeto

```
src/app         rotas (Expo Router): (auth), (app)/(tabs), adicionar, alerta, analises, seguranca
src/components  UI reutilizável, layout, mapa, clima, perfil, segurança
src/features    lógica por domínio (auth, alertas, condição, limites)
src/hooks       hooks de dados (React Query)
src/services    acesso ao Supabase e às APIs externas
src/security    motor de PII, taint, remediação e nota Risco Cidadão
src/lib         cliente Supabase, sanitização e utilitários
src/stores      estado de interface (Zustand)
src/theme       tokens de design
supabase/       migrações, setup_completo.sql, SQL manual e Edge Functions
scripts/        auditorias (PII, taint), probes do banco e empacotamento
docs/           roteiro do vídeo, acessibilidade, prints e documentação de segurança
```

## Limitações

- Sem sensor ESP32 real; medições, alertas iniciais e análises são demonstrativos.
- Fora do escopo desta entrega: tela de detalhe e histórico de cada sensor e cadastro de áreas de plantio.
- Push com o app fechado está em finalização: depende de build de desenvolvimento (EAS) em aparelho físico; no navegador o app mostra um aviso de que push não está disponível.

## Créditos

- Dados meteorológicos: [Open-Meteo](https://open-meteo.com/) (CC BY 4.0).
- CEP: BrasilAPI e ViaCEP. Mapas: OpenStreetMap e Esri.
- Equipe: [CONFIRMAR PELA EQUIPE: nomes e RM]
