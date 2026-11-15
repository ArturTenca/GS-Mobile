-- AgroAlerta - 008 (manual): configura o push de alertas no banco
-- Rode UMA vez no SQL Editor do Supabase, depois de aplicar a migration 008 e publicar a Edge Function push-alert.
-- Substitua os dois valores entre < > abaixo. NAO commite este arquivo com valores reais.
--
--   <URL_DA_FUNCAO>           : Supabase dashboard > Edge Functions > push-alert > URL
--                               (termina em /functions/v1/push-alert)
--   <SEGREDO_COMPARTILHADO>   : qualquer texto longo e aleatorio; use o MESMO valor no secret
--                               PUSH_SHARED_SECRET da Edge Function.
--
-- Idempotente: rodar de novo apenas atualiza os valores.

-- Extensao pg_net (necessaria para o gatilho chamar a funcao). Descomente se ainda nao estiver ativa;
-- se o projeto nao permitir, use um Database Webhook em alerts (INSERT) apontando para a funcao.
-- create extension if not exists pg_net;

insert into private.push_config (id, function_url, shared_secret)
values (true, '<URL_DA_FUNCAO>', '<SEGREDO_COMPARTILHADO>')
on conflict (id) do update
  set function_url = excluded.function_url,
      shared_secret = excluded.shared_secret;
