-- core.fato_comissao
-- Comissões apuradas por venda
-- Domínio: Vendas | Camada: core | Dono: Bruno Tavares (Inteligência Comercial)
-- Rotina: core_vendas | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.fato_comissao (
    id_comissao          bigint        not null,
    id_contrato          bigint        not null,
    id_vendedor          integer       not null,
    id_parceiro          integer,
    competencia          char(7)       not null,
    nr_parcela_comissao  smallint      not null,
    pc_comissao          decimal(7,4)  not null,
    vl_comissao          decimal(12,2) not null,
    situacao             varchar(20)   not null,
    dt_pagamento         date,
    constraint pk_fato_comissao primary key (id_comissao),
    constraint fk_fato_comissao_id_contrato foreign key (id_contrato) references core.fato_contrato_venda (id_contrato),
    constraint fk_fato_comissao_id_vendedor foreign key (id_vendedor) references core.dim_vendedor (id_vendedor),
    constraint fk_fato_comissao_id_parceiro foreign key (id_parceiro) references core.dim_parceiro (id_parceiro)
);

comment on table core.fato_comissao is 'Comissões apuradas por venda';
comment on column core.fato_comissao.id_comissao is 'Chave da comissão';
comment on column core.fato_comissao.id_contrato is 'Venda que gerou a comissão';
comment on column core.fato_comissao.id_vendedor is 'Vendedor comissionado';
comment on column core.fato_comissao.id_parceiro is 'Parceiro comissionado, quando houver';
comment on column core.fato_comissao.competencia is 'Mês de apuração (AAAA-MM)';
comment on column core.fato_comissao.nr_parcela_comissao is 'Parcela da comissão';
comment on column core.fato_comissao.pc_comissao is 'Percentual aplicado';
comment on column core.fato_comissao.vl_comissao is 'Valor apurado';
comment on column core.fato_comissao.situacao is 'Apurada, paga ou estornada';
comment on column core.fato_comissao.dt_pagamento is 'Data de pagamento';
