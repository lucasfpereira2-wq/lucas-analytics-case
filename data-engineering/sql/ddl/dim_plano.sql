-- core.dim_plano
-- Planos comercializados (prazo, taxa de administração, fundo de reserva)
-- Domínio: Produto | Camada: core | Dono: Rafael Nogueira (Produtos)
-- Rotina: core_produto | Frequência: semanal | SLA: 168h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.dim_plano (
    id_plano               integer      not null,
    cd_plano               varchar(12)  not null,
    nm_plano               varchar(60)  not null,
    segmento               varchar(20)  not null,
    prazo_meses            smallint     not null,
    pc_taxa_administracao  decimal(7,4) not null,
    pc_fundo_reserva       decimal(7,4) not null,
    pc_seguro              decimal(7,4),
    fl_ativo               char(1)      not null,
    dt_inicio_vigencia     date         not null,
    constraint pk_dim_plano primary key (id_plano)
);

comment on table core.dim_plano is 'Planos comercializados (prazo, taxa de administração, fundo de reserva)';
comment on column core.dim_plano.id_plano is 'Chave do plano';
comment on column core.dim_plano.cd_plano is 'Código do plano no ERP';
comment on column core.dim_plano.nm_plano is 'Nome comercial do plano';
comment on column core.dim_plano.segmento is 'Segmento do plano';
comment on column core.dim_plano.prazo_meses is 'Prazo em meses';
comment on column core.dim_plano.pc_taxa_administracao is 'Taxa de administração total do plano';
comment on column core.dim_plano.pc_fundo_reserva is 'Percentual de fundo de reserva';
comment on column core.dim_plano.pc_seguro is 'Percentual de seguro prestamista';
comment on column core.dim_plano.fl_ativo is 'Plano em comercialização (S/N)';
comment on column core.dim_plano.dt_inicio_vigencia is 'Início da vigência';
