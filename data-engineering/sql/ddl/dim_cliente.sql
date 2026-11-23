-- core.dim_cliente
-- Cadastro único de clientes (consorciados e prospects)
-- Domínio: Cadastro | Camada: core | Dono: Marina Azevedo (Cadastro & CRM)
-- Rotina: core_cadastro | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.dim_cliente (
    id_cliente      bigint       not null,
    id_cliente_crm  bigint,
    cpf_cliente     varchar(14),
    nome_cliente    varchar(120) not null,
    tipo_pessoa     char(2)      not null,
    dt_nascimento   date,
    canal_origem    varchar(30)  not null,
    uf              char(2),
    regional        varchar(30),
    fl_consorciado  char(1)      not null,
    dt_cadastro     date         not null,
    dt_atualizacao  timestamp    not null,
    constraint pk_dim_cliente primary key (id_cliente),
    constraint fk_dim_cliente_id_cliente_crm foreign key (id_cliente_crm) references staging.stg_crm_clientes (id_cliente_crm)
);

comment on table core.dim_cliente is 'Cadastro único de clientes (consorciados e prospects)';
comment on column core.dim_cliente.id_cliente is 'Chave do cliente no cadastro único';
comment on column core.dim_cliente.id_cliente_crm is 'Identificador no CRM Comercial';
comment on column core.dim_cliente.cpf_cliente is '[PII/LGPD] CPF do cliente (ausente em parte dos cadastros do canal Parceiro)';
comment on column core.dim_cliente.nome_cliente is '[PII/LGPD] Nome completo ou razão social';
comment on column core.dim_cliente.tipo_pessoa is 'PF ou PJ';
comment on column core.dim_cliente.dt_nascimento is '[PII/LGPD] Data de nascimento (PF)';
comment on column core.dim_cliente.canal_origem is 'Canal em que o cadastro foi originado';
comment on column core.dim_cliente.uf is 'UF de residência';
comment on column core.dim_cliente.regional is 'Regional comercial';
comment on column core.dim_cliente.fl_consorciado is 'Possui cota ativa (S/N)';
comment on column core.dim_cliente.dt_cadastro is 'Data do primeiro cadastro';
comment on column core.dim_cliente.dt_atualizacao is 'Última atualização do registro';
