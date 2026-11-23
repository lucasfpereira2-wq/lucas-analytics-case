-- core.dim_vendedor
-- Vendedores, representantes e sua equipe
-- Domínio: Vendas | Camada: core | Dono: Bruno Tavares (Inteligência Comercial)
-- Rotina: core_vendas | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.dim_vendedor (
    id_vendedor     integer      not null,
    id_colaborador  integer,
    id_equipe       integer      not null,
    nm_vendedor     varchar(120) not null,
    tipo_vendedor   varchar(20)  not null,
    canal_venda     varchar(30)  not null,
    regional        varchar(30)  not null,
    fl_ativo        char(1)      not null,
    dt_inicio       date         not null,
    constraint pk_dim_vendedor primary key (id_vendedor),
    constraint fk_dim_vendedor_id_colaborador foreign key (id_colaborador) references core.dim_colaborador (id_colaborador),
    constraint fk_dim_vendedor_id_equipe foreign key (id_equipe) references core.dim_equipe_comercial (id_equipe)
);

comment on table core.dim_vendedor is 'Vendedores, representantes e sua equipe';
comment on column core.dim_vendedor.id_vendedor is 'Chave do vendedor';
comment on column core.dim_vendedor.id_colaborador is 'Colaborador (vazio para representantes externos)';
comment on column core.dim_vendedor.id_equipe is 'Equipe comercial';
comment on column core.dim_vendedor.nm_vendedor is '[PII/LGPD] Nome do vendedor';
comment on column core.dim_vendedor.tipo_vendedor is 'Próprio, representante ou parceiro';
comment on column core.dim_vendedor.canal_venda is 'Canal de atuação';
comment on column core.dim_vendedor.regional is 'Regional comercial';
comment on column core.dim_vendedor.fl_ativo is 'Vendedor ativo (S/N)';
comment on column core.dim_vendedor.dt_inicio is 'Início da atuação';
