-- staging.stg_crm_funil_eventos
-- Eventos de mudança de etapa do funil comercial no CRM
-- Domínio: Staging | Camada: staging | Dono: Thiago Meireles (Engenharia de Dados)
-- Rotina: ingest_crm | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists staging.stg_crm_funil_eventos (
    id_evento        bigint      not null,
    id_lead          bigint      not null,
    id_proposta_crm  bigint,
    etapa            varchar(30) not null,
    etapa_anterior   varchar(30),
    cd_vendedor      varchar(12),
    canal_venda      varchar(30) not null,
    dt_evento        timestamp   not null,
    _dt_carga        timestamp   not null,
    constraint pk_stg_crm_funil_eventos primary key (id_evento)
);

comment on table staging.stg_crm_funil_eventos is 'Eventos de mudança de etapa do funil comercial no CRM';
comment on column staging.stg_crm_funil_eventos.id_evento is 'Identificador do evento de funil';
comment on column staging.stg_crm_funil_eventos.id_lead is 'Lead ao qual o evento pertence';
comment on column staging.stg_crm_funil_eventos.id_proposta_crm is 'Proposta associada, quando houver';
comment on column staging.stg_crm_funil_eventos.etapa is 'Etapa de destino do evento';
comment on column staging.stg_crm_funil_eventos.etapa_anterior is 'Etapa de origem';
comment on column staging.stg_crm_funil_eventos.cd_vendedor is 'Vendedor responsável no momento do evento';
comment on column staging.stg_crm_funil_eventos.canal_venda is 'Canal de venda';
comment on column staging.stg_crm_funil_eventos.dt_evento is 'Data e hora da mudança de etapa';
comment on column staging.stg_crm_funil_eventos._dt_carga is 'Data e hora da ingestão';
