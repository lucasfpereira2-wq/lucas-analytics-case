-- core.dim_endereco
-- Endereços dos clientes com UF e município
-- Domínio: Cadastro | Camada: core | Dono: Marina Azevedo (Cadastro & CRM)
-- Rotina: core_cadastro | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.dim_endereco (
    id_endereco    bigint       not null,
    id_cliente     bigint       not null,
    tipo_endereco  varchar(20)  not null,
    logradouro     varchar(120) not null,
    numero         varchar(10),
    complemento    varchar(60),
    bairro         varchar(60),
    municipio      varchar(80)  not null,
    uf             char(2)      not null,
    cep            varchar(9)   not null,
    fl_principal   char(1)      not null,
    constraint pk_dim_endereco primary key (id_endereco),
    constraint fk_dim_endereco_id_cliente foreign key (id_cliente) references staging.stg_crm_clientes (id_cliente_crm)
);

comment on table core.dim_endereco is 'Endereços dos clientes com UF e município';
comment on column core.dim_endereco.id_endereco is 'Chave do endereço';
comment on column core.dim_endereco.id_cliente is 'Cliente (identificador do CRM)';
comment on column core.dim_endereco.tipo_endereco is 'Residencial, comercial ou correspondência';
comment on column core.dim_endereco.logradouro is '[PII/LGPD] Logradouro';
comment on column core.dim_endereco.numero is '[PII/LGPD] Número';
comment on column core.dim_endereco.complemento is '[PII/LGPD] Complemento';
comment on column core.dim_endereco.bairro is 'Bairro';
comment on column core.dim_endereco.municipio is 'Município';
comment on column core.dim_endereco.uf is 'Unidade da federação';
comment on column core.dim_endereco.cep is '[PII/LGPD] CEP';
comment on column core.dim_endereco.fl_principal is 'Endereço principal (S/N)';
