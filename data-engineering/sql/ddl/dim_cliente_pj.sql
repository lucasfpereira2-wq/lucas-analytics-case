-- core.dim_cliente_pj
-- Atributos específicos de pessoa jurídica
-- Domínio: Cadastro | Camada: core | Dono: Marina Azevedo (Cadastro & CRM)
-- Rotina: core_cadastro | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.dim_cliente_pj (
    id_cliente          bigint       not null,
    cnpj                varchar(18)  not null,
    razao_social        varchar(120) not null,
    nome_fantasia       varchar(120),
    cnae_principal      varchar(9),
    porte               varchar(20),
    nome_representante  varchar(120) not null,
    cpf_representante   varchar(14)  not null,
    dt_fundacao         date,
    constraint pk_dim_cliente_pj primary key (id_cliente),
    constraint fk_dim_cliente_pj_id_cliente foreign key (id_cliente) references core.dim_cliente (id_cliente)
);

comment on table core.dim_cliente_pj is 'Atributos específicos de pessoa jurídica';
comment on column core.dim_cliente_pj.id_cliente is 'Cliente pessoa jurídica';
comment on column core.dim_cliente_pj.cnpj is 'CNPJ';
comment on column core.dim_cliente_pj.razao_social is 'Razão social';
comment on column core.dim_cliente_pj.nome_fantasia is 'Nome fantasia';
comment on column core.dim_cliente_pj.cnae_principal is 'CNAE principal';
comment on column core.dim_cliente_pj.porte is 'Porte da empresa';
comment on column core.dim_cliente_pj.nome_representante is '[PII/LGPD] Representante legal';
comment on column core.dim_cliente_pj.cpf_representante is '[PII/LGPD] CPF do representante legal';
comment on column core.dim_cliente_pj.dt_fundacao is 'Data de fundação';
