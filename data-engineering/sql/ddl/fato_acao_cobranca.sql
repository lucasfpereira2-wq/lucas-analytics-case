-- core.fato_acao_cobranca
-- Acionamentos de cobrança por canal
-- Domínio: Financeiro e Cobrança | Camada: core | Dono: Patrícia Lemos (Crédito & Cobrança)
-- Rotina: core_cobranca | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.fato_acao_cobranca (
    id_acao                bigint        not null,
    id_parcela             bigint        not null,
    id_etapa_regua         smallint      not null,
    id_assessoria          integer,
    canal_cobranca         varchar(40)   not null,
    resultado_acao         varchar(30)   not null,
    fl_promessa_pagamento  char(1)       not null,
    vl_recuperado          decimal(12,2),
    dt_acao                timestamp     not null,
    constraint pk_fato_acao_cobranca primary key (id_acao),
    constraint fk_fato_acao_cobranca_id_parcela foreign key (id_parcela) references core.fato_parcelas (id_parcela),
    constraint fk_fato_acao_cobranca_id_etapa_regua foreign key (id_etapa_regua) references core.dim_regua_cobranca (id_etapa_regua),
    constraint fk_fato_acao_cobranca_id_assessoria foreign key (id_assessoria) references core.dim_assessoria_cobranca (id_assessoria)
);

comment on table core.fato_acao_cobranca is 'Acionamentos de cobrança por canal';
comment on column core.fato_acao_cobranca.id_acao is 'Chave do acionamento';
comment on column core.fato_acao_cobranca.id_parcela is 'Parcela cobrada';
comment on column core.fato_acao_cobranca.id_etapa_regua is 'Etapa da régua';
comment on column core.fato_acao_cobranca.id_assessoria is 'Assessoria externa, quando houver';
comment on column core.fato_acao_cobranca.canal_cobranca is 'Canal do acionamento';
comment on column core.fato_acao_cobranca.resultado_acao is 'Resultado do contato';
comment on column core.fato_acao_cobranca.fl_promessa_pagamento is 'Houve promessa de pagamento (S/N)';
comment on column core.fato_acao_cobranca.vl_recuperado is 'Valor recuperado atribuído à ação';
comment on column core.fato_acao_cobranca.dt_acao is 'Data e hora do acionamento';
