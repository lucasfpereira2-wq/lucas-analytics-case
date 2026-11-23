-- core.fato_liberacao_credito
-- Créditos liberados aos contemplados
-- Domínio: Assembleias | Camada: core | Dono: Diego Sampaio (Operações de Assembleias)
-- Rotina: core_assembleias | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.fato_liberacao_credito (
    id_liberacao               bigint        not null,
    id_contemplacao            bigint        not null,
    nr_contrato                bigint        not null,
    tipo_bem_adquirido         varchar(30)   not null,
    vl_credito_liberado        decimal(14,2) not null,
    vl_lance_embutido_abatido  decimal(14,2) not null,
    situacao                   varchar(20)   not null,
    dt_solicitacao             date          not null,
    dt_liberacao               date,
    dias_ate_liberacao         smallint,
    constraint pk_fato_liberacao_credito primary key (id_liberacao),
    constraint fk_fato_liberacao_credito_id_contemplacao foreign key (id_contemplacao) references core.fato_contemplacao (id_contemplacao),
    constraint fk_fato_liberacao_credito_nr_contrato foreign key (nr_contrato) references staging.stg_erp_contratos (nr_contrato)
);

comment on table core.fato_liberacao_credito is 'Créditos liberados aos contemplados';
comment on column core.fato_liberacao_credito.id_liberacao is 'Chave da liberação';
comment on column core.fato_liberacao_credito.id_contemplacao is 'Contemplação';
comment on column core.fato_liberacao_credito.nr_contrato is 'Contrato de adesão';
comment on column core.fato_liberacao_credito.tipo_bem_adquirido is 'Bem ou serviço adquirido com o crédito';
comment on column core.fato_liberacao_credito.vl_credito_liberado is 'Crédito liberado';
comment on column core.fato_liberacao_credito.vl_lance_embutido_abatido is 'Lance embutido abatido do crédito';
comment on column core.fato_liberacao_credito.situacao is 'Em análise, liberado ou pendente de documentação';
comment on column core.fato_liberacao_credito.dt_solicitacao is 'Data da solicitação';
comment on column core.fato_liberacao_credito.dt_liberacao is 'Data da liberação';
comment on column core.fato_liberacao_credito.dias_ate_liberacao is 'Dias entre contemplação e liberação';
