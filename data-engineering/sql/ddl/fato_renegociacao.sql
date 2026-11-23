-- core.fato_renegociacao
-- Renegociações e diluições de parcelas
-- Domínio: Financeiro e Cobrança | Camada: core | Dono: Patrícia Lemos (Crédito & Cobrança)
-- Rotina: core_cobranca | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.fato_renegociacao (
    id_renegociacao       bigint        not null,
    id_acordo             bigint,
    id_cota               bigint        not null,
    tipo_renegociacao     varchar(30)   not null,
    qt_parcelas_diluidas  smallint      not null,
    vl_renegociado        decimal(14,2) not null,
    situacao              varchar(20)   not null,
    dt_renegociacao       date          not null,
    constraint pk_fato_renegociacao primary key (id_renegociacao),
    constraint fk_fato_renegociacao_id_acordo foreign key (id_acordo) references core.fato_acordo (id_acordo),
    constraint fk_fato_renegociacao_id_cota foreign key (id_cota) references core.dim_cota (id_cota)
);

comment on table core.fato_renegociacao is 'Renegociações e diluições de parcelas';
comment on column core.fato_renegociacao.id_renegociacao is 'Chave da renegociação';
comment on column core.fato_renegociacao.id_acordo is 'Acordo relacionado';
comment on column core.fato_renegociacao.id_cota is 'Cota renegociada';
comment on column core.fato_renegociacao.tipo_renegociacao is 'Diluição, alongamento ou redução de crédito';
comment on column core.fato_renegociacao.qt_parcelas_diluidas is 'Parcelas diluídas no saldo';
comment on column core.fato_renegociacao.vl_renegociado is 'Valor renegociado';
comment on column core.fato_renegociacao.situacao is 'Situação da renegociação';
comment on column core.fato_renegociacao.dt_renegociacao is 'Data da renegociação';
