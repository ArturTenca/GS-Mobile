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
