-- marts.mart_executivo_kpis
-- KPIs consolidados para o comitê executivo
-- Domínio: Marts | Camada: mart | Dono: Fernanda Rocha (Analytics & BI)
-- Rotina: mart_executivo | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists marts.mart_executivo_kpis (
    dt_referencia        date          not null,
    cd_kpi               varchar(30)   not null,
    nm_kpi               varchar(80)   not null,
    dominio              varchar(30)   not null,
    vl_kpi               decimal(18,4) not null,
    vl_meta              decimal(18,4),
    vl_periodo_anterior  decimal(18,4),
    unidade              varchar(10)   not null,
    mart_origem          varchar(40)   not null,
    dt_carga             timestamp     not null,
    constraint pk_mart_executivo_kpis primary key (dt_referencia, cd_kpi)
);

comment on table marts.mart_executivo_kpis is 'KPIs consolidados para o comitê executivo';
comment on column marts.mart_executivo_kpis.dt_referencia is 'Data de referência';
comment on column marts.mart_executivo_kpis.cd_kpi is 'Código do indicador';
comment on column marts.mart_executivo_kpis.nm_kpi is 'Nome do indicador';
comment on column marts.mart_executivo_kpis.dominio is 'Domínio de negócio';
comment on column marts.mart_executivo_kpis.vl_kpi is 'Valor do indicador';
comment on column marts.mart_executivo_kpis.vl_meta is 'Meta do indicador';
comment on column marts.mart_executivo_kpis.vl_periodo_anterior is 'Valor no período anterior';
comment on column marts.mart_executivo_kpis.unidade is 'Unidade de medida';
comment on column marts.mart_executivo_kpis.mart_origem is 'Mart de origem do indicador';
comment on column marts.mart_executivo_kpis.dt_carga is 'Data e hora da carga';
