-- marts.mart_vendas_comercial
-- Mart do relatório de Vendas / Comercial
-- Domínio: Marts | Camada: mart | Dono: Fernanda Rocha (Analytics & BI)
-- Rotina: mart_vendas | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists marts.mart_vendas_comercial (
    dt_referencia        date          not null,
    regional             varchar(30)   not null,
    uf                   char(2)       not null,
    canal_venda          varchar(30)   not null,
    segmento             varchar(20)   not null,
    qt_leads             integer       not null,
    qt_propostas         integer       not null,
    qt_vendas            integer       not null,
    vl_credito_vendido   decimal(16,2) not null,
    qt_meta_cotas        integer,
    vl_meta_credito      decimal(16,2),
    qt_cancelamentos_7d  integer       not null,
    dt_carga             timestamp     not null,
    constraint pk_mart_vendas_comercial primary key (dt_referencia, regional, uf, canal_venda, segmento)
);

comment on table marts.mart_vendas_comercial is 'Mart do relatório de Vendas / Comercial';
comment on column marts.mart_vendas_comercial.dt_referencia is 'Data de referência';
comment on column marts.mart_vendas_comercial.regional is 'Regional comercial';
comment on column marts.mart_vendas_comercial.uf is 'UF';
comment on column marts.mart_vendas_comercial.canal_venda is 'Canal de venda';
comment on column marts.mart_vendas_comercial.segmento is 'Segmento';
comment on column marts.mart_vendas_comercial.qt_leads is 'Leads captados';
comment on column marts.mart_vendas_comercial.qt_propostas is 'Propostas digitadas';
comment on column marts.mart_vendas_comercial.qt_vendas is 'Cotas vendidas';
comment on column marts.mart_vendas_comercial.vl_credito_vendido is 'Crédito comercializado';
comment on column marts.mart_vendas_comercial.qt_meta_cotas is 'Meta de cotas do período';
comment on column marts.mart_vendas_comercial.vl_meta_credito is 'Meta de crédito do período';
comment on column marts.mart_vendas_comercial.qt_cancelamentos_7d is 'Cancelamentos no prazo de arrependimento';
comment on column marts.mart_vendas_comercial.dt_carga is 'Data e hora da carga';
