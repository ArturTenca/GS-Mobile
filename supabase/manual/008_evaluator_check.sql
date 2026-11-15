-- AgroAlerta - 008 (manual): conferencia do avaliador de alertas (somente leitura)
-- Cole no SQL Editor do Supabase. Nada e alterado: a transacao termina em rollback.

begin;

-- 1) Primeiro alerta de solo seco ainda aberto, com o limite minimo e a ultima leitura do sensor
select a.id as alert_id, a.status, a.title,
       th.min_value as limite_minimo_solo,
       (select r.value from public.readings r where r.sensor_id = a.sensor_id order by r.recorded_at desc, r.id desc limit 1) as ultima_leitura
  from public.alerts a
  join public.thresholds th on th.property_id = a.property_id and th.sensor_type = 'soil_moisture'
 where a.category = 'soil_moisture_low' and a.status in ('novo', 'visualizado')
 order by a.triggered_at
 limit 1;

-- 2) Alertas de medicao abertos cuja ULTIMA leitura NAO viola o limite (deve retornar 0 linhas)
select a.id, a.category, a.status, a.title
  from public.alerts a
  join public.sensors s on s.id = a.sensor_id
  join public.thresholds th on th.property_id = a.property_id and th.sensor_type = s.type
  join lateral (
    select r.value from public.readings r where r.sensor_id = s.id order by r.recorded_at desc, r.id desc limit 1
  ) lr on true
 where a.status in ('novo', 'visualizado')
   and a.category in ('temperature_high', 'soil_moisture_low', 'air_humidity_high')
   and not coalesce(case when s.type = 'soil_moisture' then lr.value < th.min_value
                         else lr.value > th.max_value end, false);

rollback;
