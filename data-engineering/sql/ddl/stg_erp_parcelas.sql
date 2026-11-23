-- staging.stg_erp_parcelas
-- Parcelas emitidas e baixadas no ERP
-- Domínio: Staging | Camada: staging | Dono: Thiago Meireles (Engenharia de Dados)
-- Rotina: ingest_erp | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists staging.stg_erp_parcelas (
    id_parcela_erp    bigint        not null,
    id_cota_erp       bigint        not null,
    nr_parcela        integer       not null,
    dt_vencimento     date          not null,
    vl_parcela        decimal(12,2) not null,
    vl_fundo_comum    decimal(12,2) not null,
    vl_taxa_adm       decimal(12,2) not null,
    vl_fundo_reserva  decimal(12,2) not null,
    dt_baixa          date,
    vl_baixado        decimal(12,2),
    situacao          varchar(20)   not null,
    _dt_carga         timestamp     not null,
    constraint pk_stg_erp_parcelas primary key (id_parcela_erp),
    constraint fk_stg_erp_parcelas_id_cota_erp foreign key (id_cota_erp) references staging.stg_erp_cotas (id_cota_erp)
);

comment on table staging.stg_erp_parcelas is 'Parcelas emitidas e baixadas no ERP';
comment on column staging.stg_erp_parcelas.id_parcela_erp is 'Identificador da parcela no ERP';
comment on column staging.stg_erp_parcelas.id_cota_erp is 'Cota a que a parcela pertence';
comment on column staging.stg_erp_parcelas.nr_parcela is 'Número sequencial da parcela';
comment on column staging.stg_erp_parcelas.dt_vencimento is 'Data de vencimento';
comment on column staging.stg_erp_parcelas.vl_parcela is 'Valor total da parcela';
comment on column staging.stg_erp_parcelas.vl_fundo_comum is 'Parte destinada ao fundo comum';
comment on column staging.stg_erp_parcelas.vl_taxa_adm is 'Parte de taxa de administração';
comment on column staging.stg_erp_parcelas.vl_fundo_reserva is 'Parte de fundo de reserva';
comment on column staging.stg_erp_parcelas.dt_baixa is 'Data da baixa no ERP';
comment on column staging.stg_erp_parcelas.vl_baixado is 'Valor baixado';
comment on column staging.stg_erp_parcelas.situacao is 'Situação da parcela';
comment on column staging.stg_erp_parcelas._dt_carga is 'Data e hora da ingestão';
