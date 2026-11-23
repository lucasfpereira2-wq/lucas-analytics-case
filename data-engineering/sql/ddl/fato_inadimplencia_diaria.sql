-- core.fato_inadimplencia_diaria
-- Fotografia diária da carteira por faixa de atraso
-- Domínio: Financeiro e Cobrança | Camada: core | Dono: Patrícia Lemos (Crédito & Cobrança)
-- Rotina: core_cobranca | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.fato_inadimplencia_diaria (
    dt_referencia       date          not null,
    id_cota             bigint        not null,
    segmento            varchar(20)   not null,
    faixa_atraso        varchar(10)   not null,
    dias_atraso         integer       not null,
    qt_parcelas_atraso  smallint      not null,
    vl_saldo_atraso     decimal(14,2) not null,
    vl_saldo_devedor    decimal(14,2) not null,
    fl_contemplada      char(1)       not null,
    constraint pk_fato_inadimplencia_diaria primary key (dt_referencia, id_cota),
    constraint fk_fato_inadimplencia_diaria_id_cota foreign key (id_cota) references core.dim_cota (id_cota)
);

comment on table core.fato_inadimplencia_diaria is 'Fotografia diária da carteira por faixa de atraso';
comment on column core.fato_inadimplencia_diaria.dt_referencia is 'Data da fotografia';
comment on column core.fato_inadimplencia_diaria.id_cota is 'Cota';
comment on column core.fato_inadimplencia_diaria.segmento is 'Segmento da cota';
comment on column core.fato_inadimplencia_diaria.faixa_atraso is 'Em dia, 1–30, 31–60, 61–90 ou 90+';
comment on column core.fato_inadimplencia_diaria.dias_atraso is 'Dias de atraso da parcela mais antiga';
comment on column core.fato_inadimplencia_diaria.qt_parcelas_atraso is 'Parcelas em atraso';
comment on column core.fato_inadimplencia_diaria.vl_saldo_atraso is 'Saldo em atraso';
comment on column core.fato_inadimplencia_diaria.vl_saldo_devedor is 'Saldo devedor total';
comment on column core.fato_inadimplencia_diaria.fl_contemplada is 'Cota contemplada (S/N)';
