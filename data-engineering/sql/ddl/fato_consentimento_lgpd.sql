-- core.fato_consentimento_lgpd
-- Consentimentos e revogações de uso de dados pessoais (LGPD)
-- Domínio: Cadastro | Camada: core | Dono: Marina Azevedo (Cadastro & CRM)
-- Rotina: core_cadastro | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.fato_consentimento_lgpd (
    id_consentimento  bigint      not null,
    id_cliente        bigint      not null,
    finalidade        varchar(40) not null,
    base_legal        varchar(40),
    canal_coleta      varchar(30) not null,
    fl_consentido     char(1)     not null,
    dt_consentimento  timestamp   not null,
    dt_revogacao      timestamp,
    versao_termo      varchar(10) not null,
    ip_coleta         varchar(45),
    constraint pk_fato_consentimento_lgpd primary key (id_consentimento),
    constraint fk_fato_consentimento_lgpd_id_cliente foreign key (id_cliente) references staging.stg_crm_clientes (id_cliente_crm)
);

comment on table core.fato_consentimento_lgpd is 'Consentimentos e revogações de uso de dados pessoais (LGPD)';
comment on column core.fato_consentimento_lgpd.id_consentimento is 'Chave do registro de consentimento';
comment on column core.fato_consentimento_lgpd.id_cliente is 'Titular dos dados (identificador do CRM)';
comment on column core.fato_consentimento_lgpd.finalidade is 'Finalidade do tratamento';
comment on column core.fato_consentimento_lgpd.base_legal is 'Base legal do tratamento (LGPD, art. 7º)';
comment on column core.fato_consentimento_lgpd.canal_coleta is 'Canal em que o consentimento foi coletado';
comment on column core.fato_consentimento_lgpd.fl_consentido is 'Consentimento concedido (S/N)';
comment on column core.fato_consentimento_lgpd.dt_consentimento is 'Data e hora do consentimento';
comment on column core.fato_consentimento_lgpd.dt_revogacao is 'Data e hora da revogação';
comment on column core.fato_consentimento_lgpd.versao_termo is 'Versão do termo aceito';
comment on column core.fato_consentimento_lgpd.ip_coleta is '[PII/LGPD] Endereço IP da coleta';
