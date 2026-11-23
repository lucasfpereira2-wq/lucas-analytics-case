-- mart_executivo_kpis: KPIs consolidados para o comitê executivo, em formato longo (1 linha por dia e KPI).
-- Herda a qualidade dos cinco marts de origem: se um deles estiver com alerta, o KPI correspondente também está.
{{ config(materialized='table') }}

with vendas as (
    select dt_referencia, 'VND_CREDITO' as cd_kpi, 'Crédito vendido' as nm_kpi, 'Vendas' as dominio,
           sum(vl_credito_vendido) as vl_kpi, sum(vl_meta_credito) as vl_meta, 'BRL' as unidade,
           'mart_vendas_comercial' as mart_origem
    from {{ ref('mart_vendas_comercial') }}
    group by 1
),

carteira as (
    select dt_referencia, 'COB_OVER30' as cd_kpi, 'Inadimplência acima de 30 dias' as nm_kpi, 'Cobrança' as dominio,
           100.0 * sum(case when faixa_atraso in ('31–60', '61–90', '90+') then qt_cotas else 0 end)
                 / nullif(sum(qt_cotas), 0) as vl_kpi,
           cast(null as decimal(18, 4)) as vl_meta, '%' as unidade, 'mart_cobranca_carteira' as mart_origem
    from {{ ref('mart_cobranca_carteira') }}
    group by 1
),

recebimento as (
    select dt_referencia, 'COB_RECEBIDO', 'Recebimento do dia', 'Cobrança',
           sum(vl_recebido), sum(vl_previsto), 'BRL', 'mart_cobranca_carteira'
    from {{ ref('mart_cobranca_carteira') }}
    group by 1
),

atendimento as (
    select dt_referencia, 'ATD_CONTATOS', 'Contatos recebidos', 'Atendimento',
           sum(qt_contatos), cast(null as decimal(18, 4)), 'un', 'mart_atendimento'
    from {{ ref('mart_atendimento') }}
    group by 1
),

nps as (
    select dt_referencia, 'ATD_NPS', 'NPS', 'Atendimento',
           100.0 * (sum(qt_promotores) - sum(qt_detratores)) / nullif(sum(qt_respostas_nps), 0),
           cast(null as decimal(18, 4)), 'pts', 'mart_atendimento'
    from {{ ref('mart_atendimento') }}
    group by 1
),

assembleias as (
    select cast(competencia || '-01' as date), 'ASB_CONTEMPLACOES', 'Contemplações no mês', 'Assembleias',
           sum(qt_contemplacoes_sorteio + qt_contemplacoes_lance), cast(null as decimal(18, 4)), 'un',
           'mart_assembleias_contemplacoes'
    from {{ ref('mart_assembleias_contemplacoes') }}
    group by 1
),

kpis as (
    select * from vendas
    union all select * from carteira
    union all select * from recebimento
    union all select * from atendimento
    union all select * from nps
    union all select * from assembleias
)

select
    dt_referencia, cd_kpi, nm_kpi, dominio, vl_kpi, vl_meta,
    lag(vl_kpi) over (partition by cd_kpi order by dt_referencia) as vl_periodo_anterior,
    unidade, mart_origem,
    current_timestamp as dt_carga
from kpis
