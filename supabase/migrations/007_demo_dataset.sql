-- AgroAlerta - 007: gerador de dados demo (30 dias de leituras por hora) para uma fazenda
-- Depende de: 001, 002, 003, 004, 005, 006
--
-- IMPORTANTE (projetos que ja rodaram 001..006) - [BLOCKING]:
--   Este arquivo NAO e aplicado sozinho. Abra o SQL Editor do Supabase,
--   cole todo o conteudo deste arquivo e clique em Run.
--   E idempotente: seguro rodar mais de uma vez (add column if not exists,
--   create or replace).
-- Projetos novos: basta colar supabase/setup_completo.sql (ja inclui esta 007).
--
-- O que muda:
--   * properties ganha demo_data_generated_at (NAO entra no grant de UPDATE da 002:
--     so a funcao security definer abaixo escreve nela).
--   * private.generate_sensor_readings gera leituras horarias demo (ciclos diarios,
--     ruido e algumas excursoes fora dos limites da fazenda).
--   * public.generate_demo_dataset(p_property_id) substitui as leituras is_demo de todos
--     os sensores da fazenda por 30 dias novos. Apenas o dono; limite de 1 chamada por minuto
--     (SQLSTATE AG429); linhas com is_demo = false nunca sao tocadas.
--   * register_sensor (006) deliberadamente NAO e recriado aqui: duplicaria o corpo
--     critico do ponto-em-poligono. As formulas base abaixo sao as mesmas da 006.

begin;

-- ---------------------------------------------------------------------
-- (1) properties: marca de ultima geracao (somente leitura para clientes)
-- ---------------------------------------------------------------------
alter table public.properties add column if not exists demo_data_generated_at timestamptz;

-- ---------------------------------------------------------------------
-- (2) Gerador por sensor (interno)
-- ---------------------------------------------------------------------
create or replace function private.generate_sensor_readings(
  p_sensor uuid,
  p_property uuid,
  p_type public.sensor_type,
  p_start timestamptz,
  p_end timestamptz
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_seed int := abs(hashtext(p_sensor::text)) % 1000;
  v_min double precision;
  v_max double precision;
  v_mod int := case when abs(hashtext(p_sensor::text)) % 2 = 0 then 9 else 11 end;
  v_count integer;
begin
  select th.min_value, th.max_value into v_min, v_max
    from public.thresholds th
   where th.property_id = p_property and th.sensor_type = p_type;

  if v_min is null then
    v_min := case p_type when 'temperature' then 10 when 'air_humidity' then 30 else 25 end;
  end if;
  if v_max is null then
    v_max := case p_type when 'temperature' then 32 when 'air_humidity' then 85 else 80 end;
  end if;

  insert into public.readings (sensor_id, property_id, recorded_at, value, is_demo)
  select p_sensor, p_property, pts.ts,
    round(least(100, greatest(case when p_type = 'temperature' then -50 else 0 end, base.v))::numeric, 1),
    true
  from (
    select g.ts,
           extract(epoch from (g.ts - p_start)) / 3600.0 as h,
           extract(hour from (g.ts at time zone 'America/Sao_Paulo')) as hr,
           floor(extract(epoch from (g.ts - p_start)) / 86400.0)::int as d
    from generate_series(p_start, p_end, interval '1 hour') as g(ts)
  ) src
  cross join lateral (
    select src.ts as ts, src.h as h, src.hr as hr,
           -- excursao deterministica: um dia a cada v_mod dias, em janela curta de 4 horas
           (src.d % v_mod = v_seed % v_mod
            and src.hr between
              (case p_type when 'temperature' then 13 when 'air_humidity' then 3 else 10 end)
              and
              (case p_type when 'temperature' then 16 when 'air_humidity' then 6 else 13 end)) as exc
  ) pts
  cross join lateral (
    select
      (
        case p_type
          when 'temperature' then 24 + 5 * sin(2 * pi() * (pts.hr - 9) / 24.0)
          when 'air_humidity' then 70 - 12 * sin(2 * pi() * (pts.hr - 9) / 24.0)
          else 58 - 4 * ((pts.h / 24.0) - 5 * floor(pts.h / 120.0))
        end
        + 0.4 * sin(pts.h * 1.7 + v_seed * 3.1) + 0.3 * sin(pts.h * 0.53 + v_seed)
      )
      + case
          when not pts.exc then 0
          when p_type = 'soil_moisture' then
            -- abaixo do minimo: ignora a curva e empurra 3 a 6 unidades para baixo do limite
            (v_min - (3 + (v_seed % 4))) - (
              58 - 4 * ((pts.h / 24.0) - 5 * floor(pts.h / 120.0))
              + 0.4 * sin(pts.h * 1.7 + v_seed * 3.1) + 0.3 * sin(pts.h * 0.53 + v_seed))
          else
            -- acima do maximo: 3 a 6 unidades alem do limite
            (v_max + (3 + (v_seed % 4))) - (
              case p_type
                when 'temperature' then 24 + 5 * sin(2 * pi() * (pts.hr - 9) / 24.0)
                else 70 - 12 * sin(2 * pi() * (pts.hr - 9) / 24.0)
              end
              + 0.4 * sin(pts.h * 1.7 + v_seed * 3.1) + 0.3 * sin(pts.h * 0.53 + v_seed))
        end as v
  ) base;

  get diagnostics v_count = row_count;

  update public.sensors set last_seen_at = p_end where id = p_sensor;

  return v_count;
end;
$$;
revoke all on function private.generate_sensor_readings(uuid, uuid, public.sensor_type, timestamptz, timestamptz) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- (3) RPC publica: gera os 30 dias demo da fazenda (somente o dono)
-- ---------------------------------------------------------------------
create or replace function public.generate_demo_dataset(p_property_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_last timestamptz;
  v_end timestamptz := date_trunc('hour', now());
  v_start timestamptz := date_trunc('hour', now()) - interval '30 days';
  v_sensor record;
  v_sensors integer := 0;
  v_rows integer := 0;
  v_n integer;
  v_found uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  -- trava a linha da fazenda (serializa toques duplos) e confere o dono; ausente e alheia dao o mesmo erro
  select p.id, p.demo_data_generated_at into v_found, v_last
    from public.properties p
   where p.id = p_property_id and p.owner_id = v_uid
     for update;
  if v_found is null then
    raise exception 'Fazenda nao encontrada.' using errcode = '42501';
  end if;

  if v_last is not null and v_last > now() - interval '1 minute' then
    raise exception 'Aguarde um minuto para gerar os dados de novo.' using errcode = 'AG429';
  end if;

  -- apaga somente leituras demo dos sensores desta fazenda
  delete from public.readings r
   using public.sensors s
   where r.sensor_id = s.id
     and s.property_id = p_property_id
     and r.is_demo = true;

  for v_sensor in
    select s.id, s.type from public.sensors s where s.property_id = p_property_id order by s.created_at, s.id
  loop
    v_n := private.generate_sensor_readings(v_sensor.id, p_property_id, v_sensor.type, v_start, v_end);
    v_sensors := v_sensors + 1;
    v_rows := v_rows + v_n;
  end loop;

  update public.properties set demo_data_generated_at = now() where id = p_property_id;

  return jsonb_build_object('sensors', v_sensors, 'readings', v_rows, 'generated_at', now());
end;
$$;
revoke all on function public.generate_demo_dataset(uuid) from public, anon;
grant execute on function public.generate_demo_dataset(uuid) to authenticated;

commit;
