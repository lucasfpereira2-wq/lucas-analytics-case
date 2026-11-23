-- marts.mart_atendimento
-- Mart do relatório de Atendimento (volumes, tempos, NPS, CSAT)
-- Domínio: Marts | Camada: mart | Dono: Fernanda Rocha (Analytics & BI)
-- Rotina: mart_atendimento | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists marts.mart_atendimento (
    dt_referencia                   date        not null,
    canal                           varchar(20) not null,
    id_motivo                       integer     not null,
    qt_contatos                     integer     not null,
    qt_atendidos                    integer     not null,
    qt_abandonados                  integer     not null,
    tempo_atendimento_seg           bigint      not null,
    tempo_espera_seg                bigint      not null,
    qt_resolvidos_primeiro_contato  integer     not null,
    qt_promotores                   integer     not null,
    qt_detratores                   integer     not null,
    qt_respostas_nps                integer     not null,
    dt_carga                        timestamp   not null,
    constraint pk_mart_atendimento primary key (dt_referencia, canal, id_motivo),
    constraint fk_mart_atendimento_id_motivo foreign key (id_motivo) references core.dim_motivo_contato (id_motivo)
);

comment on table marts.mart_atendimento is 'Mart do relatório de Atendimento (volumes, tempos, NPS, CSAT)';
comment on column marts.mart_atendimento.dt_referencia is 'Data de referência';
comment on column marts.mart_atendimento.canal is 'Canal de atendimento';
comment on column marts.mart_atendimento.id_motivo is 'Motivo do contato';
comment on column marts.mart_atendimento.qt_contatos is 'Contatos recebidos';
comment on column marts.mart_atendimento.qt_atendidos is 'Contatos atendidos';
comment on column marts.mart_atendimento.qt_abandonados is 'Contatos abandonados';
comment on column marts.mart_atendimento.tempo_atendimento_seg is 'Soma do tempo de atendimento (numerador do TMA)';
comment on column marts.mart_atendimento.tempo_espera_seg is 'Soma do tempo de espera (numerador do TME)';
comment on column marts.mart_atendimento.qt_resolvidos_primeiro_contato is 'Resolvidos no primeiro contato (FCR)';
comment on column marts.mart_atendimento.qt_promotores is 'Respostas NPS 9 ou 10';
comment on column marts.mart_atendimento.qt_detratores is 'Respostas NPS de 0 a 6';
comment on column marts.mart_atendimento.qt_respostas_nps is 'Total de respostas NPS';
comment on column marts.mart_atendimento.dt_carga is 'Data e hora da carga';
