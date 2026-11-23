-- core.dim_fila_atendimento
-- Filas e skills de atendimento
-- Domínio: Atendimento | Camada: core | Dono: Juliana Prado (Experiência do Cliente)
-- Rotina: core_atendimento | Frequência: semanal | SLA: 168h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.dim_fila_atendimento (
    id_fila              smallint    not null,
    nm_fila              varchar(40) not null,
    canal                varchar(20) not null,
    skill                varchar(40) not null,
    sla_atendimento_seg  integer     not null,
    fl_ativa             char(1)     not null,
    constraint pk_dim_fila_atendimento primary key (id_fila)
);

comment on table core.dim_fila_atendimento is 'Filas e skills de atendimento';
comment on column core.dim_fila_atendimento.id_fila is 'Chave da fila';
comment on column core.dim_fila_atendimento.nm_fila is 'Nome da fila';
comment on column core.dim_fila_atendimento.canal is 'Canal atendido pela fila';
comment on column core.dim_fila_atendimento.skill is 'Habilidade exigida';
comment on column core.dim_fila_atendimento.sla_atendimento_seg is 'Meta de tempo de espera em segundos';
comment on column core.dim_fila_atendimento.fl_ativa is 'Fila ativa (S/N)';
