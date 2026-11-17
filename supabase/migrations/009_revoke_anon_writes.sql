-- AgroAlerta - 009: anon nao escreve em nenhuma tabela do app
-- Depende de: 001..008
--
-- IMPORTANTE (projetos que ja rodaram 001..008):
--   Cole todo o conteudo deste arquivo no SQL Editor do Supabase e clique em Run.
--   E idempotente: seguro rodar mais de uma vez.
-- Projetos novos: basta colar supabase/setup_completo.sql (ja inclui esta 009).
--
-- Por que: o Supabase concede por padrao INSERT/UPDATE/DELETE/TRUNCATE ao papel anon em
-- tabelas novas do schema public. O RLS ja bloqueava (nenhuma politica para anon), mas o
-- privilegio sobrava: o probe-008 via PATCH anonimo responder 204 (0 linhas). Agora o
-- banco recusa com 401/42501 antes mesmo do RLS. Leitura (SELECT) continua sob RLS.

begin;

revoke insert, update, delete, truncate on all tables in schema public from anon;

-- tabelas criadas no futuro pelo dono do schema tambem nascem sem escrita para anon
alter default privileges in schema public revoke insert, update, delete, truncate on tables from anon;

commit;

