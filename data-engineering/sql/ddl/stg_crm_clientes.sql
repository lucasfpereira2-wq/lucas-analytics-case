-- staging.stg_crm_clientes
-- Carga bruta de clientes e prospects do CRM Comercial
-- Domínio: Staging | Camada: staging | Dono: Thiago Meireles (Engenharia de Dados)
-- Rotina: ingest_crm | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists staging.stg_crm_clientes (
    id_cliente_crm  bigint       not null,
    nome_cliente    varchar(120) not null,
    cpf_cnpj        varchar(18),
    tipo_pessoa     char(2)      not null,
    email           varchar(120),
    telefone        varchar(20),
    cep             varchar(9),
    municipio       varchar(80),
    uf              char(2),
    canal_origem    varchar(30)  not null,
    dt_cadastro     timestamp    not null,
    dt_atualizacao  timestamp    not null,
    _dt_carga       timestamp    not null,
    constraint pk_stg_crm_clientes primary key (id_cliente_crm)
);

comment on table staging.stg_crm_clientes is 'Carga bruta de clientes e prospects do CRM Comercial';
comment on column staging.stg_crm_clientes.id_cliente_crm is 'Identificador do cliente no CRM Comercial';
comment on column staging.stg_crm_clientes.nome_cliente is '[PII/LGPD] Nome completo ou razão social informada no cadastro';
comment on column staging.stg_crm_clientes.cpf_cnpj is '[PII/LGPD] CPF ou CNPJ como digitado na origem';
comment on column staging.stg_crm_clientes.tipo_pessoa is 'PF ou PJ';
comment on column staging.stg_crm_clientes.email is '[PII/LGPD] E-mail principal';
comment on column staging.stg_crm_clientes.telefone is '[PII/LGPD] Telefone principal com DDD';
comment on column staging.stg_crm_clientes.cep is '[PII/LGPD] CEP do endereço principal';
comment on column staging.stg_crm_clientes.municipio is 'Município do endereço principal';
comment on column staging.stg_crm_clientes.uf is 'Unidade da federação';
comment on column staging.stg_crm_clientes.canal_origem is 'Canal em que o cadastro foi originado';
comment on column staging.stg_crm_clientes.dt_cadastro is 'Data e hora do cadastro no CRM';
comment on column staging.stg_crm_clientes.dt_atualizacao is 'Última alteração do registro na origem';
comment on column staging.stg_crm_clientes._dt_carga is 'Data e hora da ingestão';
