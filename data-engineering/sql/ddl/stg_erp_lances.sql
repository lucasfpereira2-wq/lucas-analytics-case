-- staging.stg_erp_lances
-- Lances ofertados pelos consorciados
-- Domínio: Staging | Camada: staging | Dono: Thiago Meireles (Engenharia de Dados)
-- Rotina: ingest_erp | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists staging.stg_erp_lances (
    id_lance_erp       bigint        not null,
    id_assembleia_erp  bigint        not null,
    id_cota_erp        bigint        not null,
    tipo_lance         varchar(20)   not null,
    pc_lance           decimal(7,4)  not null,
    vl_lance           decimal(14,2) not null,
    vl_embutido        decimal(14,2),
    fl_vencedor        char(1)       not null,
    dt_oferta          timestamp     not null,
    _dt_carga          timestamp     not null,
    constraint pk_stg_erp_lances primary key (id_lance_erp),
    constraint fk_stg_erp_lances_id_assembleia_erp foreign key (id_assembleia_erp) references staging.stg_erp_assembleias (id_assembleia_erp),
    constraint fk_stg_erp_lances_id_cota_erp foreign key (id_cota_erp) references staging.stg_erp_cotas (id_cota_erp)
);

comment on table staging.stg_erp_lances is 'Lances ofertados pelos consorciados';
comment on column staging.stg_erp_lances.id_lance_erp is 'Identificador do lance no ERP';
comment on column staging.stg_erp_lances.id_assembleia_erp is 'Assembleia em que o lance foi ofertado';
comment on column staging.stg_erp_lances.id_cota_erp is 'Cota ofertante';
comment on column staging.stg_erp_lances.tipo_lance is 'Livre, fixo ou embutido';
comment on column staging.stg_erp_lances.pc_lance is 'Percentual do crédito ofertado';
comment on column staging.stg_erp_lances.vl_lance is 'Valor do lance';
comment on column staging.stg_erp_lances.vl_embutido is 'Parte do lance embutida no crédito';
comment on column staging.stg_erp_lances.fl_vencedor is 'Indica lance vencedor (S/N)';
comment on column staging.stg_erp_lances.dt_oferta is 'Data e hora da oferta';
comment on column staging.stg_erp_lances._dt_carga is 'Data e hora da ingestão';
