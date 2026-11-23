-- staging.stg_pesquisas_respostas
-- Respostas brutas das pesquisas NPS e CSAT
-- Domínio: Staging | Camada: staging | Dono: Thiago Meireles (Engenharia de Dados)
-- Rotina: ingest_pesquisas | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists staging.stg_pesquisas_respostas (
    id_entrega          varchar(40)  not null,
    id_resposta         varchar(40)  not null,
    tipo_pesquisa       varchar(10)  not null,
    cpf_respondente     varchar(14),
    nota                smallint     not null,
    comentario          varchar(500),
    canal               varchar(20)  not null,
    id_ticket_helpdesk  bigint,
    dt_resposta         timestamp    not null,
    _dt_carga           timestamp    not null,
    constraint pk_stg_pesquisas_respostas primary key (id_entrega)
);

comment on table staging.stg_pesquisas_respostas is 'Respostas brutas das pesquisas NPS e CSAT';
comment on column staging.stg_pesquisas_respostas.id_entrega is 'Identificador da entrega (evento) feita pela plataforma de pesquisas';
comment on column staging.stg_pesquisas_respostas.id_resposta is 'Identificador da resposta; deveria ser único, mas a plataforma reenvia respostas';
comment on column staging.stg_pesquisas_respostas.tipo_pesquisa is 'NPS ou CSAT';
comment on column staging.stg_pesquisas_respostas.cpf_respondente is '[PII/LGPD] CPF do respondente';
comment on column staging.stg_pesquisas_respostas.nota is 'Nota atribuída';
comment on column staging.stg_pesquisas_respostas.comentario is '[PII/LGPD] Comentário livre do cliente';
comment on column staging.stg_pesquisas_respostas.canal is 'Canal em que a pesquisa foi respondida';
comment on column staging.stg_pesquisas_respostas.id_ticket_helpdesk is 'Ticket avaliado (CSAT)';
comment on column staging.stg_pesquisas_respostas.dt_resposta is 'Data e hora da resposta';
comment on column staging.stg_pesquisas_respostas._dt_carga is 'Data e hora da ingestão';
