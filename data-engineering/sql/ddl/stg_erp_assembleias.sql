-- staging.stg_erp_assembleias
-- Assembleias realizadas e resultados de sorteio no ERP
-- Domínio: Staging | Camada: staging | Dono: Thiago Meireles (Engenharia de Dados)
-- Rotina: ingest_erp | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists staging.stg_erp_assembleias (
    id_assembleia_erp        bigint        not null,
    cd_grupo                 varchar(8)    not null,
    nr_assembleia            integer       not null,
    dt_assembleia            date          not null,
    tipo_assembleia          varchar(20)   not null,
    qt_participantes         integer       not null,
    qt_contemplados_sorteio  integer       not null,
    qt_contemplados_lance    integer       not null,
    vl_saldo_fundo           decimal(16,2) not null,
    _dt_carga                timestamp     not null,
    constraint pk_stg_erp_assembleias primary key (id_assembleia_erp)
);

comment on table staging.stg_erp_assembleias is 'Assembleias realizadas e resultados de sorteio no ERP';
comment on column staging.stg_erp_assembleias.id_assembleia_erp is 'Identificador da assembleia no ERP';
comment on column staging.stg_erp_assembleias.cd_grupo is 'Código do grupo';
comment on column staging.stg_erp_assembleias.nr_assembleia is 'Número sequencial da assembleia no grupo';
comment on column staging.stg_erp_assembleias.dt_assembleia is 'Data de realização';
comment on column staging.stg_erp_assembleias.tipo_assembleia is 'Ordinária ou extraordinária';
comment on column staging.stg_erp_assembleias.qt_participantes is 'Cotas aptas a concorrer';
comment on column staging.stg_erp_assembleias.qt_contemplados_sorteio is 'Contemplações por sorteio';
comment on column staging.stg_erp_assembleias.qt_contemplados_lance is 'Contemplações por lance';
comment on column staging.stg_erp_assembleias.vl_saldo_fundo is 'Saldo do fundo comum disponível na assembleia';
comment on column staging.stg_erp_assembleias._dt_carga is 'Data e hora da ingestão';
