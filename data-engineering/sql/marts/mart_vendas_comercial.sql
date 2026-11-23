-- mart_vendas_comercial: funil, vendas, cancelamentos em 7 dias e metas por dia, regional, UF, canal e segmento.
-- Grão: dt_referencia x regional x uf x canal_venda x segmento. Alimenta o relatório Vendas / Comercial.
{{ config(materialized='incremental', unique_key=['dt_referencia', 'uf', 'canal_venda', 'segmento']) }}

with regionais as (
    select uf, regional from {{ ref('dim_filial') }} group by uf, regional
),

leads as (
    select cast(dt_captacao as date) as dt_referencia, uf, canal_venda, segmento_interesse as segmento,
           count(*) as qt_leads
    from {{ ref('fato_lead') }}
    group by 1, 2, 3, 4
),

propostas as (
    select p.dt_proposta as dt_referencia, c.uf, p.canal_venda, p.segmento,
           count(*) as qt_propostas
    from {{ ref('fato_proposta') }} p
    join {{ ref('dim_cliente') }} c on c.id_cliente = p.id_cliente
    group by 1, 2, 3, 4
),

vendas as (
    select dt_venda as dt_referencia, uf, canal_venda, segmento,
           count(*)                                                as qt_vendas,
           sum(vl_credito)                                         as vl_credito_vendido,
           sum(case when fl_cancelado_7d = 'S' then 1 else 0 end)  as qt_cancelamentos_7d
    from {{ ref('fato_contrato_venda') }}
    group by 1, 2, 3, 4
),

chaves as (
    select dt_referencia, uf, canal_venda, segmento from leads
    union
    select dt_referencia, uf, canal_venda, segmento from propostas
    union
    select dt_referencia, uf, canal_venda, segmento from vendas
),

-- a meta é mensal por regional/canal/segmento: entra apenas no 1º dia do mês para não ser somada em dobro
metas as (
    select cast(competencia || '-01' as date) as dt_referencia, regional, canal_venda, segmento,
           sum(qt_meta_cotas) as qt_meta_cotas, sum(vl_meta_credito) as vl_meta_credito
    from {{ ref('fato_meta_comercial') }}
    group by 1, 2, 3, 4
)

select
    k.dt_referencia,
    r.regional,
    k.uf,
    k.canal_venda,
    k.segmento,
    coalesce(l.qt_leads, 0)             as qt_leads,
    coalesce(p.qt_propostas, 0)         as qt_propostas,
    coalesce(v.qt_vendas, 0)            as qt_vendas,
    coalesce(v.vl_credito_vendido, 0)   as vl_credito_vendido,
    m.qt_meta_cotas,                    -- rateio por UF é feito na camada de consumo
    m.vl_meta_credito,
    coalesce(v.qt_cancelamentos_7d, 0)  as qt_cancelamentos_7d,
    current_timestamp                   as dt_carga
from chaves k
join regionais r on r.uf = k.uf
left join leads l     using (dt_referencia, uf, canal_venda, segmento)
left join propostas p using (dt_referencia, uf, canal_venda, segmento)
left join vendas v    using (dt_referencia, uf, canal_venda, segmento)
left join metas m
       on m.dt_referencia = k.dt_referencia and m.regional = r.regional
      and m.canal_venda = k.canal_venda and m.segmento = k.segmento
{% if is_incremental() %}
where k.dt_referencia >= (select max(dt_referencia) - interval '7 day' from {{ this }})
{% endif %}
