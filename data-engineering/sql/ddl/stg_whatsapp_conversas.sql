-- staging.stg_whatsapp_conversas
-- Conversas recebidas via webhook da WhatsApp Business API
-- Domínio: Staging | Camada: staging | Dono: SEM DONO DEFINIDO
-- Rotina: ingest_whatsapp | Frequência: horária | SLA: 3h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists staging.stg_whatsapp_conversas (
    id_conversa        varchar(40) not null,
    nr_telefone        varchar(20) not null,
    nm_contato         varchar(80),
    dt_inicio          timestamp   not null,
    dt_fim             timestamp,
    qt_mensagens       integer     not null,
    cd_agente          varchar(12),
    status_conversa    varchar(20) not null,
    id_webhook_evento  varchar(40) not null,
    payload_hash       char(32)    not null,
    _dt_carga          timestamp   not null
);

-- ATENÇÃO: tabela sem chave primária definida (achado de governança; ver Farol de Dados).

comment on table staging.stg_whatsapp_conversas is 'Conversas recebidas via webhook da WhatsApp Business API';
comment on column staging.stg_whatsapp_conversas.id_conversa is 'Identificador da conversa enviado pelo webhook (candidata a chave; não há PK definida)';
comment on column staging.stg_whatsapp_conversas.nr_telefone is '[PII/LGPD] Telefone do cliente';
comment on column staging.stg_whatsapp_conversas.nm_contato is '[PII/LGPD] Nome do perfil no WhatsApp';
comment on column staging.stg_whatsapp_conversas.dt_inicio is 'Início da conversa';
comment on column staging.stg_whatsapp_conversas.dt_fim is 'Encerramento da conversa';
comment on column staging.stg_whatsapp_conversas.qt_mensagens is 'Mensagens trocadas';
comment on column staging.stg_whatsapp_conversas.cd_agente is 'Agente que assumiu a conversa';
comment on column staging.stg_whatsapp_conversas.status_conversa is 'Situação da conversa';
comment on column staging.stg_whatsapp_conversas.id_webhook_evento is 'Identificador do evento de webhook recebido';
comment on column staging.stg_whatsapp_conversas.payload_hash is 'Hash do payload recebido';
comment on column staging.stg_whatsapp_conversas._dt_carga is 'Data e hora da ingestão';
