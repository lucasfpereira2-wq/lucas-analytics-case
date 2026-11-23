-- mart_atendimento: contatos de todos os canais (voz, WhatsApp, chat, e-mail, app) + NPS por dia, canal e motivo.
-- Grão: dt_referencia x canal x id_motivo. Alimenta o relatório Atendimento.
-- Atenção: (1) sem carga de `fato_chamada`, o canal Voz some do dia; (2) `fato_pesquisa_nps` precisa ser
-- deduplicada por `id_resposta` — aqui a deduplicação é explícita para o indicador não inflar.
{{ config(materialized='incremental', unique_key=['dt_referencia', 'canal', 'id_motivo']) }}

with voz as (
    select cast(dt_inicio as date) as dt_referencia, 'Voz' as canal, id_motivo,
           count(*)                                                             as qt_contatos,
           sum(case when fl_atendida = 'S' then 1 else 0 end)                   as qt_atendidos,
           sum(case when fl_abandonada = 'S' then 1 else 0 end)                 as qt_abandonados,
           sum(duracao_seg)                                                     as tempo_atendimento_seg,
           sum(tempo_espera_seg)                                                as tempo_espera_seg,
           sum(case when fl_resolvida_primeiro_contato = 'S' then 1 else 0 end) as qt_resolvidos_primeiro_contato
    from {{ ref('fato_chamada') }}
    group by 1, 2, 3
),

whatsapp as (
    select cast(dt_inicio as date), 'WhatsApp', id_motivo,
           count(*),
           sum(case when tempo_primeira_resposta_seg is not null then 1 else 0 end),
           sum(case when tempo_primeira_resposta_seg is null then 1 else 0 end),
           sum(duracao_seg),
           sum(coalesce(tempo_primeira_resposta_seg, 0)),
           sum(case when fl_resolvida = 'S' then 1 else 0 end)
    from {{ ref('fato_conversa_whatsapp') }}
    group by 1, 2, 3
),

digital as (   -- chat, e-mail e app chegam pelo helpdesk
    select cast(dt_abertura as date), canal, id_motivo,
           count(*),
           sum(case when dt_primeira_resposta is not null then 1 else 0 end),
           sum(case when dt_primeira_resposta is null then 1 else 0 end),
           sum(extract(epoch from (dt_resolucao - dt_primeira_resposta))),
           sum(extract(epoch from (dt_primeira_resposta - dt_abertura))),
           sum(case when fl_reaberto = 'N' and dt_resolucao is not null then 1 else 0 end)
    from {{ ref('fato_ticket') }}
    group by 1, 2, 3
),

contatos as (
    select * from voz
    union all select * from whatsapp
    union all select * from digital
),

nps_unico as (   -- 1 linha por resposta: protege o indicador contra reenvios da plataforma
    select id_resposta, canal, classificacao, cast(dt_resposta as date) as dt_referencia,
           row_number() over (partition by id_resposta order by dt_carga) as rn
    from {{ ref('fato_pesquisa_nps') }}
),

nps as (
    select dt_referencia, canal,
           sum(case when classificacao = 'promotor' then 1 else 0 end) as qt_promotores,
           sum(case when classificacao = 'detrator' then 1 else 0 end) as qt_detratores,
           count(*)                                                    as qt_respostas_nps
    from nps_unico
    where rn = 1
    group by 1, 2
)

select
    c.dt_referencia, c.canal, c.id_motivo,
    c.qt_contatos, c.qt_atendidos, c.qt_abandonados,
    c.tempo_atendimento_seg, c.tempo_espera_seg, c.qt_resolvidos_primeiro_contato,
    -- NPS não tem motivo de contato: fica na linha do menor id_motivo do dia/canal para não repetir na soma
    case when c.id_motivo = min(c.id_motivo) over (partition by c.dt_referencia, c.canal) then n.qt_promotores end    as qt_promotores,
    case when c.id_motivo = min(c.id_motivo) over (partition by c.dt_referencia, c.canal) then n.qt_detratores end    as qt_detratores,
    case when c.id_motivo = min(c.id_motivo) over (partition by c.dt_referencia, c.canal) then n.qt_respostas_nps end as qt_respostas_nps,
    current_timestamp as dt_carga
from contatos c
left join nps n on n.dt_referencia = c.dt_referencia and n.canal = c.canal
{% if is_incremental() %}
where c.dt_referencia >= (select max(dt_referencia) - interval '3 day' from {{ this }})
{% endif %}
