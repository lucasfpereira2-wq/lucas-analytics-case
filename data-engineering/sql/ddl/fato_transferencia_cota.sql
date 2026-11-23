-- core.fato_transferencia_cota
-- Transferências de titularidade de cotas
-- Domínio: Grupos e Cotas | Camada: core | Dono: Camila Furtado (Operações de Grupos)
-- Rotina: core_grupos_cotas | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.fato_transferencia_cota (
    id_transferencia        bigint        not null,
    id_cota                 bigint        not null,
    id_cliente_cedente      bigint        not null,
    id_cliente_cessionario  bigint        not null,
    vl_taxa_transferencia   decimal(10,2) not null,
    situacao                varchar(20)   not null,
    dt_solicitacao          date          not null,
    dt_efetivacao           date,
    constraint pk_fato_transferencia_cota primary key (id_transferencia),
    constraint fk_fato_transferencia_cota_id_cota foreign key (id_cota) references core.dim_cota (id_cota),
    constraint fk_fato_transferencia_cota_id_cliente_cedente foreign key (id_cliente_cedente) references core.dim_cliente (id_cliente),
    constraint fk_fato_transferencia_cota_id_cliente_cessionario foreign key (id_cliente_cessionario) references core.dim_cliente (id_cliente)
);

comment on table core.fato_transferencia_cota is 'Transferências de titularidade de cotas';
comment on column core.fato_transferencia_cota.id_transferencia is 'Chave da transferência';
comment on column core.fato_transferencia_cota.id_cota is 'Cota transferida';
comment on column core.fato_transferencia_cota.id_cliente_cedente is 'Titular que cede a cota';
comment on column core.fato_transferencia_cota.id_cliente_cessionario is 'Novo titular';
comment on column core.fato_transferencia_cota.vl_taxa_transferencia is 'Taxa de transferência cobrada';
comment on column core.fato_transferencia_cota.situacao is 'Solicitada, em análise, efetivada ou recusada';
comment on column core.fato_transferencia_cota.dt_solicitacao is 'Data da solicitação';
comment on column core.fato_transferencia_cota.dt_efetivacao is 'Data da efetivação';
