-- core.fato_acordo
-- Acordos de pagamento firmados
-- Domínio: Financeiro e Cobrança | Camada: core | Dono: Patrícia Lemos (Crédito & Cobrança)
-- Rotina: core_cobranca | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.fato_acordo (
    id_acordo           bigint        not null,
    id_cota             bigint        not null,
    canal_cobranca      varchar(40)   not null,
    qt_parcelas_acordo  smallint      not null,
    vl_divida_original  decimal(14,2) not null,
    vl_acordo           decimal(14,2) not null,
    pc_desconto         decimal(7,4)  not null,
    situacao_acordo     varchar(20)   not null,
    dt_acordo           date          not null,
    dt_quebra           date,
    constraint pk_fato_acordo primary key (id_acordo),
    constraint fk_fato_acordo_id_cota foreign key (id_cota) references core.dim_cota (id_cota)
);

comment on table core.fato_acordo is 'Acordos de pagamento firmados';
comment on column core.fato_acordo.id_acordo is 'Chave do acordo';
comment on column core.fato_acordo.id_cota is 'Cota negociada';
comment on column core.fato_acordo.canal_cobranca is 'Canal em que o acordo foi firmado';
comment on column core.fato_acordo.qt_parcelas_acordo is 'Parcelas do acordo';
comment on column core.fato_acordo.vl_divida_original is 'Dívida original negociada';
comment on column core.fato_acordo.vl_acordo is 'Valor total do acordo';
comment on column core.fato_acordo.pc_desconto is 'Desconto concedido sobre encargos';
comment on column core.fato_acordo.situacao_acordo is 'Vigente, cumprido ou quebrado';
comment on column core.fato_acordo.dt_acordo is 'Data do acordo';
comment on column core.fato_acordo.dt_quebra is 'Data da quebra';
