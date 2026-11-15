-- AgroAlerta - 005: ultima leitura por sensor (view com RLS do chamador)
-- Depende de: 001, 002
--
-- IMPORTANTE (projetos que ja rodaram 001..004):
--   Este arquivo NAO e aplicado sozinho. Abra o SQL Editor do Supabase,
--   cole todo o conteudo deste arquivo e clique em Run.
--   E seguro rodar mais de uma vez (create or replace view / grant).
--   REQUER Postgres 15 ou superior (security_invoker). Confira a versao antes:
--     select version();
--   Em Postgres 14 ou anterior a view ignoraria o RLS e vazaria leituras de
--   outros produtores: NAO rode este arquivo nesse caso.
-- Projetos novos: basta colar supabase/setup_completo.sql (ja inclui esta 005).

create or replace view public.latest_readings
with (security_invoker = true) as
select s.property_id, r.sensor_id, r.id as reading_id, r.recorded_at, r.value, r.is_demo
from public.sensors s
cross join lateral (
  select id, sensor_id, recorded_at, value, is_demo
  from public.readings
  where sensor_id = s.id
  order by recorded_at desc
  limit 1
) r;

revoke all on public.latest_readings from public, anon;
grant select on public.latest_readings to authenticated;
