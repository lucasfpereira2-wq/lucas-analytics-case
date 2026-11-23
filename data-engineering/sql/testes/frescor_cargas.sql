-- Teste: frescor das cargas contra o SLA de cada tabela (regra: frescor | severidade: crítico)
-- Falha se retornar linhas. Exemplo com a telefonia (SLA de 24h): em 17/11/2026 08:00 a última carga é de 13/11
-- (rotina `ingest_telefonia` parada há 3 dias). O mesmo padrão vale para as demais tabelas, trocando tabela e SLA.
with ultima_carga as (
    select 'stg_telefonia_cdr' as tabela, 24 as sla_horas, max(_dt_carga) as dt_ultima_carga
    from staging.stg_telefonia_cdr
    union all
    select 'stg_banco_boletos_registrados', 24, max(_dt_carga) from staging.stg_banco_boletos_registrados
    union all
    select 'stg_whatsapp_conversas', 3, max(_dt_carga) from staging.stg_whatsapp_conversas
)
select
    tabela,
    sla_horas,
    dt_ultima_carga,
    round(extract(epoch from (current_timestamp - dt_ultima_carga)) / 3600.0, 1)             as horas_desde_carga,
    round(extract(epoch from (current_timestamp - dt_ultima_carga)) / 3600.0 - sla_horas, 1) as horas_alem_do_sla
from ultima_carga
where dt_ultima_carga is null
   or extract(epoch from (current_timestamp - dt_ultima_carga)) / 3600.0 > sla_horas
order by horas_alem_do_sla desc;
