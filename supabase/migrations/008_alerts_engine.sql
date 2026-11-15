-- AgroAlerta - 008: motor de alertas no banco (avaliador + gatilhos), preferencias de notificacao e push
-- Depende de: 001, 002, 003, 004, 005, 006, 007
--
-- IMPORTANTE (projetos que ja rodaram 001..007) - [BLOCKING]:
--   Este arquivo NAO e aplicado sozinho. Abra o SQL Editor do Supabase,
--   cole todo o conteudo deste arquivo e clique em Run.
--   E idempotente: seguro rodar mais de uma vez (add column if not exists,
--   create or replace, drop trigger if exists).
-- Projetos novos: basta colar supabase/setup_completo.sql (ja inclui esta 008).
--
-- O que muda:
--   * alerts.notified_at (marca de push enviado; sem grant para o app) e backfill dos alertas antigos.
--   * producers.notify_enabled / notify_categories (so o dono edita, via grant de coluna).
--   * thresholds ganha CHECKs (min < max, temperatura -20..60, umidade 0..100).
--   * private.evaluate_property_alerts(p_property): cria alertas a partir da ULTIMA leitura de cada
--     sensor + limites da fazenda, resolve sozinho quando volta ao normal, e deriva chuva forte /
--     clima desfavoravel do ultimo climate_snapshot. Sensor offline = 2 h sem dados (referencia
--     ancorada nos dados demo para fazendas demo). Nao reabre alerta resolvido no mesmo episodio.
--   * Gatilhos: readings (AFTER INSERT, por comando) e thresholds (AFTER INSERT/UPDATE/DELETE).
--   * generate_demo_dataset v2 reavalia os alertas ao final.
--   * Gatilho de push em alerts chama a Edge Function push-alert via pg_net, somente quando
--     configurado (supabase/manual/008_push_config.sql) e sem nunca quebrar o INSERT do alerta.

begin;

-- ---------------------------------------------------------------------
-- (1) Colunas novas, grants e backfill de notified_at
-- ---------------------------------------------------------------------
alter table public.alerts add column if not exists notified_at timestamptz;
alter table public.producers add column if not exists notify_enabled boolean not null default true;
alter table public.producers add column if not exists notify_categories public.alert_category[] not null
  default '{temperature_high,soil_moisture_low,air_humidity_high,heavy_rain,unfavorable_weather,sensor_offline}'::public.alert_category[];

grant update (notify_enabled, notify_categories) on public.producers to authenticated;

-- alertas que ja existem nunca devem gerar push
update public.alerts set notified_at = now() where notified_at is null;

-- ---------------------------------------------------------------------
-- (2) CHECKs de limites (not valid: nao revalida linhas antigas, valida toda escrita nova)
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'thresholds_min_lt_max' and conrelid = 'public.thresholds'::regclass) then
    alter table public.thresholds add constraint thresholds_min_lt_max
      check (min_value is null or max_value is null or min_value < max_value) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'thresholds_temperature_range' and conrelid = 'public.thresholds'::regclass) then
    alter table public.thresholds add constraint thresholds_temperature_range
      check (sensor_type <> 'temperature'
             or ((min_value is null or min_value between -20 and 60)
                 and (max_value is null or max_value between -20 and 60))) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'thresholds_humidity_range' and conrelid = 'public.thresholds'::regclass) then
    alter table public.thresholds add constraint thresholds_humidity_range
      check (sensor_type not in ('air_humidity', 'soil_moisture')
             or ((min_value is null or min_value between 0 and 100)
                 and (max_value is null or max_value between 0 and 100))) not valid;
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- (3) Avaliador de alertas (interno; serializado por fazenda)
-- ---------------------------------------------------------------------
create or replace function private.evaluate_property_alerts(p_property uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ref timestamptz;
  s record;
  c record;
  v_last record;
  v_first record;
  v_last_ok timestamptz;
  v_cat public.alert_category;
  v_bad boolean;
  v_dev numeric;
begin
  perform pg_advisory_xact_lock(hashtext(p_property::text));

  if not exists (select 1 from public.properties p where p.id = p_property) then
    return;
  end if;

  -- referencia de tempo: fazendas demo usam a leitura demo mais recente (como computeDemoOffset)
  select coalesce(max(r.recorded_at), now()) into v_ref
    from public.readings r
   where r.property_id = p_property and r.is_demo;

  -- (a) alertas de medicao (ultima leitura de cada sensor x limite da fazenda)
  for s in
    select sn.id, sn.name, sn.type, sn.unit, th.min_value, th.max_value
      from public.sensors sn
      join public.thresholds th on th.property_id = sn.property_id and th.sensor_type = sn.type
     where sn.property_id = p_property
       and sn.type in ('temperature', 'air_humidity', 'soil_moisture')
  loop
    select r.id, r.recorded_at, r.value, r.is_demo into v_last
      from public.readings r
     where r.sensor_id = s.id
     order by r.recorded_at desc, r.id desc
     limit 1;
    if not found then
      continue;
    end if;

    v_cat := case s.type
               when 'temperature' then 'temperature_high'
               when 'soil_moisture' then 'soil_moisture_low'
               else 'air_humidity_high'
             end::public.alert_category;

    v_bad := coalesce(case when s.type = 'soil_moisture' then v_last.value < s.min_value
                           else v_last.value > s.max_value end, false);

    if not v_bad then
      update public.alerts a
         set status = 'resolvido'
       where a.sensor_id = s.id and a.category = v_cat and a.status in ('novo', 'visualizado');
      continue;
    end if;

    -- inicio do episodio: primeira leitura fora do limite apos a ultima leitura dentro do limite
    select max(r.recorded_at) into v_last_ok
      from public.readings r
     where r.sensor_id = s.id
       and not coalesce(case when s.type = 'soil_moisture' then r.value < s.min_value
                             else r.value > s.max_value end, false);

    select r.id, r.recorded_at, r.is_demo into v_first
      from public.readings r
     where r.sensor_id = s.id
       and (v_last_ok is null or r.recorded_at > v_last_ok)
     order by r.recorded_at, r.id
     limit 1;

    if exists (
      select 1 from public.alerts a
       where a.sensor_id = s.id and a.category = v_cat
         and (a.triggered_at >= v_first.recorded_at or a.status in ('novo', 'visualizado'))
    ) then
      continue;
    end if;

    if s.type = 'soil_moisture' then
      v_dev := (s.min_value - v_last.value) / nullif(s.min_value, 0);
    else
      v_dev := (v_last.value - s.max_value) / nullif(s.max_value, 0);
    end if;

    insert into public.alerts (property_id, sensor_id, reading_id, category, severity, status, title, description, recommendation, triggered_at, is_demo)
    values (
      p_property, s.id, v_first.id, v_cat,
      (case when coalesce(v_dev, 0) >= 0.15 then 'critical' else 'warning' end)::public.alert_severity,
      'novo',
      case s.type when 'temperature' then 'Temperatura acima do limite'
                  when 'soil_moisture' then 'Solo seco: umidade abaixo do mínimo'
                  else 'Umidade do ar acima do limite' end,
      case s.type
        when 'soil_moisture' then format('%s registrou %s%s, abaixo do mínimo de %s%s.', s.name, replace(round(v_last.value, 1)::text, '.', ','), s.unit, replace(round(s.min_value, 0)::text, '.', ','), s.unit)
        else format('%s registrou %s%s, acima do limite de %s%s.', s.name, replace(round(v_last.value, 1)::text, '.', ','), s.unit, replace(round(s.max_value, 0)::text, '.', ','), s.unit)
      end,
      case s.type when 'temperature' then 'Evite trabalhos pesados nas horas mais quentes e reforce a irrigação no fim da tarde.'
                  when 'soil_moisture' then 'Programe a irrigação desta área hoje, de preferência no início da manhã.'
                  else 'Melhore a ventilação e observe sinais de fungo nas folhas.' end,
      v_first.recorded_at, v_first.is_demo
    );
  end loop;

  -- (b) sensor offline: sem dados ha mais de 2 horas (SENSOR_OFFLINE_AFTER_MS)
  for s in
    select sn.id, sn.name, sn.last_seen_at, sn.is_demo
      from public.sensors sn
     where sn.property_id = p_property and sn.last_seen_at is not null
  loop
    if s.last_seen_at < v_ref - interval '2 hours' then
      if not exists (
        select 1 from public.alerts a
         where a.sensor_id = s.id and a.category = 'sensor_offline'
           and (a.triggered_at >= s.last_seen_at or a.status in ('novo', 'visualizado'))
      ) then
        insert into public.alerts (property_id, sensor_id, category, severity, status, title, description, recommendation, triggered_at, is_demo)
        values (
          p_property, s.id, 'sensor_offline', 'warning', 'novo', 'Sensor sem comunicação',
          format('%s não envia dados há mais de 2 horas.', s.name),
          'Verifique a bateria, o sinal e a conexão do sensor.',
          s.last_seen_at + interval '2 hours', s.is_demo
        );
      end if;
    else
      update public.alerts a
         set status = 'resolvido'
       where a.sensor_id = s.id and a.category = 'sensor_offline' and a.status in ('novo', 'visualizado');
    end if;
  end loop;

  -- (c) clima: ultimo snapshot da fazenda (sem API externa)
  select cs.observed_at, cs.temperature_c, cs.humidity_pct, cs.rain_probability_pct, cs.is_demo into c
    from public.climate_snapshots cs
   where cs.property_id = p_property
   order by cs.observed_at desc
   limit 1;

  if found then
    -- chuva forte
    if coalesce(c.rain_probability_pct, 0) >= 70 then
      if not exists (
        select 1 from public.alerts a
         where a.property_id = p_property and a.category = 'heavy_rain'
           and (a.status in ('novo', 'visualizado') or a.triggered_at >= c.observed_at)
      ) then
        insert into public.alerts (property_id, category, severity, status, title, description, recommendation, triggered_at, is_demo)
        values (
          p_property, 'heavy_rain', 'warning', 'novo', 'Possibilidade de chuva forte',
          format('Há %s%% de chance de chuva forte nas próximas horas.', c.rain_probability_pct),
          'Adie adubação e pulverização; confira o escoamento nas áreas baixas.',
          c.observed_at, c.is_demo
        );
      end if;
    else
      update public.alerts a
         set status = 'resolvido'
       where a.property_id = p_property and a.category = 'heavy_rain'
         and a.status in ('novo', 'visualizado') and a.triggered_at < c.observed_at;
    end if;

    -- clima desfavoravel (calor ou ar muito umido)
    if coalesce(c.temperature_c, 0) >= 35 or coalesce(c.humidity_pct, 0) >= 90 then
      if not exists (
        select 1 from public.alerts a
         where a.property_id = p_property and a.category = 'unfavorable_weather'
           and (a.status in ('novo', 'visualizado') or a.triggered_at >= c.observed_at)
      ) then
        insert into public.alerts (property_id, category, severity, status, title, description, recommendation, triggered_at, is_demo)
        values (
          p_property, 'unfavorable_weather', 'warning', 'novo', 'Clima desfavorável para a lavoura',
          format('O clima registra %s°C e %s%% de umidade do ar, condição desfavorável para a lavoura.%s',
                 coalesce(replace(c.temperature_c::text, '.', ','), '--'),
                 coalesce(replace(c.humidity_pct::text, '.', ','), '--'),
                 case when c.is_demo then ' Dados demonstrativos.' else '' end),
          'Evite aplicações e trabalhos pesados nas horas críticas e acompanhe a previsão.',
          c.observed_at, c.is_demo
        );
      end if;
    else
      update public.alerts a
         set status = 'resolvido'
       where a.property_id = p_property and a.category = 'unfavorable_weather'
         and a.status in ('novo', 'visualizado') and a.triggered_at < c.observed_at;
    end if;
  end if;
end;
$$;
revoke all on function private.evaluate_property_alerts(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- (4) Gatilhos que chamam o avaliador
-- ---------------------------------------------------------------------
-- readings: por comando (tabela de transicao). Ignora fazendas criadas na mesma transacao
-- (ensure_demo_farm insere leituras antes dos proprios alertas) e a geracao demo (que avalia ao final).
create or replace function private.trg_readings_evaluate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prop uuid;
begin
  if coalesce(current_setting('app.skip_alert_eval', true), '') = '1' then
    return null;
  end if;
  for v_prop in
    select distinct n.property_id
      from new_rows n
      join public.properties p on p.id = n.property_id
     where p.created_at <> now()
  loop
    perform private.evaluate_property_alerts(v_prop);
  end loop;
  return null;
end;
$$;
revoke all on function private.trg_readings_evaluate() from public, anon, authenticated;

drop trigger if exists trg_readings_evaluate on public.readings;
create trigger trg_readings_evaluate
  after insert on public.readings
  referencing new table as new_rows
  for each statement execute function private.trg_readings_evaluate();

-- thresholds: ao mudar um limite, reavalia a fazenda
create or replace function private.trg_thresholds_evaluate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prop uuid := coalesce(new.property_id, old.property_id);
begin
  if v_prop is null then
    return null;
  end if;
  if coalesce(current_setting('app.skip_alert_eval', true), '') = '1' then
    return null;
  end if;
  if not exists (select 1 from public.properties p where p.id = v_prop and p.created_at <> now()) then
    return null;
  end if;
  perform private.evaluate_property_alerts(v_prop);
  return null;
end;
$$;
revoke all on function private.trg_thresholds_evaluate() from public, anon, authenticated;

drop trigger if exists trg_thresholds_evaluate on public.thresholds;
create trigger trg_thresholds_evaluate
  after insert or update or delete on public.thresholds
  for each row execute function private.trg_thresholds_evaluate();

-- ---------------------------------------------------------------------
-- (5) generate_demo_dataset v2: reavalia os alertas ao final
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

  -- suspende o avaliador por leitura durante a geracao; avalia uma vez ao final
  perform set_config('app.skip_alert_eval', '1', true);

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

  perform set_config('app.skip_alert_eval', '', true);
  perform private.evaluate_property_alerts(p_property_id);

  update public.properties set demo_data_generated_at = now() where id = p_property_id;

  return jsonb_build_object('sensors', v_sensors, 'readings', v_rows, 'generated_at', now());
end;
$$;
revoke all on function public.generate_demo_dataset(uuid) from public, anon;
grant execute on function public.generate_demo_dataset(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- (6) Alerta demo de clima desfavoravel (exemplo para mostrar as 6 categorias)
-- ---------------------------------------------------------------------
insert into public.alerts (property_id, category, severity, status, title, description, recommendation, triggered_at, is_demo, notified_at)
select p.id, 'unfavorable_weather', 'warning', 'novo', 'Clima desfavorável para a lavoura',
       'Exemplo demonstrativo: calor e ar úmido ao mesmo tempo aumentam o risco de doenças nas plantas.',
       'Evite aplicações e trabalhos pesados nas horas críticas e acompanhe a previsão.',
       (select cs.observed_at from public.climate_snapshots cs where cs.property_id = p.id order by cs.observed_at desc limit 1),
       true, now()
  from public.properties p
 where p.is_demo
   and exists (select 1 from public.climate_snapshots cs where cs.property_id = p.id)
   and not exists (select 1 from public.alerts a where a.property_id = p.id and a.category = 'unfavorable_weather');

-- ---------------------------------------------------------------------
-- (7) Backfill: reavalia todas as fazendas; alertas criados aqui nunca disparam push
-- ---------------------------------------------------------------------
drop trigger if exists trg_alerts_push on public.alerts;

select private.evaluate_property_alerts(p.id) from public.properties p;

update public.alerts set notified_at = now() where notified_at is null;

-- ---------------------------------------------------------------------
-- (8) Push: configuracao privada + gatilho em alerts (via pg_net, nunca quebra o INSERT)
-- ---------------------------------------------------------------------
-- Os valores reais (URL da funcao e segredo) NAO ficam no git: rode supabase/manual/008_push_config.sql.
-- Sem pg_net no projeto, configure um Database Webhook em alerts (INSERT) apontando para a mesma funcao;
-- a Edge Function aceita os dois formatos de payload.
create table if not exists private.push_config (
  id boolean primary key default true check (id),
  function_url text not null,
  shared_secret text not null
);
alter table private.push_config enable row level security;
revoke all on private.push_config from public, anon, authenticated;

create or replace function private.trg_alerts_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  begin
    select pc.function_url, pc.shared_secret into v_url, v_secret from private.push_config pc limit 1;
    if v_url is null or v_secret is null then
      return null;
    end if;
    if to_regproc('net.http_post') is null then
      return null;
    end if;
    execute 'select net.http_post(url := $1, headers := $2, body := $3)'
      using v_url,
            jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
            jsonb_build_object('alert_id', new.id);
  exception when others then
    null;
  end;
  return null;
end;
$$;
revoke all on function private.trg_alerts_push() from public, anon, authenticated;

create trigger trg_alerts_push
  after insert on public.alerts
  for each row
  when (new.severity <> 'info' and new.notified_at is null)
  execute function private.trg_alerts_push();

commit;
