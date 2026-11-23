-- core.fato_proposta
-- Propostas de adesão e seu desfecho
-- Domínio: Vendas | Camada: core | Dono: Bruno Tavares (Inteligência Comercial)
-- Rotina: core_vendas | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.fato_proposta (
    id_proposta      bigint        not null,
    id_cliente       bigint        not null,
    id_vendedor      integer       not null,
    id_lead          bigint,
    segmento         varchar(20)   not null,
    canal_venda      varchar(30)   not null,
    vl_credito       decimal(14,2) not null,
    status_proposta  varchar(20)   not null,
    motivo_recusa    varchar(60),
    dt_proposta      date          not null,
    dt_decisao       date,
    constraint pk_fato_proposta primary key (id_proposta),
    constraint fk_fato_proposta_id_cliente foreign key (id_cliente) references core.dim_cliente (id_cliente),
    constraint fk_fato_proposta_id_vendedor foreign key (id_vendedor) references core.dim_vendedor (id_vendedor)
);

comment on table core.fato_proposta is 'Propostas de adesão e seu desfecho';
comment on column core.fato_proposta.id_proposta is 'Chave da proposta';
comment on column core.fato_proposta.id_cliente is 'Cliente proponente';
comment on column core.fato_proposta.id_vendedor is 'Vendedor responsável';
comment on column core.fato_proposta.id_lead is 'Lead de origem, quando rastreado';
comment on column core.fato_proposta.segmento is 'Segmento do consórcio';
comment on column core.fato_proposta.canal_venda is 'Canal de venda';
comment on column core.fato_proposta.vl_credito is 'Crédito pretendido';
comment on column core.fato_proposta.status_proposta is 'Em análise, aprovada, recusada ou convertida';
comment on column core.fato_proposta.motivo_recusa is 'Motivo da recusa';
comment on column core.fato_proposta.dt_proposta is 'Data da proposta';
comment on column core.fato_proposta.dt_decisao is 'Data da decisão';
