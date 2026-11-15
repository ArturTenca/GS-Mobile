-- AgroAlerta - 006b: limpeza OPCIONAL da fazenda demo clonada de UM usuario
--
-- OPCIONAL e MANUAL. NUNCA e executado automaticamente por nenhuma migration.
-- Serve apenas para quem quer remover a fazenda demo que foi clonada para a
-- propria conta antes da migration 006 (decisao D-01: contas existentes
-- mantem seus dados por padrao).
--
-- ATENCAO: apaga a fazenda demo desse usuario e, em cascata, areas, sensores,
-- leituras, alertas, limites e analises ligados a ela. Nao ha desfazer.
--
-- Como usar: troque <USER-UUID> pelo id do usuario (Authentication > Users)
-- e rode no SQL Editor do Supabase.

delete from public.properties
 where is_demo
   and owner_id = '<USER-UUID>';
