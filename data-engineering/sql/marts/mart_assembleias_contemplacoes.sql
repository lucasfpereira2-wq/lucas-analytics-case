-- mart_assembleias_contemplacoes: assembleias, lances, contemplações e liberação de crédito por grupo e mês.
-- Grão: competencia (YYYY-MM) x id_grupo. Alimenta o relatório Assembleias e Contemplações.
{{ config(materialized='table') }}

with assembleias as (
    select to_char(dt_assembleia, 'YYYY-MM') as competencia, id_grupo, id_assembleia
    from {{ ref('fato_assembleia') }}
    where situacao = 'realizada'
),

lances as (
    select a.competencia, a.id_grupo,
           count(*)          as qt_lances_ofertados,
           avg(l.pc_lance)   as pc_lance_medio
    from {{ ref('fato_lance') }} l
    join assembleias a on a.id_assembleia = l.id_assembleia
    group by 1, 2
),

contemplacoes as (
    select a.competencia, a.id_grupo,
           sum(case when c.tipo_contemplacao = 'sorteio' then 1 else 0 end) as qt_contemplacoes_sorteio,
           sum(case when c.tipo_contemplacao = 'lance' then 1 else 0 end)   as qt_contemplacoes_lance,
           sum(c.vl_credito)                                                as vl_credito_contemplado,
           sum(lb.vl_credito_liberado)                                      as vl_credito_liberado,
           avg(lb.dias_ate_liberacao)                                       as dias_medio_liberacao
    from {{ ref('fato_contemplacao') }} c
    join assembleias a on a.id_assembleia = c.id_assembleia
    left join {{ ref('fato_liberacao_credito') }} lb
           on lb.id_contemplacao = c.id_contemplacao and lb.situacao = 'liberado'
    group by 1, 2
)

select
    a.competencia,
    a.id_grupo,
    g.segmento,
    count(distinct a.id_assembleia)           as qt_assembleias,
    coalesce(max(c.qt_contemplacoes_sorteio), 0) as qt_contemplacoes_sorteio,
    coalesce(max(c.qt_contemplacoes_lance), 0)   as qt_contemplacoes_lance,
    coalesce(max(l.qt_lances_ofertados), 0)      as qt_lances_ofertados,
    max(l.pc_lance_medio)                        as pc_lance_medio,
    coalesce(max(c.vl_credito_contemplado), 0)   as vl_credito_contemplado,
    coalesce(max(c.vl_credito_liberado), 0)      as vl_credito_liberado,
    max(c.dias_medio_liberacao)                  as dias_medio_liberacao,
    current_timestamp                            as dt_carga
from assembleias a
join {{ ref('dim_grupo') }} g on g.id_grupo = a.id_grupo
left join lances l        on l.competencia = a.competencia and l.id_grupo = a.id_grupo
left join contemplacoes c on c.competencia = a.competencia and c.id_grupo = a.id_grupo
group by a.competencia, a.id_grupo, g.segmento
