-- core.dim_agente
-- Agentes de atendimento e suas filas
-- Domínio: Atendimento | Camada: core | Dono: Juliana Prado (Experiência do Cliente)
-- Rotina: core_atendimento | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.dim_agente (
    id_agente       integer      not null,
    id_colaborador  integer      not null,
    nm_agente       varchar(120) not null,
    fila_principal  varchar(40)  not null,
    turno           varchar(10)  not null,
    nivel           varchar(10)  not null,
    fl_ativo        char(1)      not null,
    dt_inicio       date         not null,
    constraint pk_dim_agente primary key (id_agente),
    constraint fk_dim_agente_id_colaborador foreign key (id_colaborador) references core.dim_colaborador (id_colaborador)
);

comment on table core.dim_agente is 'Agentes de atendimento e suas filas';
comment on column core.dim_agente.id_agente is 'Chave do agente';
comment on column core.dim_agente.id_colaborador is 'Colaborador';
comment on column core.dim_agente.nm_agente is '[PII/LGPD] Nome do agente';
comment on column core.dim_agente.fila_principal is 'Fila principal de atuação';
comment on column core.dim_agente.turno is 'Turno de trabalho';
comment on column core.dim_agente.nivel is 'Nível (N1, N2, retenção)';
comment on column core.dim_agente.fl_ativo is 'Agente ativo (S/N)';
comment on column core.dim_agente.dt_inicio is 'Início na operação';
