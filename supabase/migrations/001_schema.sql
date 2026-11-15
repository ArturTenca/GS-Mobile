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
