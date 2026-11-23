-- mart_cobranca_safra_mob: curvas de inadimplência e cancelamento por safra de venda e MOB (months on book).
-- Grão: safra (mês da venda) x mob x segmento x canal_venda. Triangular: só existem MOBs já observados.
-- Atenção: cotas com `id_grupo` órfão (teste `fk_orfa_cota_grupo`) são descartadas no join com dim_grupo.
{{ config(materialized='table') }}

with safra as (
    select v.id_cota,
           to_char(v.dt_venda, 'YYYY-MM')  as safra,
           date_trunc('month', v.dt_venda) as mes_venda,
           v.segmento, v.canal_venda, v.vl_credito
    from {{ ref('fato_contrato_venda') }} v
    join {{ ref('dim_cota') }} c  on c.id_cota = v.id_cota
    join {{ ref('dim_grupo') }} g on g.id_grupo = c.id_grupo        -- integridade referencial cota -> grupo
),

-- última fotografia de cada mês (ou a última disponível, no mês corrente)
fotos as (
    select date_trunc('month', dt_referencia) as mes_foto, max(dt_referencia) as dt_foto
    from {{ ref('fato_inadimplencia_diaria') }}
    group by 1
),

posicao as (
    select s.safra, s.segmento, s.canal_venda, s.id_cota, s.vl_credito,
           cast(extract(year from age(f.mes_foto, s.mes_venda)) * 12
                + extract(month from age(f.mes_foto, s.mes_venda)) as integer) as mob,
           i.dias_atraso,
           case when cc.dt_cancelamento <= f.dt_foto then 1 else 0 end         as fl_cancelada
    from safra s
    join fotos f on f.mes_foto >= s.mes_venda
    left join {{ ref('fato_inadimplencia_diaria') }} i on i.id_cota = s.id_cota and i.dt_referencia = f.dt_foto
    left join {{ ref('fato_cancelamento_cota') }} cc   on cc.id_cota = s.id_cota
)

select
    safra,
    mob,
    segmento,
    canal_venda,
    count(*)                                                                    as qt_cotas_safra,
    sum(case when fl_cancelada = 0 and dias_atraso is not null then 1 else 0 end) as qt_cotas_ativas,
    sum(case when fl_cancelada = 0 and dias_atraso > 30 then 1 else 0 end)        as qt_cotas_over30,
    sum(case when fl_cancelada = 0 and dias_atraso > 60 then 1 else 0 end)        as qt_cotas_over60,
    sum(case when fl_cancelada = 0 and dias_atraso > 90 then 1 else 0 end)        as qt_cotas_over90,
    sum(fl_cancelada)                                                           as qt_cancelamentos,
    sum(vl_credito)                                                             as vl_credito_safra,
    current_timestamp                                                           as dt_carga
from posicao
group by safra, mob, segmento, canal_venda
