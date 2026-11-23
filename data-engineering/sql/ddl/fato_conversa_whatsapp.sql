-- core.fato_conversa_whatsapp
-- Conversas de WhatsApp consolidadas
-- Domínio: Atendimento | Camada: core | Dono: Juliana Prado (Experiência do Cliente)
-- Rotina: core_atendimento_digital | Frequência: horária | SLA: 3h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.fato_conversa_whatsapp (
    id_conversa                  varchar(40) not null,
    id_agente                    integer,
    id_motivo                    integer,
    dt_inicio                    timestamp   not null,
    dt_fim                       timestamp,
    qt_mensagens                 integer     not null,
    tempo_primeira_resposta_seg  integer,
    duracao_seg                  integer,
    fl_resolvida_bot             char(1)     not null,
    fl_resolvida                 char(1)     not null,
    constraint pk_fato_conversa_whatsapp primary key (id_conversa),
    constraint fk_fato_conversa_whatsapp_id_agente foreign key (id_agente) references core.dim_agente (id_agente),
    constraint fk_fato_conversa_whatsapp_id_motivo foreign key (id_motivo) references core.dim_motivo_contato (id_motivo)
);

comment on table core.fato_conversa_whatsapp is 'Conversas de WhatsApp consolidadas';
comment on column core.fato_conversa_whatsapp.id_conversa is 'Chave da conversa (após deduplicação heurística)';
comment on column core.fato_conversa_whatsapp.id_agente is 'Agente que assumiu a conversa';
comment on column core.fato_conversa_whatsapp.id_motivo is 'Motivo do contato';
comment on column core.fato_conversa_whatsapp.dt_inicio is 'Início da conversa';
comment on column core.fato_conversa_whatsapp.dt_fim is 'Encerramento';
comment on column core.fato_conversa_whatsapp.qt_mensagens is 'Mensagens trocadas';
comment on column core.fato_conversa_whatsapp.tempo_primeira_resposta_seg is 'Tempo até a primeira resposta';
comment on column core.fato_conversa_whatsapp.duracao_seg is 'Duração da conversa';
comment on column core.fato_conversa_whatsapp.fl_resolvida_bot is 'Resolvida pelo assistente virtual (S/N)';
comment on column core.fato_conversa_whatsapp.fl_resolvida is 'Resolvida no contato (S/N)';
