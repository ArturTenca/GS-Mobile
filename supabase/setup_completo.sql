-- =====================================================================
-- AgroAlerta - SETUP COMPLETO (gerado a partir de migrations/001..007)
-- Cole TUDO no SQL Editor do Supabase (projeto novo) e clique em Run.
-- Roda em uma unica transacao: se algo falhar, nada e aplicado.
-- Fonte da verdade continua sendo supabase/migrations/*.sql
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- migrations/001_schema.sql
-- ---------------------------------------------------------------------
-- AgroAlerta - 001: enums + tabelas
-- Depende de: nada (projeto Supabase novo)
-- Rode na ordem 001 -> 002 -> 003 no SQL Editor do Supabase, em um projeto novo.

create type public.sensor_type as enum ('temperature', 'air_humidity', 'soil_moisture');
create type public.alert_category as enum ('temperature_high','soil_moisture_low','air_humidity_high','heavy_rain','unfavorable_weather','sensor_offline');
create type public.alert_severity as enum ('info', 'warning', 'critical');
create type public.alert_status as enum ('novo', 'visualizado', 'resolvido');
create type public.risk_type as enum ('drought', 'excessive_heat', 'high_humidity', 'unfavorable_weather');
create type public.risk_level as enum ('baixo', 'moderado', 'alto');

create table public.producers (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 120),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.producers (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  city text,
  state char(2),
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index properties_owner_idx on public.properties (owner_id);
create unique index properties_one_demo_per_owner on public.properties (owner_id) where is_demo;

create table public.planting_areas (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  crop text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index planting_areas_property_idx on public.planting_areas (property_id);

create table public.sensors (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  area_id uuid references public.planting_areas (id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  type public.sensor_type not null,
  unit text not null,
  last_seen_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index sensors_property_idx on public.sensors (property_id);

create table public.readings (
  id bigint generated always as identity primary key,
  sensor_id uuid not null references public.sensors (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  recorded_at timestamptz not null,
  value numeric(7,2) not null,
  is_demo boolean not null default false
);
create index readings_sensor_time_idx on public.readings (sensor_id, recorded_at desc);
create index readings_property_idx on public.readings (property_id);

create table public.thresholds (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  sensor_type public.sensor_type not null,
  min_value numeric(7,2),
  max_value numeric(7,2),
  unique (property_id, sensor_type)
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  sensor_id uuid references public.sensors (id) on delete set null,
  reading_id bigint references public.readings (id) on delete set null,
  category public.alert_category not null,
  severity public.alert_severity not null,
  status public.alert_status not null default 'novo',
  title text not null,
  description text not null,
  recommendation text not null,
  triggered_at timestamptz not null,
  is_demo boolean not null default false
);
create index alerts_property_status_idx on public.alerts (property_id, status, triggered_at desc);

create table public.risk_analyses (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  risk public.risk_type not null,
  level public.risk_level not null,
  indicators jsonb not null default '{}'::jsonb,
  explanation text not null,
  recommendation text not null,
  analyzed_at timestamptz not null default now(),
  is_demo boolean not null default false
);
create index risk_analyses_property_idx on public.risk_analyses (property_id, analyzed_at desc);

create table public.climate_snapshots (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  condition text not null,
  description text not null,
  temperature_c numeric(4,1),
  humidity_pct numeric(4,1),
  rain_probability_pct smallint,
  observed_at timestamptz not null default now(),
  is_demo boolean not null default false
);
create index climate_property_idx on public.climate_snapshots (property_id, observed_at desc);

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.producers (id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('ios','android')),
  created_at timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- migrations/002_rls.sql
-- ---------------------------------------------------------------------
-- AgroAlerta - 002: RLS por dono (per-owner)
-- Depende de: 001
-- Rode na ordem no SQL Editor do Supabase. Cria o schema private usado pela 003.

create schema if not exists private;
grant usage on schema private to authenticated;
create or replace function private.is_property_owner(p_property uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.properties p where p.id = p_property and p.owner_id = (select auth.uid()));
$$;
revoke all on function private.is_property_owner(uuid) from public, anon;
grant execute on function private.is_property_owner(uuid) to authenticated;

alter table public.producers enable row level security;
alter table public.properties enable row level security;
alter table public.planting_areas enable row level security;
alter table public.sensors enable row level security;
alter table public.readings enable row level security;
alter table public.thresholds enable row level security;
alter table public.alerts enable row level security;
alter table public.risk_analyses enable row level security;
alter table public.climate_snapshots enable row level security;
alter table public.push_tokens enable row level security;

-- producers: own row; only full_name / onboarding editable
create policy producers_select on public.producers for select to authenticated using (id = (select auth.uid()));
create policy producers_update on public.producers for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke update on public.producers from authenticated;
grant update (full_name, onboarding_completed_at) on public.producers to authenticated;

-- properties
create policy properties_select on public.properties for select to authenticated using (owner_id = (select auth.uid()));
create policy properties_insert on public.properties for insert to authenticated with check (owner_id = (select auth.uid()) and is_demo = false);
create policy properties_update on public.properties for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy properties_delete on public.properties for delete to authenticated using (owner_id = (select auth.uid()) and is_demo = false);
revoke update on public.properties from authenticated;
grant update (name, city, state) on public.properties to authenticated;

-- planting_areas / sensors / thresholds: owner CRUD (client cannot create is_demo rows)
create policy areas_all on public.planting_areas for all to authenticated using (private.is_property_owner(property_id)) with check (private.is_property_owner(property_id) and is_demo = false);
create policy sensors_all on public.sensors for all to authenticated using (private.is_property_owner(property_id)) with check (private.is_property_owner(property_id) and is_demo = false);
create policy thresholds_all on public.thresholds for all to authenticated using (private.is_property_owner(property_id)) with check (private.is_property_owner(property_id));

-- readings / risk_analyses / climate_snapshots: read-only for the app (writes = seed / backend)
create policy readings_select on public.readings for select to authenticated using (private.is_property_owner(property_id));
create policy risk_select on public.risk_analyses for select to authenticated using (private.is_property_owner(property_id));
create policy climate_select on public.climate_snapshots for select to authenticated using (private.is_property_owner(property_id));

-- alerts: read + status change only
create policy alerts_select on public.alerts for select to authenticated using (private.is_property_owner(property_id));
create policy alerts_update on public.alerts for update to authenticated using (private.is_property_owner(property_id)) with check (private.is_property_owner(property_id));
revoke update on public.alerts from authenticated;
grant update (status) on public.alerts to authenticated;

-- push_tokens: own rows
create policy push_all on public.push_tokens for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));


-- ---------------------------------------------------------------------
-- migrations/003_demo_farm.sql
-- ---------------------------------------------------------------------
-- AgroAlerta - 003: fazenda demo por usuario + trigger de cadastro
-- Depende de: 001, 002 (schema private criado na 002)
-- Rode na ordem no SQL Editor do Supabase.

create or replace function private.clone_demo_farm(p_uid uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prop uuid;
  v_a1 uuid; v_a2 uuid; v_a3 uuid;
  v_s1 uuid; v_s2 uuid; v_s3 uuid; v_s4 uuid; v_s5 uuid; v_s6 uuid;
  v_end timestamptz := date_trunc('hour', now());
  v_start timestamptz := date_trunc('hour', now()) - interval '30 days';
  v_soil numeric; v_temp numeric; v_hum numeric;
  v_soil_min numeric; v_temp_max numeric; v_hum_max numeric;
  v_rain int := 80;
begin
  perform pg_advisory_xact_lock(hashtext(p_uid::text));

  select id into v_prop from public.properties where owner_id = p_uid and is_demo limit 1;
  if v_prop is not null then
    return v_prop;  -- idempotent
  end if;

  insert into public.properties (owner_id, name, city, state, is_demo)
  values (p_uid, 'Minha Propriedade', 'Ibiúna', 'SP', true) returning id into v_prop;

  insert into public.planting_areas (property_id, name, crop, is_demo) values (v_prop, 'Horta de Folhosas', 'Alface', true) returning id into v_a1;
  insert into public.planting_areas (property_id, name, crop, is_demo) values (v_prop, 'Pomar de Laranja', 'Laranja', true) returning id into v_a2;
  insert into public.planting_areas (property_id, name, crop, is_demo) values (v_prop, 'Milharal', 'Milho', true) returning id into v_a3;

  insert into public.sensors (property_id, area_id, name, type, unit, is_demo) values (v_prop, v_a1, 'Temperatura da Horta', 'temperature', '°C', true) returning id into v_s1;
  insert into public.sensors (property_id, area_id, name, type, unit, is_demo) values (v_prop, v_a1, 'Umidade do Ar da Horta', 'air_humidity', '%', true) returning id into v_s2;
  insert into public.sensors (property_id, area_id, name, type, unit, is_demo) values (v_prop, v_a1, 'Umidade do Solo da Horta', 'soil_moisture', '%', true) returning id into v_s3;
  insert into public.sensors (property_id, area_id, name, type, unit, is_demo) values (v_prop, v_a2, 'Umidade do Solo do Pomar', 'soil_moisture', '%', true) returning id into v_s4;
  insert into public.sensors (property_id, area_id, name, type, unit, is_demo) values (v_prop, v_a2, 'Temperatura do Pomar', 'temperature', '°C', true) returning id into v_s5;
  insert into public.sensors (property_id, area_id, name, type, unit, is_demo) values (v_prop, v_a2, 'Umidade do Ar do Pomar', 'air_humidity', '%', true) returning id into v_s6;

  insert into public.thresholds (property_id, sensor_type, min_value, max_value) values
    (v_prop, 'temperature', 10, 32),
    (v_prop, 'air_humidity', 30, 85),
    (v_prop, 'soil_moisture', 25, 80);

  -- ~30 days of hourly readings. h = hours since start. Sensor 5 went offline 52h ago.
  insert into public.readings (sensor_id, property_id, recorded_at, value, is_demo)
  with prof(sensor_id, kind, base, seed, stop_h) as (
    values (v_s1, 'temp', 24.0, 1.0, 0), (v_s2, 'hum', 72.0, 2.0, 0), (v_s3, 'soil_dry', 0.0, 3.0, 0),
           (v_s4, 'soil_ok', 38.0, 4.0, 0), (v_s5, 'temp', 23.0, 5.0, 52), (v_s6, 'hum', 70.0, 6.0, 0)
  ), pts as (
    select g.ts,
           extract(epoch from (g.ts - v_start)) / 3600.0 as h,
           extract(hour from (g.ts at time zone 'America/Sao_Paulo')) as hr
    from generate_series(v_start, v_end, interval '1 hour') as g(ts)
  )
  select p.sensor_id, v_prop, pts.ts,
    round((
      case p.kind
        when 'temp' then p.base + 5 * sin(2 * pi() * (pts.hr - 9) / 24.0)
                         + case when pts.h between 300 and 340 then 6 * sin(pi() * (pts.h - 300) / 40.0) else 0 end
        when 'hum' then p.base - 12 * sin(2 * pi() * (pts.hr - 9) / 24.0)
                        + case when pts.h between 560 and 600 then 14 * sin(pi() * (pts.h - 560) / 40.0) else 0 end
        when 'soil_ok' then p.base + 4 * sin(pts.h / 50.0)
        else case
               when pts.h >= 528 then 41 - 21 * ((pts.h - 528) / 192.0)
               else 41 - (case when floor(pts.h / 144) = 2 then 19 else 12 end) * ((pts.h - 144 * floor(pts.h / 144)) / 144.0)
             end
      end
      + 0.4 * sin(pts.h * 1.7 + p.seed * 3.1) + 0.3 * sin(pts.h * 0.53 + p.seed)
    )::numeric, 1), true
  from prof p cross join pts
  where pts.ts <= v_end - (p.stop_h * interval '1 hour');

  update public.sensors s
     set last_seen_at = (select max(r.recorded_at) from public.readings r where r.sensor_id = s.id)
   where s.property_id = v_prop;

  insert into public.climate_snapshots (property_id, condition, description, temperature_c, humidity_pct, rain_probability_pct, observed_at, is_demo)
  values (v_prop, 'Nublado', 'Céu nublado com possibilidade de chuva forte no fim da tarde.', 27.0, 74.0, v_rain, now(), true);

  -- Alerts derived from the SAME readings + thresholds (gaps-and-islands, >= 3 out-of-range hourly readings, gaps <= 6h merged)
  insert into public.alerts (property_id, sensor_id, reading_id, category, severity, status, title, description, recommendation, triggered_at, is_demo)
  with ordered as (
    select r.id, r.sensor_id, r.recorded_at, r.value, s.type, s.name, s.unit, th.min_value, th.max_value,
           row_number() over (partition by r.sensor_id order by r.recorded_at) as rn,
           ((s.type in ('temperature', 'air_humidity') and r.value > th.max_value)
            or (s.type = 'soil_moisture' and r.value < th.min_value)) as bad
    from public.readings r
    join public.sensors s on s.id = r.sensor_id
    join public.thresholds th on th.property_id = r.property_id and th.sensor_type = s.type
    where r.property_id = v_prop
  ), bad as (
    select x.*, sum(x.new_ep) over (partition by x.sensor_id order by x.recorded_at) as grp
    from (
      select o.*,
             case when o.recorded_at - lag(o.recorded_at) over (partition by o.sensor_id order by o.recorded_at) > interval '6 hours'
                  then 1 else 0 end as new_ep
      from ordered o where o.bad
    ) x
  ), ep as (
    select sensor_id, type, name, unit, grp,
           min(recorded_at) as started, max(recorded_at) as ended, count(*) as n,
           (array_agg(id order by recorded_at))[1] as first_reading,
           min(value) as vmin, max(value) as vmax, max(min_value) as tmin, max(max_value) as tmax
    from bad group by sensor_id, type, name, unit, grp
    having count(*) >= 3
  )
  select v_prop, e.sensor_id, e.first_reading,
    case e.type when 'temperature' then 'temperature_high' when 'soil_moisture' then 'soil_moisture_low' else 'air_humidity_high' end::public.alert_category,
    (case when (case when e.type = 'soil_moisture' then (e.tmin - e.vmin) / e.tmin else (e.vmax - e.tmax) / e.tmax end) >= 0.15
          then 'critical' else 'warning' end)::public.alert_severity,
    (case when e.ended = (select max(r.recorded_at) from public.readings r where r.sensor_id = e.sensor_id) then 'novo'
          when e.ended < v_end - interval '48 hours' then 'resolvido' else 'visualizado' end)::public.alert_status,
    case e.type when 'temperature' then 'Temperatura acima do limite'
                when 'soil_moisture' then 'Solo seco: umidade abaixo do mínimo'
                else 'Umidade do ar acima do limite' end,
    case e.type
      when 'soil_moisture' then format('%s registrou %s%s, abaixo do mínimo de %s%s.', e.name, replace(round(e.vmin, 1)::text, '.', ','), e.unit, replace(round(e.tmin, 0)::text, '.', ','), e.unit)
      else format('%s registrou %s%s, acima do limite de %s%s.', e.name, replace(round(e.vmax, 1)::text, '.', ','), e.unit, replace(round(e.tmax, 0)::text, '.', ','), e.unit)
    end,
    case e.type when 'temperature' then 'Evite trabalhos pesados nas horas mais quentes e reforce a irrigação no fim da tarde.'
                when 'soil_moisture' then 'Programe a irrigação desta área hoje, de preferência no início da manhã.'
                else 'Melhore a ventilação e observe sinais de fungo nas folhas.' end,
    e.started, true
  from ep e;

  -- Offline sensor alert (no reading for > 3h)
  insert into public.alerts (property_id, sensor_id, category, severity, status, title, description, recommendation, triggered_at, is_demo)
  select v_prop, s.id, 'sensor_offline', 'warning', 'novo', 'Sensor sem comunicação',
         format('%s não envia dados há mais de 3 horas.', s.name),
         'Verifique a bateria, o sinal e a conexão do sensor.',
         s.last_seen_at + interval '3 hours', true
  from public.sensors s where s.property_id = v_prop and s.last_seen_at < now() - interval '3 hours';

  -- Rain alert from the climate snapshot
  insert into public.alerts (property_id, category, severity, status, title, description, recommendation, triggered_at, is_demo)
  select v_prop, 'heavy_rain', 'warning', 'novo', 'Possibilidade de chuva forte',
         format('Há %s%% de chance de chuva forte nas próximas horas.', c.rain_probability_pct),
         'Adie adubação e pulverização; confira o escoamento nas áreas baixas.',
         now() - interval '30 minutes', true
  from public.climate_snapshots c where c.property_id = v_prop and c.rain_probability_pct >= 70;

  -- Risk analyses derived from latest readings + thresholds
  select value into v_soil from public.readings where sensor_id = v_s3 order by recorded_at desc limit 1;
  select value into v_temp from public.readings where sensor_id = v_s1 order by recorded_at desc limit 1;
  select value into v_hum from public.readings where sensor_id = v_s2 order by recorded_at desc limit 1;
  select min_value into v_soil_min from public.thresholds where property_id = v_prop and sensor_type = 'soil_moisture';
  select max_value into v_temp_max from public.thresholds where property_id = v_prop and sensor_type = 'temperature';
  select max_value into v_hum_max from public.thresholds where property_id = v_prop and sensor_type = 'air_humidity';

  insert into public.risk_analyses (property_id, risk, level, indicators, explanation, recommendation, is_demo) values
    (v_prop, 'drought',
      (case when v_soil < v_soil_min then 'alto' when v_soil < v_soil_min + 5 then 'moderado' else 'baixo' end)::public.risk_level,
      jsonb_build_object('umidade_solo_pct', v_soil, 'limite_minimo_pct', v_soil_min),
      'A umidade do solo da horta está abaixo do mínimo configurado. Análise demonstrativa baseada em regras.',
      'Programe irrigação para as próximas horas.', true),
    (v_prop, 'excessive_heat',
      (case when v_temp > v_temp_max then 'alto' when v_temp > v_temp_max - 3 then 'moderado' else 'baixo' end)::public.risk_level,
      jsonb_build_object('temperatura_c', v_temp, 'limite_maximo_c', v_temp_max),
      'A temperatura atual está dentro do limite. Análise demonstrativa baseada em regras.',
      'Sem ação necessária agora.', true),
    (v_prop, 'high_humidity',
      (case when v_hum > v_hum_max then 'alto' when v_hum > v_hum_max - 5 then 'moderado' else 'baixo' end)::public.risk_level,
      jsonb_build_object('umidade_ar_pct', v_hum, 'limite_maximo_pct', v_hum_max),
      'A umidade do ar está dentro do limite. Análise demonstrativa baseada em regras.',
      'Mantenha a ventilação da horta.', true),
    (v_prop, 'unfavorable_weather',
      (case when v_rain >= 90 then 'alto' when v_rain >= 70 then 'moderado' else 'baixo' end)::public.risk_level,
      jsonb_build_object('chance_chuva_pct', v_rain),
      'Há chance de chuva forte. Análise demonstrativa baseada em regras.',
      'Adie pulverização e adubação.', true);

  return v_prop;
end;
$$;
revoke all on function private.clone_demo_farm(uuid) from public, anon, authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.producers (id, full_name)
  values (new.id, left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1), 'Produtor'), 120))
  on conflict (id) do nothing;

  begin
    perform private.clone_demo_farm(new.id);
  exception when others then
    raise warning 'clone_demo_farm failed for %: %', new.id, sqlerrm;  -- never block signup
  end;
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;

-- Safety grant (assumption A7): on hosted Supabase the auth service runs the trigger as
-- supabase_auth_admin; without these grants signup can fail with "Database error saving new user".
-- clone_demo_farm is intentionally NOT granted to anyone (only called from definer functions).
grant usage on schema private to supabase_auth_admin;
grant execute on function private.handle_new_user() to supabase_auth_admin;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Self-heal for users whose trigger clone failed (called by the app when no property is found)
create or replace function public.ensure_demo_farm()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  insert into public.producers (id, full_name)
  select u.id, left(coalesce(nullif(trim(u.raw_user_meta_data ->> 'name'), ''), split_part(u.email, '@', 1), 'Produtor'), 120)
  from auth.users u where u.id = v_uid
  on conflict (id) do nothing;
  return private.clone_demo_farm(v_uid);
end;
$$;
revoke all on function public.ensure_demo_farm() from public, anon;
grant execute on function public.ensure_demo_farm() to authenticated;


-- ---------------------------------------------------------------------
-- migrations/004_review_fixes.sql
-- ---------------------------------------------------------------------
-- AgroAlerta - 004: correcoes da revisao de codigo da fase 01
-- Depende de: 001, 002, 003
--
-- IMPORTANTE (projetos que ja rodaram 001..003):
--   Este arquivo NAO e aplicado sozinho. Abra o SQL Editor do Supabase,
--   cole todo o conteudo deste arquivo e clique em Run.
--   E seguro rodar mais de uma vez (drop policy if exists / create or replace).
-- Projetos novos: basta colar supabase/setup_completo.sql (ja inclui esta 004).

-- ---------------------------------------------------------------------
-- WR-06: dono pode editar areas/sensores demo; is_demo e property_id imutaveis
-- A politica "for all" aplicava "is_demo = false" tambem no UPDATE: linhas demo
-- nao podiam ser editadas, a menos que o cliente apagasse o rotulo demo.
-- Agora: politicas por comando (is_demo = false so no INSERT) + UPDATE apenas
-- nas colunas editaveis. is_demo / property_id nao podem ser alterados pelo app.
-- ---------------------------------------------------------------------

drop policy if exists areas_all on public.planting_areas;
drop policy if exists areas_select on public.planting_areas;
drop policy if exists areas_insert on public.planting_areas;
drop policy if exists areas_update on public.planting_areas;
drop policy if exists areas_delete on public.planting_areas;

create policy areas_select on public.planting_areas for select to authenticated
  using (private.is_property_owner(property_id));
create policy areas_insert on public.planting_areas for insert to authenticated
  with check (private.is_property_owner(property_id) and is_demo = false);
create policy areas_update on public.planting_areas for update to authenticated
  using (private.is_property_owner(property_id))
  with check (private.is_property_owner(property_id));
create policy areas_delete on public.planting_areas for delete to authenticated
  using (private.is_property_owner(property_id));

revoke update on public.planting_areas from authenticated;
grant update (name, crop) on public.planting_areas to authenticated;

drop policy if exists sensors_all on public.sensors;
drop policy if exists sensors_select on public.sensors;
drop policy if exists sensors_insert on public.sensors;
drop policy if exists sensors_update on public.sensors;
drop policy if exists sensors_delete on public.sensors;

create policy sensors_select on public.sensors for select to authenticated
  using (private.is_property_owner(property_id));
create policy sensors_insert on public.sensors for insert to authenticated
  with check (private.is_property_owner(property_id) and is_demo = false);
create policy sensors_update on public.sensors for update to authenticated
  using (private.is_property_owner(property_id))
  with check (private.is_property_owner(property_id));
create policy sensors_delete on public.sensors for delete to authenticated
  using (private.is_property_owner(property_id));

revoke update on public.sensors from authenticated;
grant update (name, area_id) on public.sensors to authenticated;

-- ---------------------------------------------------------------------
-- WR-07: sensors.area_id so pode apontar para uma area da MESMA propriedade
-- A FK ignora RLS: sem esta checagem, um usuario poderia ligar seu sensor a
-- uma area de outro dono. O trigger roda ANTES da FK, entao tambem nao
-- revela se um id de area de outra propriedade existe.
-- ---------------------------------------------------------------------

create or replace function private.sensors_area_same_property()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.area_id is not null and not exists (
    select 1 from public.planting_areas a
    where a.id = new.area_id and a.property_id = new.property_id
  ) then
    raise exception 'A area do sensor deve pertencer a mesma propriedade.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.sensors_area_same_property() from public, anon;

create or replace trigger sensors_area_same_property
  before insert or update of area_id, property_id on public.sensors
  for each row execute function private.sensors_area_same_property();

-- ---------------------------------------------------------------------
-- WR-11: texto das analises de risco demo coerente com o nivel calculado
-- O nivel (baixo/moderado/alto) depende da hora do cadastro, mas a explicacao
-- e a recomendacao eram fixas ("dentro do limite" / "Sem acao necessaria").
-- Agora o texto sai da mesma regra do nivel (private.demo_risk_text), a
-- clone_demo_farm e recriada usando-a, e as linhas demo ja existentes sao
-- corrigidas pelo UPDATE no fim desta secao.
-- ---------------------------------------------------------------------

create or replace function private.demo_risk_text(p_risk public.risk_type, p_level public.risk_level)
returns table (explanation text, recommendation text)
language sql immutable set search_path = '' as $$
  select v.explanation, v.recommendation
  from (values
    ('drought'::public.risk_type, 'alto'::public.risk_level,
      'A umidade do solo da horta está abaixo do mínimo configurado. Análise demonstrativa baseada em regras.',
      'Programe irrigação para as próximas horas.'),
    ('drought', 'moderado',
      'A umidade do solo da horta está perto do mínimo configurado. Análise demonstrativa baseada em regras.',
      'Acompanhe a umidade do solo e prepare a irrigação.'),
    ('drought', 'baixo',
      'A umidade do solo da horta está adequada. Análise demonstrativa baseada em regras.',
      'Sem ação necessária agora.'),
    ('excessive_heat', 'alto',
      'A temperatura atual está acima do limite máximo. Análise demonstrativa baseada em regras.',
      'Irrigue nas horas mais frescas e proteja as mudas do sol forte.'),
    ('excessive_heat', 'moderado',
      'A temperatura atual está perto do limite máximo. Análise demonstrativa baseada em regras.',
      'Acompanhe a temperatura nas horas mais quentes do dia.'),
    ('excessive_heat', 'baixo',
      'A temperatura atual está dentro do limite. Análise demonstrativa baseada em regras.',
      'Sem ação necessária agora.'),
    ('high_humidity', 'alto',
      'A umidade do ar está acima do limite máximo. Análise demonstrativa baseada em regras.',
      'Melhore a ventilação e observe sinais de fungos nas folhas.'),
    ('high_humidity', 'moderado',
      'A umidade do ar está perto do limite máximo. Análise demonstrativa baseada em regras.',
      'Mantenha a ventilação da horta.'),
    ('high_humidity', 'baixo',
      'A umidade do ar está dentro do limite. Análise demonstrativa baseada em regras.',
      'Sem ação necessária agora.'),
    ('unfavorable_weather', 'alto',
      'Há grande chance de chuva forte. Análise demonstrativa baseada em regras.',
      'Adie pulverização e adubação; confira o escoamento das áreas baixas.'),
    ('unfavorable_weather', 'moderado',
      'Há chance de chuva forte. Análise demonstrativa baseada em regras.',
      'Adie pulverização e adubação.'),
    ('unfavorable_weather', 'baixo',
      'Sem previsão de chuva forte. Análise demonstrativa baseada em regras.',
      'Sem ação necessária agora.')
  ) as v (risk, level, explanation, recommendation)
  where v.risk = p_risk and v.level = p_level;
$$;
revoke all on function private.demo_risk_text(public.risk_type, public.risk_level) from public, anon, authenticated;

create or replace function private.clone_demo_farm(p_uid uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prop uuid;
  v_a1 uuid; v_a2 uuid; v_a3 uuid;
  v_s1 uuid; v_s2 uuid; v_s3 uuid; v_s4 uuid; v_s5 uuid; v_s6 uuid;
  v_end timestamptz := date_trunc('hour', now());
  v_start timestamptz := date_trunc('hour', now()) - interval '30 days';
  v_soil numeric; v_temp numeric; v_hum numeric;
  v_soil_min numeric; v_temp_max numeric; v_hum_max numeric;
  v_rain int := 80;
begin
  perform pg_advisory_xact_lock(hashtext(p_uid::text));

  select id into v_prop from public.properties where owner_id = p_uid and is_demo limit 1;
  if v_prop is not null then
    return v_prop;  -- idempotent
  end if;

  insert into public.properties (owner_id, name, city, state, is_demo)
  values (p_uid, 'Minha Propriedade', 'Ibiúna', 'SP', true) returning id into v_prop;

  insert into public.planting_areas (property_id, name, crop, is_demo) values (v_prop, 'Horta de Folhosas', 'Alface', true) returning id into v_a1;
  insert into public.planting_areas (property_id, name, crop, is_demo) values (v_prop, 'Pomar de Laranja', 'Laranja', true) returning id into v_a2;
  insert into public.planting_areas (property_id, name, crop, is_demo) values (v_prop, 'Milharal', 'Milho', true) returning id into v_a3;

  insert into public.sensors (property_id, area_id, name, type, unit, is_demo) values (v_prop, v_a1, 'Temperatura da Horta', 'temperature', '°C', true) returning id into v_s1;
  insert into public.sensors (property_id, area_id, name, type, unit, is_demo) values (v_prop, v_a1, 'Umidade do Ar da Horta', 'air_humidity', '%', true) returning id into v_s2;
  insert into public.sensors (property_id, area_id, name, type, unit, is_demo) values (v_prop, v_a1, 'Umidade do Solo da Horta', 'soil_moisture', '%', true) returning id into v_s3;
  insert into public.sensors (property_id, area_id, name, type, unit, is_demo) values (v_prop, v_a2, 'Umidade do Solo do Pomar', 'soil_moisture', '%', true) returning id into v_s4;
  insert into public.sensors (property_id, area_id, name, type, unit, is_demo) values (v_prop, v_a2, 'Temperatura do Pomar', 'temperature', '°C', true) returning id into v_s5;
  insert into public.sensors (property_id, area_id, name, type, unit, is_demo) values (v_prop, v_a2, 'Umidade do Ar do Pomar', 'air_humidity', '%', true) returning id into v_s6;

  insert into public.thresholds (property_id, sensor_type, min_value, max_value) values
    (v_prop, 'temperature', 10, 32),
    (v_prop, 'air_humidity', 30, 85),
    (v_prop, 'soil_moisture', 25, 80);

  -- ~30 days of hourly readings. h = hours since start. Sensor 5 went offline 52h ago.
  insert into public.readings (sensor_id, property_id, recorded_at, value, is_demo)
  with prof(sensor_id, kind, base, seed, stop_h) as (
    values (v_s1, 'temp', 24.0, 1.0, 0), (v_s2, 'hum', 72.0, 2.0, 0), (v_s3, 'soil_dry', 0.0, 3.0, 0),
           (v_s4, 'soil_ok', 38.0, 4.0, 0), (v_s5, 'temp', 23.0, 5.0, 52), (v_s6, 'hum', 70.0, 6.0, 0)
  ), pts as (
    select g.ts,
           extract(epoch from (g.ts - v_start)) / 3600.0 as h,
           extract(hour from (g.ts at time zone 'America/Sao_Paulo')) as hr
    from generate_series(v_start, v_end, interval '1 hour') as g(ts)
  )
  select p.sensor_id, v_prop, pts.ts,
    round((
      case p.kind
        when 'temp' then p.base + 5 * sin(2 * pi() * (pts.hr - 9) / 24.0)
                         + case when pts.h between 300 and 340 then 6 * sin(pi() * (pts.h - 300) / 40.0) else 0 end
        when 'hum' then p.base - 12 * sin(2 * pi() * (pts.hr - 9) / 24.0)
                        + case when pts.h between 560 and 600 then 14 * sin(pi() * (pts.h - 560) / 40.0) else 0 end
        when 'soil_ok' then p.base + 4 * sin(pts.h / 50.0)
        else case
               when pts.h >= 528 then 41 - 21 * ((pts.h - 528) / 192.0)
               else 41 - (case when floor(pts.h / 144) = 2 then 19 else 12 end) * ((pts.h - 144 * floor(pts.h / 144)) / 144.0)
             end
      end
      + 0.4 * sin(pts.h * 1.7 + p.seed * 3.1) + 0.3 * sin(pts.h * 0.53 + p.seed)
    )::numeric, 1), true
  from prof p cross join pts
  where pts.ts <= v_end - (p.stop_h * interval '1 hour');

  update public.sensors s
     set last_seen_at = (select max(r.recorded_at) from public.readings r where r.sensor_id = s.id)
   where s.property_id = v_prop;

  insert into public.climate_snapshots (property_id, condition, description, temperature_c, humidity_pct, rain_probability_pct, observed_at, is_demo)
  values (v_prop, 'Nublado', 'Céu nublado com possibilidade de chuva forte no fim da tarde.', 27.0, 74.0, v_rain, now(), true);

  -- Alerts derived from the SAME readings + thresholds (gaps-and-islands, >= 3 out-of-range hourly readings, gaps <= 6h merged)
  insert into public.alerts (property_id, sensor_id, reading_id, category, severity, status, title, description, recommendation, triggered_at, is_demo)
  with ordered as (
    select r.id, r.sensor_id, r.recorded_at, r.value, s.type, s.name, s.unit, th.min_value, th.max_value,
           row_number() over (partition by r.sensor_id order by r.recorded_at) as rn,
           ((s.type in ('temperature', 'air_humidity') and r.value > th.max_value)
            or (s.type = 'soil_moisture' and r.value < th.min_value)) as bad
    from public.readings r
    join public.sensors s on s.id = r.sensor_id
    join public.thresholds th on th.property_id = r.property_id and th.sensor_type = s.type
    where r.property_id = v_prop
  ), bad as (
    select x.*, sum(x.new_ep) over (partition by x.sensor_id order by x.recorded_at) as grp
    from (
      select o.*,
             case when o.recorded_at - lag(o.recorded_at) over (partition by o.sensor_id order by o.recorded_at) > interval '6 hours'
                  then 1 else 0 end as new_ep
      from ordered o where o.bad
    ) x
  ), ep as (
    select sensor_id, type, name, unit, grp,
           min(recorded_at) as started, max(recorded_at) as ended, count(*) as n,
           (array_agg(id order by recorded_at))[1] as first_reading,
           min(value) as vmin, max(value) as vmax, max(min_value) as tmin, max(max_value) as tmax
    from bad group by sensor_id, type, name, unit, grp
    having count(*) >= 3
  )
  select v_prop, e.sensor_id, e.first_reading,
    case e.type when 'temperature' then 'temperature_high' when 'soil_moisture' then 'soil_moisture_low' else 'air_humidity_high' end::public.alert_category,
    (case when (case when e.type = 'soil_moisture' then (e.tmin - e.vmin) / e.tmin else (e.vmax - e.tmax) / e.tmax end) >= 0.15
          then 'critical' else 'warning' end)::public.alert_severity,
    (case when e.ended = (select max(r.recorded_at) from public.readings r where r.sensor_id = e.sensor_id) then 'novo'
          when e.ended < v_end - interval '48 hours' then 'resolvido' else 'visualizado' end)::public.alert_status,
    case e.type when 'temperature' then 'Temperatura acima do limite'
                when 'soil_moisture' then 'Solo seco: umidade abaixo do mínimo'
                else 'Umidade do ar acima do limite' end,
    case e.type
      when 'soil_moisture' then format('%s registrou %s%s, abaixo do mínimo de %s%s.', e.name, replace(round(e.vmin, 1)::text, '.', ','), e.unit, replace(round(e.tmin, 0)::text, '.', ','), e.unit)
      else format('%s registrou %s%s, acima do limite de %s%s.', e.name, replace(round(e.vmax, 1)::text, '.', ','), e.unit, replace(round(e.tmax, 0)::text, '.', ','), e.unit)
    end,
    case e.type when 'temperature' then 'Evite trabalhos pesados nas horas mais quentes e reforce a irrigação no fim da tarde.'
                when 'soil_moisture' then 'Programe a irrigação desta área hoje, de preferência no início da manhã.'
                else 'Melhore a ventilação e observe sinais de fungo nas folhas.' end,
    e.started, true
  from ep e;

  -- Offline sensor alert (no reading for > 3h)
  insert into public.alerts (property_id, sensor_id, category, severity, status, title, description, recommendation, triggered_at, is_demo)
  select v_prop, s.id, 'sensor_offline', 'warning', 'novo', 'Sensor sem comunicação',
         format('%s não envia dados há mais de 3 horas.', s.name),
         'Verifique a bateria, o sinal e a conexão do sensor.',
         s.last_seen_at + interval '3 hours', true
  from public.sensors s where s.property_id = v_prop and s.last_seen_at < now() - interval '3 hours';

  -- Rain alert from the climate snapshot
  insert into public.alerts (property_id, category, severity, status, title, description, recommendation, triggered_at, is_demo)
  select v_prop, 'heavy_rain', 'warning', 'novo', 'Possibilidade de chuva forte',
         format('Há %s%% de chance de chuva forte nas próximas horas.', c.rain_probability_pct),
         'Adie adubação e pulverização; confira o escoamento nas áreas baixas.',
         now() - interval '30 minutes', true
  from public.climate_snapshots c where c.property_id = v_prop and c.rain_probability_pct >= 70;

  -- Risk analyses derived from latest readings + thresholds
  select value into v_soil from public.readings where sensor_id = v_s3 order by recorded_at desc limit 1;
  select value into v_temp from public.readings where sensor_id = v_s1 order by recorded_at desc limit 1;
  select value into v_hum from public.readings where sensor_id = v_s2 order by recorded_at desc limit 1;
  select min_value into v_soil_min from public.thresholds where property_id = v_prop and sensor_type = 'soil_moisture';
  select max_value into v_temp_max from public.thresholds where property_id = v_prop and sensor_type = 'temperature';
  select max_value into v_hum_max from public.thresholds where property_id = v_prop and sensor_type = 'air_humidity';

  insert into public.risk_analyses (property_id, risk, level, indicators, explanation, recommendation, is_demo)
  select v_prop, r.risk, r.level, r.indicators, t.explanation, t.recommendation, true
  from (values
    ('drought'::public.risk_type,
      (case when v_soil < v_soil_min then 'alto' when v_soil < v_soil_min + 5 then 'moderado' else 'baixo' end)::public.risk_level,
      jsonb_build_object('umidade_solo_pct', v_soil, 'limite_minimo_pct', v_soil_min)),
    ('excessive_heat'::public.risk_type,
      (case when v_temp > v_temp_max then 'alto' when v_temp > v_temp_max - 3 then 'moderado' else 'baixo' end)::public.risk_level,
      jsonb_build_object('temperatura_c', v_temp, 'limite_maximo_c', v_temp_max)),
    ('high_humidity'::public.risk_type,
      (case when v_hum > v_hum_max then 'alto' when v_hum > v_hum_max - 5 then 'moderado' else 'baixo' end)::public.risk_level,
      jsonb_build_object('umidade_ar_pct', v_hum, 'limite_maximo_pct', v_hum_max)),
    ('unfavorable_weather'::public.risk_type,
      (case when v_rain >= 90 then 'alto' when v_rain >= 70 then 'moderado' else 'baixo' end)::public.risk_level,
      jsonb_build_object('chance_chuva_pct', v_rain))
  ) as r (risk, level, indicators)
  cross join lateral private.demo_risk_text(r.risk, r.level) as t;

  return v_prop;
end;
$$;
revoke all on function private.clone_demo_farm(uuid) from public, anon, authenticated;

-- Corrige as analises demo ja criadas (texto passa a seguir o nivel gravado).
update public.risk_analyses ra
set (explanation, recommendation) = (
  select t.explanation, t.recommendation from private.demo_risk_text(ra.risk, ra.level) as t
)
where ra.is_demo
  and exists (
    select 1 from private.demo_risk_text(ra.risk, ra.level) as t
    where t.explanation is distinct from ra.explanation
       or t.recommendation is distinct from ra.recommendation
  );


-- ---------------------------------------------------------------------
-- migrations/005_latest_readings.sql
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- migrations/006_farms_sensors_map.sql
-- ---------------------------------------------------------------------
-- AgroAlerta - 006: fazendas com limite no mapa, sensores com coordenadas e RPC register_sensor
-- Depende de: 001, 002, 003, 004, 005
--
-- IMPORTANTE (projetos que ja rodaram 001..005) - [BLOCKING]:
--   Este arquivo NAO e aplicado sozinho. Abra o SQL Editor do Supabase,
--   cole todo o conteudo deste arquivo e clique em Run.
--   E idempotente: seguro rodar mais de uma vez (add column if not exists,
--   drop ... if exists, create or replace).
-- Projetos novos: basta colar supabase/setup_completo.sql (ja inclui esta 006).
--
-- O que muda:
--   * Novos usuarios criam so a linha em producers (sem clonar a fazenda demo).
--   * properties ganha cep, endereco, bairro, cultura principal e limite (GeoJSON Polygon).
--     Area e centro sao SEMPRE recalculados no servidor.
--   * Fazenda real (is_demo = false) recebe limites padrao de alerta.
--   * sensors ganha lat, lng e raio de cobertura.
--   * register_sensor cadastra um sensor simulado dentro do limite da fazenda.

-- ---------------------------------------------------------------------
-- (1) properties: novas colunas
-- ---------------------------------------------------------------------
alter table public.properties add column if not exists cep text;
alter table public.properties add column if not exists address text;
alter table public.properties add column if not exists neighborhood text;
alter table public.properties add column if not exists main_crop text;
alter table public.properties add column if not exists boundary jsonb;
alter table public.properties add column if not exists center_lat double precision;
alter table public.properties add column if not exists center_lng double precision;
alter table public.properties add column if not exists area_ha numeric(12,2);

alter table public.properties drop constraint if exists properties_cep_chk;
alter table public.properties add constraint properties_cep_chk
  check (cep is null or cep ~ '^[0-9]{8}
-- ---------------------------------------------------------------------
-- Conferencia (rode depois, separado):
--   select tablename, rowsecurity from pg_tables where schemaname = 'public' order by 1;
--   -> 10 tabelas, todas com rowsecurity = true
-- Depois crie um usuario de teste (Authentication > Users > Add user) e rode:
--   select count(*) from public.properties;  -- 1 por usuario
--   select count(*) from public.sensors;     -- 6 por usuario
--   select count(*) from public.alerts;      -- 7 por usuario
);
alter table public.properties drop constraint if exists properties_address_chk;
alter table public.properties add constraint properties_address_chk
  check (address is null or char_length(address) <= 160);
alter table public.properties drop constraint if exists properties_neighborhood_chk;
alter table public.properties add constraint properties_neighborhood_chk
  check (neighborhood is null or char_length(neighborhood) <= 120);
alter table public.properties drop constraint if exists properties_main_crop_chk;
alter table public.properties add constraint properties_main_crop_chk
  check (main_crop is null or char_length(main_crop) <= 60);
alter table public.properties drop constraint if exists properties_center_chk;
alter table public.properties add constraint properties_center_chk
  check ((center_lat is null or center_lat between -90 and 90)
     and (center_lng is null or center_lng between -180 and 180));
alter table public.properties drop constraint if exists properties_area_chk;
alter table public.properties add constraint properties_area_chk
  check (area_ha is null or area_ha > 0);

-- ---------------------------------------------------------------------
-- (2) Guarda do limite: valida o GeoJSON e recalcula area/centro no servidor
-- ---------------------------------------------------------------------
create or replace function private.properties_boundary_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_ring jsonb;
  v_n int;
  v_i int;
  v_pt jsonb;
  v_first jsonb;
  v_last jsonb;
  v_lng double precision;
  v_lat double precision;
  v_lng2 double precision;
  v_lat2 double precision;
  v_sum double precision := 0;
  v_sum_lat double precision := 0;
  v_sum_lng double precision := 0;
  v_area_m2 double precision;
  v_open int;
begin
  -- Teto de fazendas reais por produtor (anti abuso)
  if tg_op = 'INSERT' and new.is_demo = false then
    if (select count(*) from public.properties p
        where p.owner_id = new.owner_id and p.is_demo = false) >= 20 then
      raise exception 'Limite de 20 fazendas por produtor atingido.' using errcode = '23514';
    end if;
  end if;

  if new.boundary is null then
    new.area_ha := null;
    new.center_lat := null;
    new.center_lng := null;
    return new;
  end if;

  if jsonb_typeof(new.boundary) <> 'object' or (new.boundary ->> 'type') is distinct from 'Polygon' then
    raise exception 'O limite da fazenda precisa ser um Polygon.' using errcode = '23514';
  end if;
  if jsonb_typeof(new.boundary -> 'coordinates') <> 'array'
     or jsonb_array_length(new.boundary -> 'coordinates') <> 1 then
    raise exception 'O limite da fazenda precisa ter exatamente um anel.' using errcode = '23514';
  end if;

  v_ring := new.boundary -> 'coordinates' -> 0;
  if jsonb_typeof(v_ring) <> 'array' then
    raise exception 'Anel do limite invalido.' using errcode = '23514';
  end if;
  v_n := jsonb_array_length(v_ring);
  if v_n < 4 or v_n > 201 then
    raise exception 'O limite precisa ter entre 4 e 201 pontos.' using errcode = '23514';
  end if;

  v_first := v_ring -> 0;
  v_last := v_ring -> (v_n - 1);
  if v_first is distinct from v_last then
    raise exception 'O limite precisa estar fechado (primeiro ponto igual ao ultimo).' using errcode = '23514';
  end if;

  -- valida cada ponto [lng, lat]
  for v_i in 0 .. v_n - 1 loop
    v_pt := v_ring -> v_i;
    if jsonb_typeof(v_pt) <> 'array' or jsonb_array_length(v_pt) <> 2
       or jsonb_typeof(v_pt -> 0) <> 'number' or jsonb_typeof(v_pt -> 1) <> 'number' then
      raise exception 'Ponto invalido no limite da fazenda.' using errcode = '23514';
    end if;
    v_lng := (v_pt ->> 0)::double precision;
    v_lat := (v_pt ->> 1)::double precision;
    if v_lng < -180 or v_lng > 180 or v_lat < -90 or v_lat > 90 then
      raise exception 'Coordenada fora do intervalo valido.' using errcode = '23514';
    end if;
  end loop;

  -- area esferica (R = 6378137) sobre o anel aberto + centro como media dos vertices
  v_open := v_n - 1;
  for v_i in 0 .. v_open - 1 loop
    v_lng := (v_ring -> v_i ->> 0)::double precision;
    v_lat := (v_ring -> v_i ->> 1)::double precision;
    v_lng2 := (v_ring -> ((v_i + 1) % v_open) ->> 0)::double precision;
    v_lat2 := (v_ring -> ((v_i + 1) % v_open) ->> 1)::double precision;
    v_sum := v_sum + radians(v_lng2 - v_lng) * (2 + sin(radians(v_lat)) + sin(radians(v_lat2)));
    v_sum_lat := v_sum_lat + v_lat;
    v_sum_lng := v_sum_lng + v_lng;
  end loop;
  v_area_m2 := abs(v_sum * 6378137.0 * 6378137.0 / 2.0);
  if v_area_m2 <= 0 or round((v_area_m2 / 10000.0)::numeric, 2) <= 0 then
    raise exception 'A area do limite precisa ser maior que zero.' using errcode = '23514';
  end if;

  new.area_ha := round((v_area_m2 / 10000.0)::numeric, 2);
  new.center_lat := v_sum_lat / v_open;
  new.center_lng := v_sum_lng / v_open;
  return new;
end;
$$;
revoke all on function private.properties_boundary_guard() from public, anon;

drop trigger if exists properties_boundary_guard on public.properties;
create trigger properties_boundary_guard
  before insert or update of boundary on public.properties
  for each row execute function private.properties_boundary_guard();

-- ---------------------------------------------------------------------
-- (3) Padroes de nova fazenda real: limites de alerta + onboarding concluido
-- ---------------------------------------------------------------------
create or replace function private.properties_defaults()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.thresholds (property_id, sensor_type, min_value, max_value) values
    (new.id, 'temperature', 10, 32),
    (new.id, 'air_humidity', 30, 85),
    (new.id, 'soil_moisture', 25, 80)
  on conflict (property_id, sensor_type) do nothing;

  update public.producers
     set onboarding_completed_at = coalesce(onboarding_completed_at, now())
   where id = new.owner_id;
  return new;
end;
$$;
revoke all on function private.properties_defaults() from public, anon, authenticated;

drop trigger if exists properties_defaults on public.properties;
create trigger properties_defaults
  after insert on public.properties
  for each row when (new.is_demo = false)
  execute function private.properties_defaults();

-- ---------------------------------------------------------------------
-- (4) sensors: coordenadas e raio de cobertura
-- ---------------------------------------------------------------------
alter table public.sensors add column if not exists lat double precision;
alter table public.sensors add column if not exists lng double precision;
alter table public.sensors add column if not exists coverage_radius_m integer;

alter table public.sensors drop constraint if exists sensors_geo_chk;
alter table public.sensors add constraint sensors_geo_chk
  check (
    (lat is null) = (lng is null)
    and (lat is null or lat between -90 and 90)
    and (lng is null or lng between -180 and 180)
    and (coverage_radius_m is null or coverage_radius_m between 1 and 5000)
  );

-- ---------------------------------------------------------------------
-- (5) Novos usuarios: so producers (sem clonar a fazenda demo)
-- ---------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.producers (id, full_name)
  values (new.id, left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1), 'Produtor'), 120))
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;
grant usage on schema private to supabase_auth_admin;
grant execute on function private.handle_new_user() to supabase_auth_admin;
-- O trigger on_auth_user_created (criado na 003) continua apontando para esta funcao.

-- ensure_demo_farm vira no-op (mantido para clientes antigos nao quebrarem; nunca clona)
create or replace function public.ensure_demo_farm()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  insert into public.producers (id, full_name)
  select u.id, left(coalesce(nullif(trim(u.raw_user_meta_data ->> 'name'), ''), split_part(u.email, '@', 1), 'Produtor'), 120)
  from auth.users u where u.id = v_uid
  on conflict (id) do nothing;
  return null;
end;
$$;
revoke all on function public.ensure_demo_farm() from public, anon;
grant execute on function public.ensure_demo_farm() to authenticated;

-- ---------------------------------------------------------------------
-- (6) register_sensor: cadastra sensor simulado dentro do limite da fazenda
-- ---------------------------------------------------------------------
create or replace function public.register_sensor(
  p_property uuid,
  p_name text,
  p_type public.sensor_type,
  p_lat double precision,
  p_lng double precision,
  p_radius_m integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_name text := trim(coalesce(p_name, ''));
  v_boundary jsonb;
  v_ring jsonb;
  v_n int;
  v_i int;
  v_j int;
  v_inside boolean := false;
  v_xi double precision;
  v_yi double precision;
  v_xj double precision;
  v_yj double precision;
  v_unit text;
  v_sensor uuid;
  v_end timestamptz;
  v_start timestamptz;
  v_seed int;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if not private.is_property_owner(p_property) then
    raise exception 'Fazenda nao encontrada.' using errcode = '42501';
  end if;

  if char_length(v_name) < 1 or char_length(v_name) > 120 then
    raise exception 'O nome do sensor precisa ter de 1 a 120 caracteres.' using errcode = '23514';
  end if;
  if p_radius_m is null or p_radius_m < 1 or p_radius_m > 5000 then
    raise exception 'O raio de cobertura precisa ficar entre 1 e 5000 metros.' using errcode = '23514';
  end if;
  if p_lat is null or p_lng is null or p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180 then
    raise exception 'Coordenadas invalidas.' using errcode = '23514';
  end if;

  select p.boundary into v_boundary from public.properties p where p.id = p_property;
  if v_boundary is null then
    raise exception 'A fazenda precisa ter o limite desenhado.' using errcode = '23514';
  end if;

  -- ponto dentro do poligono (ray casting); anel fechado, ignora o ultimo ponto duplicado
  v_ring := v_boundary -> 'coordinates' -> 0;
  v_n := jsonb_array_length(v_ring) - 1;
  v_j := v_n - 1;
  for v_i in 0 .. v_n - 1 loop
    v_xi := (v_ring -> v_i ->> 0)::double precision;
    v_yi := (v_ring -> v_i ->> 1)::double precision;
    v_xj := (v_ring -> v_j ->> 0)::double precision;
    v_yj := (v_ring -> v_j ->> 1)::double precision;
    if ((v_yi > p_lat) <> (v_yj > p_lat))
       and (p_lng < (v_xj - v_xi) * (p_lat - v_yi) / (v_yj - v_yi) + v_xi) then
      v_inside := not v_inside;
    end if;
    v_j := v_i;
  end loop;
  if not v_inside then
    raise exception 'O ponto precisa estar dentro da fazenda.' using errcode = '23514';
  end if;

  if (select count(*) from public.sensors s where s.property_id = p_property) >= 30 then
    raise exception 'Esta fazenda ja tem o maximo de 30 sensores.' using errcode = '54000';
  end if;

  v_unit := case p_type
    when 'temperature' then chr(176) || 'C'
    else '%'
  end;

  insert into public.sensors (property_id, name, type, unit, lat, lng, coverage_radius_m, is_demo)
  values (p_property, v_name, p_type, v_unit, p_lat, p_lng, p_radius_m, true)
  returning id into v_sensor;

  select coalesce(max(r.recorded_at), date_trunc('hour', now()))
    into v_end
    from public.readings r
   where r.property_id = p_property and r.is_demo;
  v_start := v_end - interval '30 days';
  v_seed := abs(hashtext(v_sensor::text)) % 1000;

  insert into public.readings (sensor_id, property_id, recorded_at, value, is_demo)
  select v_sensor, p_property, pts.ts,
    round((
      case p_type
        when 'temperature' then 24 + 5 * sin(2 * pi() * (pts.hr - 9) / 24.0)
        when 'air_humidity' then 70 - 12 * sin(2 * pi() * (pts.hr - 9) / 24.0)
        else 58 - 4 * ((pts.h / 24.0) - 5 * floor(pts.h / 120.0))
      end
      + 0.4 * sin(pts.h * 1.7 + v_seed * 3.1) + 0.3 * sin(pts.h * 0.53 + v_seed)
    )::numeric, 1),
    true
  from (
    select g.ts,
           extract(epoch from (g.ts - v_start)) / 3600.0 as h,
           extract(hour from (g.ts at time zone 'America/Sao_Paulo')) as hr
    from generate_series(v_start, v_end, interval '1 hour') as g(ts)
  ) pts;

  update public.sensors set last_seen_at = v_end where id = v_sensor;

  return v_sensor;
end;
$$;
revoke all on function public.register_sensor(uuid, text, public.sensor_type, double precision, double precision, integer) from public, anon;
grant execute on function public.register_sensor(uuid, text, public.sensor_type, double precision, double precision, integer) to authenticated;

-- ====================== 007_demo_dataset.sql ======================

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

-- ---------------------------------------------------------------------
-- Conferencia (rode depois, separado):
--   select tablename, rowsecurity from pg_tables where schemaname = 'public' order by 1;
--   -> 10 tabelas, todas com rowsecurity = true
-- Depois crie um usuario de teste (Authentication > Users > Add user) e rode:
--   select count(*) from public.properties;  -- 1 por usuario
--   select count(*) from public.sensors;     -- 6 por usuario
--   select count(*) from public.alerts;      -- 7 por usuario
