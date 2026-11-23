-- staging.stg_crm_propostas
-- Carga bruta de propostas de adesão digitadas no CRM
-- Domínio: Staging | Camada: staging | Dono: Thiago Meireles (Engenharia de Dados)
-- Rotina: ingest_crm | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists staging.stg_crm_propostas (
    id_proposta_crm  bigint        not null,
    id_cliente_crm   bigint        not null,
    cd_vendedor      varchar(12)   not null,
    cd_plano         varchar(12)   not null,
    segmento         varchar(20)   not null,
    canal_venda      varchar(30)   not null,
    vl_credito       decimal(14,2) not null,
    status_proposta  varchar(20)   not null,
    dt_proposta      timestamp     not null,
    dt_atualizacao   timestamp     not null,
    _dt_carga        timestamp     not null,
    constraint pk_stg_crm_propostas primary key (id_proposta_crm),
    constraint fk_stg_crm_propostas_id_cliente_crm foreign key (id_cliente_crm) references staging.stg_crm_clientes (id_cliente_crm)
);

comment on table staging.stg_crm_propostas is 'Carga bruta de propostas de adesão digitadas no CRM';
comment on column staging.stg_crm_propostas.id_proposta_crm is 'Identificador da proposta no CRM';
comment on column staging.stg_crm_propostas.id_cliente_crm is 'Cliente proponente';
comment on column staging.stg_crm_propostas.cd_vendedor is 'Código do vendedor responsável';
comment on column staging.stg_crm_propostas.cd_plano is 'Plano escolhido na proposta';
comment on column staging.stg_crm_propostas.segmento is 'Segmento do consórcio';
comment on column staging.stg_crm_propostas.canal_venda is 'Canal de venda da proposta';
comment on column staging.stg_crm_propostas.vl_credito is 'Valor do crédito pretendido';
comment on column staging.stg_crm_propostas.status_proposta is 'Situação da proposta no CRM';
comment on column staging.stg_crm_propostas.dt_proposta is 'Data e hora da digitação';
comment on column staging.stg_crm_propostas.dt_atualizacao is 'Última alteração na origem';
comment on column staging.stg_crm_propostas._dt_carga is 'Data e hora da ingestão';
