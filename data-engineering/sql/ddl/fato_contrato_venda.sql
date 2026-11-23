-- core.fato_contrato_venda
-- Vendas efetivadas (contratos de adesão)
-- Domínio: Vendas | Camada: core | Dono: Bruno Tavares (Inteligência Comercial)
-- Rotina: core_vendas | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.fato_contrato_venda (
    id_contrato          bigint        not null,
    id_proposta          bigint,
    id_cota              bigint        not null,
    id_vendedor          integer       not null,
    segmento             varchar(20)   not null,
    canal_venda          varchar(30)   not null,
    uf                   char(2)       not null,
    vl_credito           decimal(14,2) not null,
    vl_primeira_parcela  decimal(12,2) not null,
    fl_cancelado_7d      char(1)       not null,
    dt_venda             date          not null,
    constraint pk_fato_contrato_venda primary key (id_contrato),
    constraint fk_fato_contrato_venda_id_proposta foreign key (id_proposta) references core.fato_proposta (id_proposta),
    constraint fk_fato_contrato_venda_id_cota foreign key (id_cota) references core.dim_cota (id_cota),
    constraint fk_fato_contrato_venda_id_vendedor foreign key (id_vendedor) references core.dim_vendedor (id_vendedor)
);

comment on table core.fato_contrato_venda is 'Vendas efetivadas (contratos de adesão)';
comment on column core.fato_contrato_venda.id_contrato is 'Chave da venda (contrato de adesão)';
comment on column core.fato_contrato_venda.id_proposta is 'Proposta que originou a venda';
comment on column core.fato_contrato_venda.id_cota is 'Cota vendida';
comment on column core.fato_contrato_venda.id_vendedor is 'Vendedor da venda';
comment on column core.fato_contrato_venda.segmento is 'Segmento';
comment on column core.fato_contrato_venda.canal_venda is 'Canal de venda';
comment on column core.fato_contrato_venda.uf is 'UF da venda';
comment on column core.fato_contrato_venda.vl_credito is 'Crédito comercializado';
comment on column core.fato_contrato_venda.vl_primeira_parcela is 'Valor da primeira parcela';
comment on column core.fato_contrato_venda.fl_cancelado_7d is 'Cancelada no prazo de arrependimento (S/N)';
comment on column core.fato_contrato_venda.dt_venda is 'Data da venda';
