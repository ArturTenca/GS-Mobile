-- AgroAlerta - 010: eventos de seguranca (PII), cache de explicacoes IA e limites de entrada
-- Depende de: 001..009
--
-- IMPORTANTE (projetos que ja rodaram 001..009):
--   Cole todo o conteudo deste arquivo no SQL Editor do Supabase e clique em Run.
--   E idempotente: seguro rodar mais de uma vez.
-- Projetos novos: basta colar supabase/setup_completo.sql (ja inclui esta 010).
--
-- O que faz:
--   (1) security_events: eventos ja mascarados, por produtor (RLS); escrita so pela RPC.
--   (2) record_security_events(jsonb): grava/atualiza eventos validados (security definer).
--   (3) security_ai_cache: cache global, sem dados pessoais, das explicacoes geradas pela IA.
--   (4) CHECKs "not valid" espelhando os limites do app (nao revalida linhas antigas).

-- ---------------------------------------------------------------------
-- (1) security_events
-- ---------------------------------------------------------------------
create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.producers (id) on delete cascade,
  rule_id text not null check (rule_id ~ '^[a-z0-9_]{2,40}$'),
  category text not null check (category in ('identity','contact','financial','credential','health','location','address')),
  severity text not null check (severity in ('low','medium','high','critical')),
  sink text not null check (sink ~ '^[a-z_]{2,30}$'),
  origin text not null check (char_length(origin) <= 80),
  action text not null check (action in ('blocked','redacted','detected','resolved')),
  fingerprint text not null check (char_length(fingerprint) between 8 and 64),
  preview text not null default '' check (char_length(preview) <= 80 and preview !~ '[0-9]{5,}'),
  occurrences int not null default 1 check (occurrences between 1 and 100000),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (owner_id, fingerprint)
);
create index if not exists security_events_owner_seen_idx
  on public.security_events (owner_id, last_seen_at desc);

alter table public.security_events enable row level security;

drop policy if exists security_events_select_own on public.security_events;
create policy security_events_select_own on public.security_events
  for select to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists security_events_delete_own on public.security_events;
create policy security_events_delete_own on public.security_events
  for delete to authenticated
  using (owner_id = (select auth.uid()));

revoke all on table public.security_events from public, anon, authenticated;
grant select, delete on table public.security_events to authenticated;

-- ---------------------------------------------------------------------
-- (2) record_security_events: unico caminho de escrita
-- ---------------------------------------------------------------------
create or replace function public.record_security_events(p_events jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_el jsonb;
  v_count int := 0;
  v_rows int;
  v_total int;
  v_rule text;
  v_cat text;
  v_sev text;
  v_sink text;
  v_origin text;
  v_action text;
  v_fp text;
  v_prev text;
  v_occ int;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_events is null or jsonb_typeof(p_events) <> 'array' then
    raise exception 'p_events deve ser um array json' using errcode = '22023';
  end if;
  if jsonb_array_length(p_events) > 50 then
    raise exception 'no maximo 50 eventos por chamada' using errcode = '22023';
  end if;

  for v_el in select * from jsonb_array_elements(p_events) loop
    if jsonb_typeof(v_el) <> 'object' then
      continue;
    end if;
    v_rule := v_el ->> 'rule_id';
    v_cat := v_el ->> 'category';
    v_sev := v_el ->> 'severity';
    v_sink := v_el ->> 'sink';
    v_origin := coalesce(v_el ->> 'origin', '');
    v_action := v_el ->> 'action';
    v_fp := v_el ->> 'fingerprint';
    v_prev := coalesce(v_el ->> 'preview', '');
    begin
      v_occ := coalesce((v_el ->> 'occurrences')::int, 1);
    exception when others then
      continue;
    end;

    if v_rule is null or v_rule !~ '^[a-z0-9_]{2,40}$' then continue; end if;
    if v_cat is null or v_cat not in ('identity','contact','financial','credential','health','location','address') then continue; end if;
    if v_sev is null or v_sev not in ('low','medium','high','critical') then continue; end if;
    if v_sink is null or v_sink !~ '^[a-z_]{2,30}$' then continue; end if;
    if char_length(v_origin) > 80 then continue; end if;
    if v_action is null or v_action not in ('blocked','redacted','detected','resolved') then continue; end if;
    if v_fp is null or char_length(v_fp) not between 8 and 64 then continue; end if;
    if char_length(v_prev) > 80 or v_prev ~ '[0-9]{5,}' then continue; end if;
    if v_occ < 1 then v_occ := 1; end if;
    if v_occ > 100000 then v_occ := 100000; end if;

    if not exists (
      select 1 from public.security_events e
      where e.owner_id = v_uid and e.fingerprint = v_fp
    ) then
      select count(*) into v_total from public.security_events e where e.owner_id = v_uid;
      if v_total >= 500 then
        continue;
      end if;
    end if;

    insert into public.security_events as e
      (owner_id, rule_id, category, severity, sink, origin, action, fingerprint, preview, occurrences)
    values
      (v_uid, v_rule, v_cat, v_sev, v_sink, v_origin, v_action, v_fp, v_prev, v_occ)
    on conflict (owner_id, fingerprint) do update
      set occurrences = least(e.occurrences + excluded.occurrences, 100000),
          last_seen_at = now(),
          action = excluded.action,
          preview = excluded.preview;
    get diagnostics v_rows = row_count;
    v_count := v_count + v_rows;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.record_security_events(jsonb) from public, anon;
grant execute on function public.record_security_events(jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- (3) security_ai_cache: cache global sem dados pessoais
-- ---------------------------------------------------------------------
create table if not exists public.security_ai_cache (
  fingerprint text primary key,
  rule_id text not null,
  payload jsonb not null,
  model text not null,
  source text not null check (source in ('ai')),
  prompt_version int not null,
  created_at timestamptz not null default now()
);

alter table public.security_ai_cache enable row level security;

drop policy if exists security_ai_cache_select_all on public.security_ai_cache;
create policy security_ai_cache_select_all on public.security_ai_cache
  for select to authenticated
  using (true);

revoke all on table public.security_ai_cache from public, anon, authenticated;
grant select on table public.security_ai_cache to authenticated;

-- ---------------------------------------------------------------------
-- (4) CHECKs de limites (not valid: nao revalida linhas antigas, valida toda escrita nova)
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'properties_city_len_chk' and conrelid = 'public.properties'::regclass) then
    alter table public.properties add constraint properties_city_len_chk
      check (city is null or char_length(city) <= 80) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'properties_state_fmt_chk' and conrelid = 'public.properties'::regclass) then
    alter table public.properties add constraint properties_state_fmt_chk
      check (state is null or state ~ '^[A-Z]{2}$') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'planting_areas_crop_len_chk' and conrelid = 'public.planting_areas'::regclass) then
    alter table public.planting_areas add constraint planting_areas_crop_len_chk
      check (crop is null or char_length(crop) <= 60) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'push_tokens_token_len_chk' and conrelid = 'public.push_tokens'::regclass) then
    alter table public.push_tokens add constraint push_tokens_token_len_chk
      check (char_length(token) <= 200) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'producers_full_name_noctl_chk' and conrelid = 'public.producers'::regclass) then
    alter table public.producers add constraint producers_full_name_noctl_chk
      check (full_name !~ '[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'properties_name_noctl_chk' and conrelid = 'public.properties'::regclass) then
    alter table public.properties add constraint properties_name_noctl_chk
      check (name !~ '[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'properties_city_noctl_chk' and conrelid = 'public.properties'::regclass) then
    alter table public.properties add constraint properties_city_noctl_chk
      check (city is null or city !~ '[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'properties_address_noctl_chk' and conrelid = 'public.properties'::regclass) then
    alter table public.properties add constraint properties_address_noctl_chk
      check (address is null or address !~ '[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'properties_neighborhood_noctl_chk' and conrelid = 'public.properties'::regclass) then
    alter table public.properties add constraint properties_neighborhood_noctl_chk
      check (neighborhood is null or neighborhood !~ '[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'properties_main_crop_noctl_chk' and conrelid = 'public.properties'::regclass) then
    alter table public.properties add constraint properties_main_crop_noctl_chk
      check (main_crop is null or main_crop !~ '[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sensors_name_noctl_chk' and conrelid = 'public.sensors'::regclass) then
    alter table public.sensors add constraint sensors_name_noctl_chk
      check (name !~ '[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sensors_name_nomarkup_chk' and conrelid = 'public.sensors'::regclass) then
    alter table public.sensors add constraint sensors_name_nomarkup_chk
      check (name !~ '[<>]') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'planting_areas_name_noctl_chk' and conrelid = 'public.planting_areas'::regclass) then
    alter table public.planting_areas add constraint planting_areas_name_noctl_chk
      check (name !~ '[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]') not valid;
  end if;
end
$$;
