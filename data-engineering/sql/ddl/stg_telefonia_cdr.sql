-- staging.stg_telefonia_cdr
-- Registros de chamadas (CDR) da plataforma de telefonia
-- Domínio: Staging | Camada: staging | Dono: Thiago Meireles (Engenharia de Dados)
-- Rotina: ingest_telefonia | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists staging.stg_telefonia_cdr (
    id_chamada_cdr     varchar(36) not null,
    nr_origem          varchar(20) not null,
    nr_destino         varchar(20) not null,
    ramal_agente       varchar(8),
    cd_fila            varchar(12) not null,
    dt_inicio          timestamp   not null,
    dt_atendimento     timestamp,
    dt_fim             timestamp   not null,
    duracao_seg        integer     not null,
    tempo_espera_seg   integer     not null,
    status_chamada     varchar(20) not null,
    nm_arquivo_origem  varchar(60) not null,
    _dt_carga          timestamp   not null,
    constraint pk_stg_telefonia_cdr primary key (id_chamada_cdr)
);

comment on table staging.stg_telefonia_cdr is 'Registros de chamadas (CDR) da plataforma de telefonia';
comment on column staging.stg_telefonia_cdr.id_chamada_cdr is 'Identificador único da chamada na plataforma de telefonia';
comment on column staging.stg_telefonia_cdr.nr_origem is '[PII/LGPD] Número de origem da chamada';
comment on column staging.stg_telefonia_cdr.nr_destino is 'Número de destino (0800 ou DDR)';
comment on column staging.stg_telefonia_cdr.ramal_agente is 'Ramal do agente que atendeu';
comment on column staging.stg_telefonia_cdr.cd_fila is 'Fila de atendimento';
comment on column staging.stg_telefonia_cdr.dt_inicio is 'Início da chamada';
comment on column staging.stg_telefonia_cdr.dt_atendimento is 'Momento do atendimento humano';
comment on column staging.stg_telefonia_cdr.dt_fim is 'Fim da chamada';
comment on column staging.stg_telefonia_cdr.duracao_seg is 'Duração total em segundos';
comment on column staging.stg_telefonia_cdr.tempo_espera_seg is 'Tempo em fila em segundos';
comment on column staging.stg_telefonia_cdr.status_chamada is 'Atendida, abandonada ou retida na URA';
comment on column staging.stg_telefonia_cdr.nm_arquivo_origem is 'Arquivo CDR de origem no SFTP';
comment on column staging.stg_telefonia_cdr._dt_carga is 'Data e hora da ingestão';
