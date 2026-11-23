-- marts.mart_cobranca_carteira
-- Mart do relatório de Carteira e Inadimplência
-- Domínio: Marts | Camada: mart | Dono: Fernanda Rocha (Analytics & BI)
-- Rotina: mart_cobranca | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists marts.mart_cobranca_carteira (
    dt_referencia     date          not null,
    segmento          varchar(20)   not null,
    regional          varchar(30)   not null,
    faixa_atraso      varchar(10)   not null,
    qt_cotas          integer       not null,
    vl_saldo_devedor  decimal(18,2) not null,
    vl_saldo_atraso   decimal(18,2) not null,
    vl_previsto       decimal(18,2) not null,
    vl_recebido       decimal(18,2) not null,
    vl_recuperado     decimal(18,2) not null,
    qt_acordos        integer       not null,
    dt_carga          timestamp     not null,
    constraint pk_mart_cobranca_carteira primary key (dt_referencia, segmento, regional, faixa_atraso)
);

comment on table marts.mart_cobranca_carteira is 'Mart do relatório de Carteira e Inadimplência';
comment on column marts.mart_cobranca_carteira.dt_referencia is 'Data de referência';
comment on column marts.mart_cobranca_carteira.segmento is 'Segmento';
comment on column marts.mart_cobranca_carteira.regional is 'Regional';
comment on column marts.mart_cobranca_carteira.faixa_atraso is 'Faixa de atraso';
comment on column marts.mart_cobranca_carteira.qt_cotas is 'Cotas na carteira';
comment on column marts.mart_cobranca_carteira.vl_saldo_devedor is 'Saldo devedor';
comment on column marts.mart_cobranca_carteira.vl_saldo_atraso is 'Saldo em atraso';
comment on column marts.mart_cobranca_carteira.vl_previsto is 'Recebimento previsto no dia';
comment on column marts.mart_cobranca_carteira.vl_recebido is 'Recebimento realizado no dia';
comment on column marts.mart_cobranca_carteira.vl_recuperado is 'Valor recuperado por ações de cobrança';
comment on column marts.mart_cobranca_carteira.qt_acordos is 'Acordos firmados';
comment on column marts.mart_cobranca_carteira.dt_carga is 'Data e hora da carga';
