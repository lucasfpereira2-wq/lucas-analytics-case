-- core.fato_garantia
-- Garantias vinculadas aos créditos liberados
-- Domínio: Assembleias | Camada: core | Dono: Diego Sampaio (Operações de Assembleias)
-- Rotina: core_assembleias_garantias | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.fato_garantia (
    id_garantia              bigint        not null,
    id_liberacao             bigint        not null,
    tipo_garantia            varchar(30)   not null,
    descricao_bem            varchar(160)  not null,
    vl_avaliacao             decimal(14,2) not null,
    fl_alienacao_registrada  char(1)       not null,
    situacao                 varchar(20)   not null,
    dt_registro              date,
    constraint pk_fato_garantia primary key (id_garantia),
    constraint fk_fato_garantia_id_liberacao foreign key (id_liberacao) references core.fato_liberacao_credito (id_liberacao)
);

comment on table core.fato_garantia is 'Garantias vinculadas aos créditos liberados';
comment on column core.fato_garantia.id_garantia is 'Chave da garantia';
comment on column core.fato_garantia.id_liberacao is 'Crédito liberado';
comment on column core.fato_garantia.tipo_garantia is 'Alienação fiduciária, hipoteca ou fiança';
comment on column core.fato_garantia.descricao_bem is 'Bem dado em garantia';
comment on column core.fato_garantia.vl_avaliacao is 'Valor de avaliação';
comment on column core.fato_garantia.fl_alienacao_registrada is 'Gravame registrado (S/N)';
comment on column core.fato_garantia.situacao is 'Situação da garantia';
comment on column core.fato_garantia.dt_registro is 'Data do registro do gravame';
