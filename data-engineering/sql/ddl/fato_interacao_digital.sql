-- core.fato_interacao_digital
-- Interações por chat, e-mail e aplicativo
-- Domínio: Atendimento | Camada: core | Dono: Juliana Prado (Experiência do Cliente)
-- Rotina: core_atendimento_digital | Frequência: horária | SLA: 3h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.fato_interacao_digital (
    id_interacao        bigint      not null,
    id_ticket_helpdesk  bigint      not null,
    canal               varchar(20) not null,
    direcao             varchar(10) not null,
    autor_tipo          varchar(10) not null,
    fl_automatica       char(1)     not null,
    tempo_resposta_seg  integer,
    dt_interacao        timestamp   not null,
    constraint pk_fato_interacao_digital primary key (id_interacao),
    constraint fk_fato_interacao_digital_id_ticket_helpdesk foreign key (id_ticket_helpdesk) references staging.stg_helpdesk_tickets (id_ticket_helpdesk)
);

comment on table core.fato_interacao_digital is 'Interações por chat, e-mail e aplicativo';
comment on column core.fato_interacao_digital.id_interacao is 'Chave da interação';
comment on column core.fato_interacao_digital.id_ticket_helpdesk is 'Ticket a que a interação pertence';
comment on column core.fato_interacao_digital.canal is 'Chat, e-mail ou aplicativo';
comment on column core.fato_interacao_digital.direcao is 'Entrada ou saída';
comment on column core.fato_interacao_digital.autor_tipo is 'Cliente, agente ou bot';
comment on column core.fato_interacao_digital.fl_automatica is 'Resposta automática (S/N)';
comment on column core.fato_interacao_digital.tempo_resposta_seg is 'Tempo de resposta em segundos';
comment on column core.fato_interacao_digital.dt_interacao is 'Data e hora da interação';
