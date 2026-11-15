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
