-- core.fato_lead
-- Leads captados por canal e origem
-- Domínio: Vendas | Camada: core | Dono: Bruno Tavares (Inteligência Comercial)
-- Rotina: core_vendas | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.fato_lead (
    id_lead              bigint      not null,
    canal_venda          varchar(30) not null,
    origem_lead          varchar(40) not null,
    campanha             varchar(60),
    uf                   char(2),
    segmento_interesse   varchar(20),
    etapa_atual          varchar(30) not null,
    cd_vendedor          varchar(12),
    dt_captacao          timestamp   not null,
    dt_ultima_interacao  timestamp,
    constraint pk_fato_lead primary key (id_lead)
);

comment on table core.fato_lead is 'Leads captados por canal e origem';
comment on column core.fato_lead.id_lead is 'Chave do lead';
comment on column core.fato_lead.canal_venda is 'Canal de captação';
comment on column core.fato_lead.origem_lead is 'Origem (site, indicação, campanha, parceiro)';
comment on column core.fato_lead.campanha is 'Campanha de marketing associada';
comment on column core.fato_lead.uf is 'UF informada pelo lead';
comment on column core.fato_lead.segmento_interesse is 'Segmento de interesse';
comment on column core.fato_lead.etapa_atual is 'Etapa atual no funil';
comment on column core.fato_lead.cd_vendedor is 'Vendedor responsável';
comment on column core.fato_lead.dt_captacao is 'Data e hora da captação';
comment on column core.fato_lead.dt_ultima_interacao is 'Última interação registrada';
