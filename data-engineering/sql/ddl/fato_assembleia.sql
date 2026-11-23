-- core.fato_assembleia
-- Assembleias realizadas por grupo
-- Domínio: Assembleias | Camada: core | Dono: Diego Sampaio (Operações de Assembleias)
-- Rotina: core_assembleias | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.fato_assembleia (
    id_assembleia           bigint        not null,
    id_grupo                integer       not null,
    nr_assembleia           smallint      not null,
    tipo_assembleia         varchar(20)   not null,
    qt_cotas_participantes  integer       not null,
    qt_contemplacoes        integer       not null,
    vl_fundo_disponivel     decimal(16,2) not null,
    situacao                varchar(20)   not null,
    dt_assembleia           date          not null,
    constraint pk_fato_assembleia primary key (id_assembleia),
    constraint fk_fato_assembleia_id_grupo foreign key (id_grupo) references core.dim_grupo (id_grupo)
);

comment on table core.fato_assembleia is 'Assembleias realizadas por grupo';
comment on column core.fato_assembleia.id_assembleia is 'Chave da assembleia';
comment on column core.fato_assembleia.id_grupo is 'Grupo';
comment on column core.fato_assembleia.nr_assembleia is 'Número sequencial da assembleia no grupo';
comment on column core.fato_assembleia.tipo_assembleia is 'Ordinária ou extraordinária';
comment on column core.fato_assembleia.qt_cotas_participantes is 'Cotas aptas a concorrer';
comment on column core.fato_assembleia.qt_contemplacoes is 'Contemplações na assembleia';
comment on column core.fato_assembleia.vl_fundo_disponivel is 'Fundo comum disponível para contemplação';
comment on column core.fato_assembleia.situacao is 'Realizada, agendada ou cancelada';
comment on column core.fato_assembleia.dt_assembleia is 'Data de realização';
