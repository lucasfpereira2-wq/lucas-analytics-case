-- core.fato_meta_comercial
-- Metas comerciais por regional, canal e segmento (carga manual)
-- Domínio: Vendas | Camada: core | Dono: Bruno Tavares (Inteligência Comercial (planilha manual))
-- Rotina: planilha_metas_manual | Frequência: mensal | SLA: 744h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.fato_meta_comercial (
    competencia      char(7)       not null,
    regional         varchar(30)   not null,
    canal_venda      varchar(30)   not null,
    segmento         varchar(20)   not null,
    qt_meta_cotas    integer       not null,
    vl_meta_credito  decimal(16,2) not null,
    versao_planilha  varchar(20)   not null,
    usuario_carga    varchar(40)   not null,
    dt_carga         timestamp     not null,
    constraint pk_fato_meta_comercial primary key (competencia, regional, canal_venda, segmento)
);

comment on table core.fato_meta_comercial is 'Metas comerciais por regional, canal e segmento (carga manual)';
comment on column core.fato_meta_comercial.competencia is 'Mês de competência (AAAA-MM)';
comment on column core.fato_meta_comercial.regional is 'Regional comercial';
comment on column core.fato_meta_comercial.canal_venda is 'Canal de venda';
comment on column core.fato_meta_comercial.segmento is 'Segmento';
comment on column core.fato_meta_comercial.qt_meta_cotas is 'Meta de cotas vendidas';
comment on column core.fato_meta_comercial.vl_meta_credito is 'Meta de crédito comercializado';
comment on column core.fato_meta_comercial.versao_planilha is 'Versão da planilha carregada';
comment on column core.fato_meta_comercial.usuario_carga is 'Usuário que realizou a carga manual';
comment on column core.fato_meta_comercial.dt_carga is 'Data e hora da carga';
