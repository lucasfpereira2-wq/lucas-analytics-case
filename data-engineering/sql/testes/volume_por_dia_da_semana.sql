-- Teste: volume da última carga de stg_crm_propostas contra a média do mesmo dia da semana (regra: volume | severidade: alto)
-- Compara com as 8 cargas anteriores do mesmo dia da semana; falha se o desvio passar de 30%.
-- Em 17/11/2026 (dados de segunda-feira, 16/11): 412 linhas contra média de 1.148 (queda de 64%).
with cargas as (
    select cast(_dt_carga as date) as dt_carga, count(*) as linhas
    from staging.stg_crm_propostas
    group by 1
),
ultima as (
    select dt_carga, linhas from cargas where dt_carga = (select max(dt_carga) from cargas)
),
referencia as (
    select avg(c.linhas) as media_linhas, count(*) as cargas_comparadas
    from cargas c
    join ultima u
      on extract(dow from c.dt_carga) = extract(dow from u.dt_carga)
     and c.dt_carga < u.dt_carga
     and c.dt_carga >= u.dt_carga - interval '56 day'
)
select
    u.dt_carga,
    u.linhas                                             as linhas_carregadas,
    round(r.media_linhas)                                as media_mesmo_dia_semana,
    round(100.0 * (u.linhas - r.media_linhas) / r.media_linhas, 1) as desvio_pct
from ultima u
cross join referencia r
where r.cargas_comparadas >= 4
  and abs(u.linhas - r.media_linhas) / r.media_linhas > 0.30;
