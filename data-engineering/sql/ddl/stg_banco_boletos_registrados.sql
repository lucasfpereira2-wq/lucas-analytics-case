-- staging.stg_banco_boletos_registrados
-- Boletos registrados na API de cobrança do banco
-- Domínio: Staging | Camada: staging | Dono: Thiago Meireles (Engenharia de Dados)
-- Rotina: ingest_banco_boletos | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists staging.stg_banco_boletos_registrados (
    id_boleto_banco   bigint        not null,
    nosso_numero      varchar(20)   not null,
    nr_documento      varchar(20)   not null,
    cpf_cnpj_pagador  varchar(18)   not null,
    dt_emissao        date          not null,
    dt_vencimento     date          not null,
    vl_nominal        decimal(12,2) not null,
    status_registro   varchar(20)   not null,
    linha_digitavel   varchar(54)   not null,
    dt_registro       timestamp,
    _dt_carga         timestamp     not null,
    constraint pk_stg_banco_boletos_registrados primary key (id_boleto_banco)
);

comment on table staging.stg_banco_boletos_registrados is 'Boletos registrados na API de cobrança do banco';
comment on column staging.stg_banco_boletos_registrados.id_boleto_banco is 'Identificador do boleto na API do banco';
comment on column staging.stg_banco_boletos_registrados.nosso_numero is 'Identificação do título no banco';
comment on column staging.stg_banco_boletos_registrados.nr_documento is 'Número do documento (parcela)';
comment on column staging.stg_banco_boletos_registrados.cpf_cnpj_pagador is '[PII/LGPD] CPF ou CNPJ do pagador';
comment on column staging.stg_banco_boletos_registrados.dt_emissao is 'Data de emissão';
comment on column staging.stg_banco_boletos_registrados.dt_vencimento is 'Data de vencimento';
comment on column staging.stg_banco_boletos_registrados.vl_nominal is 'Valor nominal do boleto';
comment on column staging.stg_banco_boletos_registrados.status_registro is 'Situação do registro no banco';
comment on column staging.stg_banco_boletos_registrados.linha_digitavel is 'Linha digitável';
comment on column staging.stg_banco_boletos_registrados.dt_registro is 'Data e hora do registro';
comment on column staging.stg_banco_boletos_registrados._dt_carga is 'Data e hora da ingestão';
