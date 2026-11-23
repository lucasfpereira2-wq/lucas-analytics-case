-- staging.stg_banco_retorno_cnab
-- Arquivos de retorno CNAB 240 com liquidações bancárias
-- Domínio: Staging | Camada: staging | Dono: Thiago Meireles (Engenharia de Dados)
-- Rotina: ingest_banco_cnab | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists staging.stg_banco_retorno_cnab (
    id_registro    bigint        not null,
    nm_arquivo     varchar(60)   not null,
    nr_lote        integer       not null,
    nosso_numero   varchar(20)   not null,
    cd_ocorrencia  char(2)       not null,
    dt_ocorrencia  date          not null,
    dt_credito     date,
    vl_pago        decimal(12,2) not null,
    vl_tarifa      decimal(8,2)  not null,
    cd_banco       char(3)       not null,
    _dt_carga      timestamp     not null,
    constraint pk_stg_banco_retorno_cnab primary key (id_registro)
);

comment on table staging.stg_banco_retorno_cnab is 'Arquivos de retorno CNAB 240 com liquidações bancárias';
comment on column staging.stg_banco_retorno_cnab.id_registro is 'Identificador do registro de retorno';
comment on column staging.stg_banco_retorno_cnab.nm_arquivo is 'Nome do arquivo CNAB 240 de origem';
comment on column staging.stg_banco_retorno_cnab.nr_lote is 'Número do lote no arquivo';
comment on column staging.stg_banco_retorno_cnab.nosso_numero is 'Identificação do título no banco';
comment on column staging.stg_banco_retorno_cnab.cd_ocorrencia is 'Código de ocorrência do retorno';
comment on column staging.stg_banco_retorno_cnab.dt_ocorrencia is 'Data da ocorrência';
comment on column staging.stg_banco_retorno_cnab.dt_credito is 'Data de crédito em conta';
comment on column staging.stg_banco_retorno_cnab.vl_pago is 'Valor pago pelo sacado';
comment on column staging.stg_banco_retorno_cnab.vl_tarifa is 'Tarifa cobrada pelo banco';
comment on column staging.stg_banco_retorno_cnab.cd_banco is 'Código do banco';
comment on column staging.stg_banco_retorno_cnab._dt_carga is 'Data e hora da ingestão';
