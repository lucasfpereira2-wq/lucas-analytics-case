-- core.fato_parcelas
-- Parcelas emitidas por cota, com vencimento e situação
-- Domínio: Financeiro e Cobrança | Camada: core | Dono: Patrícia Lemos (Crédito & Cobrança)
-- Rotina: core_financeiro_parcelas | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.fato_parcelas (
    id_parcela        bigint        not null,
    id_cota           bigint        not null,
    nr_parcela        smallint      not null,
    dt_vencimento     date          not null,
    vl_parcela        decimal(12,2) not null,
    vl_fundo_comum    decimal(12,2) not null,
    vl_taxa_adm       decimal(12,2) not null,
    vl_fundo_reserva  decimal(12,2) not null,
    dt_pagamento      date,
    vl_pago           decimal(12,2),
    situacao_parcela  varchar(20)   not null,
    dias_atraso       integer       not null,
    dt_carga          timestamp     not null,
    constraint pk_fato_parcelas primary key (id_parcela),
    constraint fk_fato_parcelas_id_cota foreign key (id_cota) references core.dim_cota (id_cota)
);

comment on table core.fato_parcelas is 'Parcelas emitidas por cota, com vencimento e situação';
comment on column core.fato_parcelas.id_parcela is 'Chave da parcela (declarada; unicidade verificada por teste)';
comment on column core.fato_parcelas.id_cota is 'Cota a que a parcela pertence';
comment on column core.fato_parcelas.nr_parcela is 'Número sequencial da parcela';
comment on column core.fato_parcelas.dt_vencimento is 'Data de vencimento';
comment on column core.fato_parcelas.vl_parcela is 'Valor total da parcela';
comment on column core.fato_parcelas.vl_fundo_comum is 'Parte destinada ao fundo comum';
comment on column core.fato_parcelas.vl_taxa_adm is 'Parte de taxa de administração';
comment on column core.fato_parcelas.vl_fundo_reserva is 'Parte de fundo de reserva';
comment on column core.fato_parcelas.dt_pagamento is 'Data do pagamento';
comment on column core.fato_parcelas.vl_pago is 'Valor pago';
comment on column core.fato_parcelas.situacao_parcela is 'Em aberto, paga, em atraso ou renegociada';
comment on column core.fato_parcelas.dias_atraso is 'Dias de atraso na data de referência';
comment on column core.fato_parcelas.dt_carga is 'Data e hora da carga';
