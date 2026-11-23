-- core.dim_tabela_taxa
-- Tabelas de taxa de administração por plano e prazo
-- Domínio: Produto | Camada: core | Dono: Rafael Nogueira (Produtos)
-- Rotina: core_produto | Frequência: semanal | SLA: 168h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.dim_tabela_taxa (
    id_tabela_taxa         integer      not null,
    cd_plano               varchar(12)  not null,
    prazo_meses            smallint     not null,
    pc_taxa_administracao  decimal(7,4) not null,
    pc_taxa_antecipada     decimal(7,4) not null,
    dt_inicio_vigencia     date         not null,
    dt_fim_vigencia        date,
    constraint pk_dim_tabela_taxa primary key (id_tabela_taxa)
);

comment on table core.dim_tabela_taxa is 'Tabelas de taxa de administração por plano e prazo';
comment on column core.dim_tabela_taxa.id_tabela_taxa is 'Chave da tabela de taxa';
comment on column core.dim_tabela_taxa.cd_plano is 'Plano a que a tabela se aplica';
comment on column core.dim_tabela_taxa.prazo_meses is 'Prazo em meses';
comment on column core.dim_tabela_taxa.pc_taxa_administracao is 'Taxa de administração total';
comment on column core.dim_tabela_taxa.pc_taxa_antecipada is 'Taxa de administração antecipada';
comment on column core.dim_tabela_taxa.dt_inicio_vigencia is 'Início da vigência';
comment on column core.dim_tabela_taxa.dt_fim_vigencia is 'Fim da vigência';
