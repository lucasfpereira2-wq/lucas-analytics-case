-- core.dim_contato
-- Telefones e e-mails de contato dos clientes
-- Domínio: Cadastro | Camada: core | Dono: Marina Azevedo (Cadastro & CRM)
-- Rotina: core_cadastro | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.dim_contato (
    id_contato      bigint       not null,
    id_cliente      bigint       not null,
    tipo_contato    varchar(20)  not null,
    telefone        varchar(20),
    email           varchar(120),
    fl_whatsapp     char(1)      not null,
    fl_principal    char(1)      not null,
    fl_opt_in       char(1)      not null,
    dt_atualizacao  timestamp    not null,
    constraint pk_dim_contato primary key (id_contato),
    constraint fk_dim_contato_id_cliente foreign key (id_cliente) references staging.stg_crm_clientes (id_cliente_crm)
);

comment on table core.dim_contato is 'Telefones e e-mails de contato dos clientes';
comment on column core.dim_contato.id_contato is 'Chave do contato';
comment on column core.dim_contato.id_cliente is 'Cliente (identificador do CRM)';
comment on column core.dim_contato.tipo_contato is 'Celular, fixo ou e-mail';
comment on column core.dim_contato.telefone is '[PII/LGPD] Telefone com DDD';
comment on column core.dim_contato.email is '[PII/LGPD] Endereço de e-mail';
comment on column core.dim_contato.fl_whatsapp is 'Número com WhatsApp (S/N)';
comment on column core.dim_contato.fl_principal is 'Contato principal (S/N)';
comment on column core.dim_contato.fl_opt_in is 'Aceita comunicações (S/N)';
comment on column core.dim_contato.dt_atualizacao is 'Última atualização';
