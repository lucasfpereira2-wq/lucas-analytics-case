-- marts.mart_assembleias_contemplacoes
-- Mart do relatório de Assembleias e Contemplações
-- Domínio: Marts | Camada: mart | Dono: Fernanda Rocha (Analytics & BI)
-- Rotina: mart_assembleias | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists marts.mart_assembleias_contemplacoes (
    competencia               char(7)       not null,
    id_grupo                  integer       not null,
    segmento                  varchar(20)   not null,
    qt_assembleias            integer       not null,
    qt_contemplacoes_sorteio  integer       not null,
    qt_contemplacoes_lance    integer       not null,
    qt_lances_ofertados       integer       not null,
    pc_lance_medio            decimal(7,4),
    vl_credito_contemplado    decimal(18,2) not null,
    vl_credito_liberado       decimal(18,2) not null,
    dias_medio_liberacao      decimal(7,2),
    dt_carga                  timestamp     not null,
    constraint pk_mart_assembleias_contemplacoes primary key (competencia, id_grupo),
    constraint fk_mart_assembleias_contemplacoes_id_grupo foreign key (id_grupo) references core.dim_grupo (id_grupo)
);

comment on table marts.mart_assembleias_contemplacoes is 'Mart do relatório de Assembleias e Contemplações';
comment on column marts.mart_assembleias_contemplacoes.competencia is 'Mês de competência (AAAA-MM)';
comment on column marts.mart_assembleias_contemplacoes.id_grupo is 'Grupo';
comment on column marts.mart_assembleias_contemplacoes.segmento is 'Segmento do grupo';
comment on column marts.mart_assembleias_contemplacoes.qt_assembleias is 'Assembleias realizadas';
comment on column marts.mart_assembleias_contemplacoes.qt_contemplacoes_sorteio is 'Contemplações por sorteio';
comment on column marts.mart_assembleias_contemplacoes.qt_contemplacoes_lance is 'Contemplações por lance';
comment on column marts.mart_assembleias_contemplacoes.qt_lances_ofertados is 'Lances ofertados';
comment on column marts.mart_assembleias_contemplacoes.pc_lance_medio is 'Percentual médio dos lances vencedores';
comment on column marts.mart_assembleias_contemplacoes.vl_credito_contemplado is 'Crédito contemplado';
comment on column marts.mart_assembleias_contemplacoes.vl_credito_liberado is 'Crédito liberado';
comment on column marts.mart_assembleias_contemplacoes.dias_medio_liberacao is 'Prazo médio entre contemplação e liberação';
comment on column marts.mart_assembleias_contemplacoes.dt_carga is 'Data e hora da carga';
