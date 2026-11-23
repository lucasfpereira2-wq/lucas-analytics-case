-- core.dim_parceiro
-- Parceiros comerciais e correspondentes
-- Domínio: Vendas | Camada: core | Dono: Bruno Tavares (Inteligência Comercial)
-- Rotina: core_vendas | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.dim_parceiro (
    id_parceiro        integer      not null,
    cnpj_parceiro      varchar(18)  not null,
    razao_social       varchar(120) not null,
    nm_contato         varchar(120),
    email_contato      varchar(120),
    uf                 char(2)      not null,
    tipo_parceiro      varchar(30)  not null,
    fl_ativo           char(1)      not null,
    dt_credenciamento  date         not null,
    constraint pk_dim_parceiro primary key (id_parceiro)
);

comment on table core.dim_parceiro is 'Parceiros comerciais e correspondentes';
comment on column core.dim_parceiro.id_parceiro is 'Chave do parceiro comercial';
comment on column core.dim_parceiro.cnpj_parceiro is 'CNPJ do parceiro';
comment on column core.dim_parceiro.razao_social is 'Razão social';
comment on column core.dim_parceiro.nm_contato is '[PII/LGPD] Pessoa de contato';
comment on column core.dim_parceiro.email_contato is '[PII/LGPD] E-mail de contato';
comment on column core.dim_parceiro.uf is 'UF de atuação';
comment on column core.dim_parceiro.tipo_parceiro is 'Correspondente, concessionária ou imobiliária';
comment on column core.dim_parceiro.fl_ativo is 'Parceiro ativo (S/N)';
comment on column core.dim_parceiro.dt_credenciamento is 'Data de credenciamento';
