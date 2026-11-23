-- core.fato_lance
-- Lances ofertados e vencedores
-- Domínio: Assembleias | Camada: core | Dono: Diego Sampaio (Operações de Assembleias)
-- Rotina: core_assembleias | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.fato_lance (
    id_lance           bigint        not null,
    id_assembleia      bigint        not null,
    id_grupo           integer       not null,
    id_cota            bigint        not null,
    tipo_lance         varchar(20)   not null,
    pc_lance           decimal(7,4)  not null,
    vl_lance           decimal(14,2) not null,
    vl_lance_embutido  decimal(14,2),
    fl_vencedor        char(1)       not null,
    dt_oferta          timestamp     not null,
    constraint pk_fato_lance primary key (id_lance),
    constraint fk_fato_lance_id_assembleia foreign key (id_assembleia) references core.fato_assembleia (id_assembleia),
    constraint fk_fato_lance_id_grupo foreign key (id_grupo) references core.dim_grupo (id_grupo)
);

comment on table core.fato_lance is 'Lances ofertados e vencedores';
comment on column core.fato_lance.id_lance is 'Chave do lance';
comment on column core.fato_lance.id_assembleia is 'Assembleia';
comment on column core.fato_lance.id_grupo is 'Grupo';
comment on column core.fato_lance.id_cota is 'Cota ofertante';
comment on column core.fato_lance.tipo_lance is 'Livre, fixo ou embutido';
comment on column core.fato_lance.pc_lance is 'Percentual do crédito ofertado';
comment on column core.fato_lance.vl_lance is 'Valor do lance';
comment on column core.fato_lance.vl_lance_embutido is 'Parte embutida no crédito';
comment on column core.fato_lance.fl_vencedor is 'Lance vencedor (S/N)';
comment on column core.fato_lance.dt_oferta is 'Data e hora da oferta';
