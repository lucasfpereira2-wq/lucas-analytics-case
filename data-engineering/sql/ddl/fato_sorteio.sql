-- core.fato_sorteio
-- Resultados de sorteio por assembleia
-- Domínio: Assembleias | Camada: core | Dono: Diego Sampaio (Operações de Assembleias)
-- Rotina: core_assembleias | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.fato_sorteio (
    id_sorteio        bigint      not null,
    id_assembleia     bigint      not null,
    id_cota           bigint      not null,
    nr_sorteado       integer     not null,
    extracao_loteria  varchar(20) not null,
    fl_contemplada    char(1)     not null,
    dt_sorteio        date        not null,
    constraint pk_fato_sorteio primary key (id_sorteio),
    constraint fk_fato_sorteio_id_assembleia foreign key (id_assembleia) references core.fato_assembleia (id_assembleia)
);

comment on table core.fato_sorteio is 'Resultados de sorteio por assembleia';
comment on column core.fato_sorteio.id_sorteio is 'Chave do sorteio';
comment on column core.fato_sorteio.id_assembleia is 'Assembleia';
comment on column core.fato_sorteio.id_cota is 'Cota sorteada';
comment on column core.fato_sorteio.nr_sorteado is 'Número sorteado';
comment on column core.fato_sorteio.extracao_loteria is 'Extração da Loteria Federal usada como referência';
comment on column core.fato_sorteio.fl_contemplada is 'Cota apta e contemplada (S/N)';
comment on column core.fato_sorteio.dt_sorteio is 'Data do sorteio';
