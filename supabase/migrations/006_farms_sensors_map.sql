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
  check (cep is null or cep ~ '^[0-9]{8}$');
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
