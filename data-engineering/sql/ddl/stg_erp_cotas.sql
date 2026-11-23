-- staging.stg_erp_cotas
-- Posição bruta de cotas por grupo no ERP
-- Domínio: Staging | Camada: staging | Dono: Thiago Meireles (Engenharia de Dados)
-- Rotina: ingest_erp | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists staging.stg_erp_cotas (
    id_cota_erp       bigint        not null,
    cd_grupo          varchar(8)    not null,
    nr_cota           integer       not null,
    cd_cliente_erp    bigint        not null,
    cd_plano          varchar(12)   not null,
    situacao_cota     varchar(20)   not null,
    vl_credito_atual  decimal(14,2) not null,
    pc_pago           decimal(7,4)  not null,
    dt_adesao         date          not null,
    dt_situacao       date          not null,
    _dt_carga         timestamp     not null,
    constraint pk_stg_erp_cotas primary key (id_cota_erp)
);

comment on table staging.stg_erp_cotas is 'Posição bruta de cotas por grupo no ERP';
comment on column staging.stg_erp_cotas.id_cota_erp is 'Identificador interno da cota no ERP';
comment on column staging.stg_erp_cotas.cd_grupo is 'Código do grupo';
comment on column staging.stg_erp_cotas.nr_cota is 'Número da cota dentro do grupo';
comment on column staging.stg_erp_cotas.cd_cliente_erp is 'Código do titular no ERP';
comment on column staging.stg_erp_cotas.cd_plano is 'Plano da cota';
comment on column staging.stg_erp_cotas.situacao_cota is 'Situação atual da cota';
comment on column staging.stg_erp_cotas.vl_credito_atual is 'Valor do crédito atualizado';
comment on column staging.stg_erp_cotas.pc_pago is 'Percentual do plano já pago';
comment on column staging.stg_erp_cotas.dt_adesao is 'Data de adesão';
comment on column staging.stg_erp_cotas.dt_situacao is 'Data da última mudança de situação';
comment on column staging.stg_erp_cotas._dt_carga is 'Data e hora da ingestão';
