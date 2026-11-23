-- core.dim_equipe_comercial
-- Equipes comerciais e supervisão
-- Domínio: Vendas | Camada: core | Dono: Bruno Tavares (Inteligência Comercial)
-- Rotina: core_vendas | Frequência: semanal | SLA: 168h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.dim_equipe_comercial (
    id_equipe      integer     not null,
    nm_equipe      varchar(60) not null,
    id_filial      integer     not null,
    id_supervisor  integer,
    canal_venda    varchar(30) not null,
    regional       varchar(30) not null,
    fl_ativa       char(1)     not null,
    constraint pk_dim_equipe_comercial primary key (id_equipe),
    constraint fk_dim_equipe_comercial_id_filial foreign key (id_filial) references core.dim_filial (id_filial),
    constraint fk_dim_equipe_comercial_id_supervisor foreign key (id_supervisor) references core.dim_colaborador (id_colaborador)
);

comment on table core.dim_equipe_comercial is 'Equipes comerciais e supervisão';
comment on column core.dim_equipe_comercial.id_equipe is 'Chave da equipe comercial';
comment on column core.dim_equipe_comercial.nm_equipe is 'Nome da equipe';
comment on column core.dim_equipe_comercial.id_filial is 'Filial da equipe';
comment on column core.dim_equipe_comercial.id_supervisor is 'Supervisor responsável';
comment on column core.dim_equipe_comercial.canal_venda is 'Canal de venda da equipe';
comment on column core.dim_equipe_comercial.regional is 'Regional comercial';
comment on column core.dim_equipe_comercial.fl_ativa is 'Equipe ativa (S/N)';
