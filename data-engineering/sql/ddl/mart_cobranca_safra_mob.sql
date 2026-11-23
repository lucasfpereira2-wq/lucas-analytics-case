-- marts.mart_cobranca_safra_mob
-- Mart de safra, MOB e cohort de cancelamento
-- Domínio: Marts | Camada: mart | Dono: Fernanda Rocha (Analytics & BI)
-- Rotina: mart_cobranca | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists marts.mart_cobranca_safra_mob (
    safra             char(7)       not null,
    mob               smallint      not null,
    segmento          varchar(20)   not null,
    canal_venda       varchar(30)   not null,
    qt_cotas_safra    integer       not null,
    qt_cotas_ativas   integer       not null,
    qt_cotas_over30   integer       not null,
    qt_cotas_over60   integer       not null,
    qt_cotas_over90   integer       not null,
    qt_cancelamentos  integer       not null,
    vl_credito_safra  decimal(18,2) not null,
    dt_carga          timestamp     not null,
    constraint pk_mart_cobranca_safra_mob primary key (safra, mob, segmento, canal_venda)
);

comment on table marts.mart_cobranca_safra_mob is 'Mart de safra, MOB e cohort de cancelamento';
comment on column marts.mart_cobranca_safra_mob.safra is 'Mês de adesão (AAAA-MM)';
comment on column marts.mart_cobranca_safra_mob.mob is 'Meses desde a adesão';
comment on column marts.mart_cobranca_safra_mob.segmento is 'Segmento';
comment on column marts.mart_cobranca_safra_mob.canal_venda is 'Canal de venda';
comment on column marts.mart_cobranca_safra_mob.qt_cotas_safra is 'Cotas vendidas na safra';
comment on column marts.mart_cobranca_safra_mob.qt_cotas_ativas is 'Cotas ativas no MOB';
comment on column marts.mart_cobranca_safra_mob.qt_cotas_over30 is 'Cotas com atraso acima de 30 dias';
comment on column marts.mart_cobranca_safra_mob.qt_cotas_over60 is 'Cotas com atraso acima de 60 dias';
comment on column marts.mart_cobranca_safra_mob.qt_cotas_over90 is 'Cotas com atraso acima de 90 dias';
comment on column marts.mart_cobranca_safra_mob.qt_cancelamentos is 'Cancelamentos acumulados até o MOB';
comment on column marts.mart_cobranca_safra_mob.vl_credito_safra is 'Crédito comercializado na safra';
comment on column marts.mart_cobranca_safra_mob.dt_carga is 'Data e hora da carga';
