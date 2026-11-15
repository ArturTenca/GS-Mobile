-- AgroAlerta - alertas DEMONSTRATIVOS para testar a aba Alertas (rode no SQL Editor)
-- Depende de: 001..008
--
-- Insere 8 alertas falsos (is_demo = true) em TODAS as fazendas do projeto, cobrindo as
-- 6 categorias, as 3 gravidades e os 3 status. Todos saem com notified_at preenchido,
-- entao NAO disparam push. Cada fazenda recebe o lote no maximo uma vez (marcador no titulo).
--
-- Para apagar depois:
--   delete from public.alerts where is_demo and description like '%[demo-seed]%';
--
-- Observacao: o avaliador da 008 pode marcar como "resolvido" um alerta de medicao quando a
-- ultima leitura daquele sensor estiver normal e algo disparar uma reavaliacao (nova leitura,
-- mudanca de limite ou "Gerar dados demo"). Para recriar o lote, apague e rode de novo.

begin;

with farms as (
  select p.id as property_id
    from public.properties p
   where not exists (
     select 1 from public.alerts a
      where a.property_id = p.id and a.description like '%[demo-seed]%'
   )
),
seed (category, severity, status, title, description, recommendation, sensor_type, hours_ago) as (
  values
    ('temperature_high'::public.alert_category, 'critical'::public.alert_severity, 'novo'::public.alert_status,
     'Temperatura acima do limite',
     'Exemplo demonstrativo: a temperatura chegou a 38,4 °C, acima do limite de 32 °C. [demo-seed]',
     'Evite trabalhos pesados nas horas mais quentes e reforce a irrigação no fim da tarde.',
     'temperature'::public.sensor_type, 1),
    ('soil_moisture_low', 'warning', 'novo',
     'Solo seco: umidade abaixo do mínimo',
     'Exemplo demonstrativo: a umidade do solo caiu para 21 %, abaixo do mínimo de 25 %. [demo-seed]',
     'Programe a irrigação desta área hoje, de preferência no início da manhã.',
     'soil_moisture', 3),
    ('air_humidity_high', 'warning', 'visualizado',
     'Umidade do ar acima do limite',
     'Exemplo demonstrativo: a umidade do ar ficou em 91 %, acima do limite de 85 %. [demo-seed]',
     'Melhore a ventilação e observe sinais de fungo nas folhas.',
     'air_humidity', 6),
    ('heavy_rain', 'critical', 'novo',
     'Possibilidade de chuva forte',
     'Exemplo demonstrativo: há 92 % de chance de chuva forte nas próximas horas. [demo-seed]',
     'Adie adubação e pulverização; confira o escoamento nas áreas baixas.',
     null, 2),
    ('unfavorable_weather', 'info', 'novo',
     'Clima desfavorável para a lavoura',
     'Exemplo demonstrativo: calor e ar úmido ao mesmo tempo aumentam o risco de doenças. [demo-seed]',
     'Evite aplicações e trabalhos pesados nas horas críticas e acompanhe a previsão.',
     null, 8),
    ('sensor_offline', 'warning', 'novo',
     'Sensor sem comunicação',
     'Exemplo demonstrativo: o sensor não envia dados há mais de 2 horas. [demo-seed]',
     'Verifique a bateria, o sinal e a conexão do sensor.',
     'temperature', 4),
    ('temperature_high', 'warning', 'resolvido',
     'Temperatura acima do limite',
     'Exemplo demonstrativo: a temperatura chegou a 34,1 °C, acima do limite de 32 °C. [demo-seed]',
     'Evite trabalhos pesados nas horas mais quentes e reforce a irrigação no fim da tarde.',
     'temperature', 30),
    ('soil_moisture_low', 'critical', 'resolvido',
     'Solo seco: umidade abaixo do mínimo',
     'Exemplo demonstrativo: a umidade do solo caiu para 17 %, abaixo do mínimo de 25 %. [demo-seed]',
     'Programe a irrigação desta área hoje, de preferência no início da manhã.',
     'soil_moisture', 52)
)
insert into public.alerts (property_id, sensor_id, category, severity, status, title, description,
                           recommendation, triggered_at, is_demo, notified_at)
select f.property_id,
       (select s.id from public.sensors s
         where s.property_id = f.property_id and s.type = seed.sensor_type
         order by s.created_at, s.id limit 1),
       seed.category, seed.severity, seed.status, seed.title, seed.description, seed.recommendation,
       now() - make_interval(hours => seed.hours_ago), true, now()
  from farms f
 cross join seed;

commit;

-- Conferencia (rode depois, separado):
--   select p.name, a.category, a.severity, a.status
--     from public.alerts a join public.properties p on p.id = a.property_id
--    where a.description like '%[demo-seed]%' order by p.name, a.triggered_at desc;
