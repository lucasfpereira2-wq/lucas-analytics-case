-- staging.stg_erp_contratos
-- Contratos de adesão efetivados no ERP de consórcio
-- Domínio: Staging | Camada: staging | Dono: Thiago Meireles (Engenharia de Dados)
-- Rotina: ingest_erp | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists staging.stg_erp_contratos (
    nr_contrato     bigint        not null,
    nr_proposta     bigint,
    cd_cliente_erp  bigint        not null,
    cpf_cnpj        varchar(18)   not null,
    cd_grupo        varchar(8)    not null,
    nr_cota         integer       not null,
    cd_plano        varchar(12)   not null,
    cd_bem          varchar(12)   not null,
    vl_credito      decimal(14,2) not null,
    dt_adesao       date          not null,
    situacao        varchar(20)   not null,
    _dt_carga       timestamp     not null,
    constraint pk_stg_erp_contratos primary key (nr_contrato)
);

comment on table staging.stg_erp_contratos is 'Contratos de adesão efetivados no ERP de consórcio';
comment on column staging.stg_erp_contratos.nr_contrato is 'Número do contrato de adesão no ERP';
comment on column staging.stg_erp_contratos.nr_proposta is 'Número da proposta que originou o contrato';
comment on column staging.stg_erp_contratos.cd_cliente_erp is 'Código do cliente no ERP';
comment on column staging.stg_erp_contratos.cpf_cnpj is '[PII/LGPD] CPF ou CNPJ do titular';
comment on column staging.stg_erp_contratos.cd_grupo is 'Código do grupo';
comment on column staging.stg_erp_contratos.nr_cota is 'Número da cota dentro do grupo';
comment on column staging.stg_erp_contratos.cd_plano is 'Plano contratado';
comment on column staging.stg_erp_contratos.cd_bem is 'Bem de referência';
comment on column staging.stg_erp_contratos.vl_credito is 'Valor do crédito contratado';
comment on column staging.stg_erp_contratos.dt_adesao is 'Data de adesão';
comment on column staging.stg_erp_contratos.situacao is 'Situação do contrato';
comment on column staging.stg_erp_contratos._dt_carga is 'Data e hora da ingestão';
