-- core.fato_ticket
-- Tickets de atendimento e seu ciclo de resolução
-- Domínio: Atendimento | Camada: core | Dono: Juliana Prado (Experiência do Cliente)
-- Rotina: core_atendimento_digital | Frequência: horária | SLA: 3h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.fato_ticket (
    id_ticket             bigint      not null,
    id_motivo             integer,
    id_agente             integer,
    canal                 varchar(20) not null,
    prioridade            varchar(10) not null,
    status                varchar(20) not null,
    dt_abertura           timestamp   not null,
    dt_primeira_resposta  timestamp,
    dt_resolucao          timestamp,
    fl_reaberto           char(1)     not null,
    fl_dentro_sla         char(1)     not null,
    constraint pk_fato_ticket primary key (id_ticket),
    constraint fk_fato_ticket_id_motivo foreign key (id_motivo) references core.dim_motivo_contato (id_motivo),
    constraint fk_fato_ticket_id_agente foreign key (id_agente) references core.dim_agente (id_agente)
);

comment on table core.fato_ticket is 'Tickets de atendimento e seu ciclo de resolução';
comment on column core.fato_ticket.id_ticket is 'Chave do ticket';
comment on column core.fato_ticket.id_motivo is 'Motivo do contato';
comment on column core.fato_ticket.id_agente is 'Agente responsável';
comment on column core.fato_ticket.canal is 'Chat, e-mail ou aplicativo';
comment on column core.fato_ticket.prioridade is 'Prioridade';
comment on column core.fato_ticket.status is 'Aberto, pendente, resolvido ou fechado';
comment on column core.fato_ticket.dt_abertura is 'Abertura';
comment on column core.fato_ticket.dt_primeira_resposta is 'Primeira resposta';
comment on column core.fato_ticket.dt_resolucao is 'Resolução';
comment on column core.fato_ticket.fl_reaberto is 'Ticket reaberto (S/N)';
comment on column core.fato_ticket.fl_dentro_sla is 'Resolvido dentro do SLA (S/N)';
