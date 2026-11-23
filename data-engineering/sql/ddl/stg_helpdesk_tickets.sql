-- staging.stg_helpdesk_tickets
-- Tickets e interações digitais (chat, e-mail, app) do helpdesk
-- Domínio: Staging | Camada: staging | Dono: Thiago Meireles (Engenharia de Dados)
-- Rotina: ingest_helpdesk | Frequência: horária | SLA: 3h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists staging.stg_helpdesk_tickets (
    id_ticket_helpdesk    bigint       not null,
    canal                 varchar(20)  not null,
    email_solicitante     varchar(120),
    cpf_solicitante       varchar(14),
    assunto               varchar(160) not null,
    cd_motivo             varchar(12),
    status                varchar(20)  not null,
    prioridade            varchar(10)  not null,
    cd_agente             varchar(12),
    dt_abertura           timestamp    not null,
    dt_primeira_resposta  timestamp,
    dt_resolucao          timestamp,
    _dt_carga             timestamp    not null,
    constraint pk_stg_helpdesk_tickets primary key (id_ticket_helpdesk)
);

comment on table staging.stg_helpdesk_tickets is 'Tickets e interações digitais (chat, e-mail, app) do helpdesk';
comment on column staging.stg_helpdesk_tickets.id_ticket_helpdesk is 'Identificador do ticket no helpdesk';
comment on column staging.stg_helpdesk_tickets.canal is 'Chat, e-mail ou aplicativo';
comment on column staging.stg_helpdesk_tickets.email_solicitante is '[PII/LGPD] E-mail de quem abriu o ticket';
comment on column staging.stg_helpdesk_tickets.cpf_solicitante is '[PII/LGPD] CPF informado na abertura';
comment on column staging.stg_helpdesk_tickets.assunto is 'Assunto do ticket';
comment on column staging.stg_helpdesk_tickets.cd_motivo is 'Motivo classificado pelo agente';
comment on column staging.stg_helpdesk_tickets.status is 'Situação do ticket';
comment on column staging.stg_helpdesk_tickets.prioridade is 'Prioridade atribuída';
comment on column staging.stg_helpdesk_tickets.cd_agente is 'Agente responsável';
comment on column staging.stg_helpdesk_tickets.dt_abertura is 'Abertura do ticket';
comment on column staging.stg_helpdesk_tickets.dt_primeira_resposta is 'Primeira resposta ao cliente';
comment on column staging.stg_helpdesk_tickets.dt_resolucao is 'Resolução do ticket';
comment on column staging.stg_helpdesk_tickets._dt_carga is 'Data e hora da ingestão';
