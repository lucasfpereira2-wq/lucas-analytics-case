-- core.fato_pesquisa_nps
-- Respostas de NPS por cliente e canal
-- Domínio: Atendimento | Camada: core | Dono: Juliana Prado (Experiência do Cliente)
-- Rotina: core_pesquisas | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.fato_pesquisa_nps (
    id_resposta    varchar(40)  not null,
    id_cliente     bigint,
    nota           smallint     not null,
    classificacao  varchar(10)  not null,
    canal          varchar(20)  not null,
    comentario     varchar(500),
    competencia    char(7)      not null,
    dt_resposta    timestamp    not null,
    dt_carga       timestamp    not null,
    constraint pk_fato_pesquisa_nps primary key (id_resposta)
);

comment on table core.fato_pesquisa_nps is 'Respostas de NPS por cliente e canal';
comment on column core.fato_pesquisa_nps.id_resposta is 'Chave da resposta (declarada; a carga não deduplica)';
comment on column core.fato_pesquisa_nps.id_cliente is 'Cliente respondente';
comment on column core.fato_pesquisa_nps.nota is 'Nota de 0 a 10';
comment on column core.fato_pesquisa_nps.classificacao is 'Promotor, neutro ou detrator';
comment on column core.fato_pesquisa_nps.canal is 'Canal em que a pesquisa foi respondida';
comment on column core.fato_pesquisa_nps.comentario is '[PII/LGPD] Comentário livre';
comment on column core.fato_pesquisa_nps.competencia is 'Mês de competência (AAAA-MM)';
comment on column core.fato_pesquisa_nps.dt_resposta is 'Data e hora da resposta';
comment on column core.fato_pesquisa_nps.dt_carga is 'Data e hora da carga';
