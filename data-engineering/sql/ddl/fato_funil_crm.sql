-- core.fato_funil_crm
-- Funil comercial consolidado por etapa
-- Domínio: Vendas | Camada: core | Dono: Bruno Tavares (Inteligência Comercial)
-- Rotina: core_vendas | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.fato_funil_crm (
    id_funil           bigint        not null,
    id_lead            bigint        not null,
    id_proposta        bigint,
    etapa              varchar(30)   not null,
    ordem_etapa        smallint      not null,
    canal_venda        varchar(30)   not null,
    dt_entrada_etapa   timestamp     not null,
    dt_saida_etapa     timestamp,
    tempo_etapa_horas  decimal(10,2),
    constraint pk_fato_funil_crm primary key (id_funil),
    constraint fk_fato_funil_crm_id_lead foreign key (id_lead) references core.fato_lead (id_lead),
    constraint fk_fato_funil_crm_id_proposta foreign key (id_proposta) references core.fato_proposta (id_proposta)
);

comment on table core.fato_funil_crm is 'Funil comercial consolidado por etapa';
comment on column core.fato_funil_crm.id_funil is 'Chave do registro de funil';
comment on column core.fato_funil_crm.id_lead is 'Lead';
comment on column core.fato_funil_crm.id_proposta is 'Proposta, a partir da etapa de proposta';
comment on column core.fato_funil_crm.etapa is 'Etapa do funil';
comment on column core.fato_funil_crm.ordem_etapa is 'Ordem da etapa no funil';
comment on column core.fato_funil_crm.canal_venda is 'Canal de venda';
comment on column core.fato_funil_crm.dt_entrada_etapa is 'Entrada na etapa';
comment on column core.fato_funil_crm.dt_saida_etapa is 'Saída da etapa';
comment on column core.fato_funil_crm.tempo_etapa_horas is 'Tempo de permanência na etapa';
