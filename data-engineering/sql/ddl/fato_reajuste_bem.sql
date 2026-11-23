-- core.fato_reajuste_bem
-- Reajustes mensais do bem de referência (INCC, IPCA, tabela FIPE)
-- Domínio: Produto | Camada: core | Dono: Rafael Nogueira (Produtos)
-- Rotina: core_produto_reajuste | Frequência: mensal | SLA: 744h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.fato_reajuste_bem (
    id_reajuste      bigint        not null,
    id_bem           integer       not null,
    competencia      char(7)       not null,
    indice_reajuste  varchar(10)   not null,
    pc_reajuste      decimal(7,4)  not null,
    vl_anterior      decimal(14,2) not null,
    vl_reajustado    decimal(14,2) not null,
    dt_aplicacao     date          not null,
    constraint pk_fato_reajuste_bem primary key (id_reajuste),
    constraint fk_fato_reajuste_bem_id_bem foreign key (id_bem) references core.dim_bem_referencia (id_bem)
);

comment on table core.fato_reajuste_bem is 'Reajustes mensais do bem de referência (INCC, IPCA, tabela FIPE)';
comment on column core.fato_reajuste_bem.id_reajuste is 'Chave do reajuste';
comment on column core.fato_reajuste_bem.id_bem is 'Bem de referência reajustado';
comment on column core.fato_reajuste_bem.competencia is 'Mês de competência (AAAA-MM)';
comment on column core.fato_reajuste_bem.indice_reajuste is 'Índice aplicado';
comment on column core.fato_reajuste_bem.pc_reajuste is 'Percentual de reajuste';
comment on column core.fato_reajuste_bem.vl_anterior is 'Valor do crédito antes do reajuste';
comment on column core.fato_reajuste_bem.vl_reajustado is 'Valor do crédito após o reajuste';
comment on column core.fato_reajuste_bem.dt_aplicacao is 'Data de aplicação';
