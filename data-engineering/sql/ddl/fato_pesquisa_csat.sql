-- core.fato_pesquisa_csat
-- Respostas de CSAT pós-atendimento
-- Domínio: Atendimento | Camada: core | Dono: Juliana Prado (Experiência do Cliente)
-- Rotina: core_pesquisas | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.fato_pesquisa_csat (
    id_resposta    varchar(40)  not null,
    id_ticket      bigint,
    nota           smallint     not null,
    canal          varchar(20)  not null,
    fl_satisfeito  char(1)      not null,
    comentario     varchar(500),
    dt_resposta    timestamp    not null,
    constraint pk_fato_pesquisa_csat primary key (id_resposta),
    constraint fk_fato_pesquisa_csat_id_ticket foreign key (id_ticket) references core.fato_ticket (id_ticket)
);

comment on table core.fato_pesquisa_csat is 'Respostas de CSAT pós-atendimento';
comment on column core.fato_pesquisa_csat.id_resposta is 'Chave da resposta';
comment on column core.fato_pesquisa_csat.id_ticket is 'Ticket avaliado';
comment on column core.fato_pesquisa_csat.nota is 'Nota de 1 a 5';
comment on column core.fato_pesquisa_csat.canal is 'Canal do atendimento avaliado';
comment on column core.fato_pesquisa_csat.fl_satisfeito is 'Nota 4 ou 5 (S/N)';
comment on column core.fato_pesquisa_csat.comentario is '[PII/LGPD] Comentário livre';
comment on column core.fato_pesquisa_csat.dt_resposta is 'Data e hora da resposta';
