-- mart_cobranca_carteira: fotografia diária da carteira por faixa de atraso + fluxo de recebimento e recuperação.
-- Grão: dt_referencia x segmento x regional x faixa_atraso. Alimenta o relatório Cobrança: Carteira e Inadimplência.
-- Atenção: o recebimento soma fato_pagamento via fato_parcelas. Se `id_parcela` estiver duplicado em fato_parcelas
-- (teste `unicidade_id_parcela`), o join multiplica pagamentos e infla `vl_recebido`.
{{ config(materialized='incremental', unique_key=['dt_referencia', 'segmento', 'regional', 'faixa_atraso']) }}

with cotas as (
    select ct.id_cota, cl.regional
    from {{ ref('dim_cota') }} ct
    join {{ ref('dim_cliente') }} cl on cl.id_cliente = ct.id_cliente
),

carteira as (
    select i.dt_referencia, i.segmento, c.regional, i.faixa_atraso,
           count(*)                as qt_cotas,
           sum(i.vl_saldo_devedor) as vl_saldo_devedor,
           sum(i.vl_saldo_atraso)  as vl_saldo_atraso
    from {{ ref('fato_inadimplencia_diaria') }} i
    join cotas c on c.id_cota = i.id_cota
    group by 1, 2, 3, 4
),

-- fluxo do dia: alocado na faixa em que a cota estava na fotografia do próprio dia
fluxo as (
    select i.dt_referencia, i.segmento, c.regional, i.faixa_atraso,
           sum(case when pa.dt_vencimento = i.dt_referencia then pa.vl_parcela else 0 end) as vl_previsto,
           sum(coalesce(pg.vl_pago, 0))                                                      as vl_recebido
    from {{ ref('fato_inadimplencia_diaria') }} i
    join cotas c on c.id_cota = i.id_cota
    join {{ ref('fato_parcelas') }} pa on pa.id_cota = i.id_cota
    left join {{ ref('fato_pagamento') }} pg
           on pg.id_parcela = pa.id_parcela and pg.dt_pagamento = i.dt_referencia
    where pa.dt_vencimento = i.dt_referencia or pg.dt_pagamento = i.dt_referencia
    group by 1, 2, 3, 4
),

recuperacao as (
    select cast(a.dt_acao as date) as dt_referencia, i.segmento, c.regional, i.faixa_atraso,
           sum(a.vl_recuperado) as vl_recuperado
    from {{ ref('fato_acao_cobranca') }} a
    join {{ ref('fato_parcelas') }} pa on pa.id_parcela = a.id_parcela
    join cotas c on c.id_cota = pa.id_cota
    join {{ ref('fato_inadimplencia_diaria') }} i
      on i.id_cota = pa.id_cota and i.dt_referencia = cast(a.dt_acao as date)
    group by 1, 2, 3, 4
),

acordos as (
    select ac.dt_acordo as dt_referencia, i.segmento, c.regional, i.faixa_atraso, count(*) as qt_acordos
    from {{ ref('fato_acordo') }} ac
    join cotas c on c.id_cota = ac.id_cota
    join {{ ref('fato_inadimplencia_diaria') }} i on i.id_cota = ac.id_cota and i.dt_referencia = ac.dt_acordo
    group by 1, 2, 3, 4
)

select
    ca.dt_referencia, ca.segmento, ca.regional, ca.faixa_atraso,
    ca.qt_cotas, ca.vl_saldo_devedor, ca.vl_saldo_atraso,
    coalesce(f.vl_previsto, 0)   as vl_previsto,
    coalesce(f.vl_recebido, 0)   as vl_recebido,
    coalesce(r.vl_recuperado, 0) as vl_recuperado,
    coalesce(a.qt_acordos, 0)    as qt_acordos,
    current_timestamp            as dt_carga
from carteira ca
left join fluxo f       using (dt_referencia, segmento, regional, faixa_atraso)
left join recuperacao r using (dt_referencia, segmento, regional, faixa_atraso)
left join acordos a     using (dt_referencia, segmento, regional, faixa_atraso)
{% if is_incremental() %}
where ca.dt_referencia >= (select max(dt_referencia) - interval '3 day' from {{ this }})
{% endif %}
