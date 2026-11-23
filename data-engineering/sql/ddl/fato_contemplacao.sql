-- core.fato_contemplacao
-- Contemplações por sorteio e por lance
-- Domínio: Assembleias | Camada: core | Dono: Diego Sampaio (Operações de Assembleias)
-- Rotina: core_assembleias | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.fato_contemplacao (
    id_contemplacao    bigint        not null,
    id_assembleia      bigint        not null,
    id_cota            bigint        not null,
    id_lance           bigint,
    id_sorteio         bigint,
    tipo_contemplacao  varchar(10)   not null,
    vl_credito         decimal(14,2) not null,
    situacao           varchar(20)   not null,
    dt_contemplacao    date          not null,
    constraint pk_fato_contemplacao primary key (id_contemplacao),
    constraint fk_fato_contemplacao_id_assembleia foreign key (id_assembleia) references core.fato_assembleia (id_assembleia),
    constraint fk_fato_contemplacao_id_lance foreign key (id_lance) references core.fato_lance (id_lance),
    constraint fk_fato_contemplacao_id_sorteio foreign key (id_sorteio) references core.fato_sorteio (id_sorteio)
);

comment on table core.fato_contemplacao is 'Contemplações por sorteio e por lance';
comment on column core.fato_contemplacao.id_contemplacao is 'Chave da contemplação';
comment on column core.fato_contemplacao.id_assembleia is 'Assembleia';
comment on column core.fato_contemplacao.id_cota is 'Cota contemplada';
comment on column core.fato_contemplacao.id_lance is 'Lance vencedor, quando por lance';
comment on column core.fato_contemplacao.id_sorteio is 'Sorteio, quando por sorteio';
comment on column core.fato_contemplacao.tipo_contemplacao is 'Sorteio ou lance';
comment on column core.fato_contemplacao.vl_credito is 'Crédito contemplado';
comment on column core.fato_contemplacao.situacao is 'Confirmada, pendente de análise ou cancelada';
comment on column core.fato_contemplacao.dt_contemplacao is 'Data da contemplação';
