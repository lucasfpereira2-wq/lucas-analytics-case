-- core.fato_chamada
-- Chamadas de voz atendidas e abandonadas (URA e humano)
-- Domínio: Atendimento | Camada: core | Dono: Juliana Prado (Experiência do Cliente)
-- Rotina: core_atendimento | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.fato_chamada (
    id_chamada                     varchar(36) not null,
    id_agente                      integer,
    id_fila                        smallint    not null,
    id_motivo                      integer,
    tipo_atendimento               varchar(10) not null,
    dt_inicio                      timestamp   not null,
    duracao_seg                    integer     not null,
    tempo_espera_seg               integer     not null,
    fl_atendida                    char(1)     not null,
    fl_abandonada                  char(1)     not null,
    fl_resolvida_primeiro_contato  char(1)     not null,
    constraint pk_fato_chamada primary key (id_chamada),
    constraint fk_fato_chamada_id_agente foreign key (id_agente) references core.dim_agente (id_agente),
    constraint fk_fato_chamada_id_fila foreign key (id_fila) references core.dim_fila_atendimento (id_fila),
    constraint fk_fato_chamada_id_motivo foreign key (id_motivo) references core.dim_motivo_contato (id_motivo)
);

comment on table core.fato_chamada is 'Chamadas de voz atendidas e abandonadas (URA e humano)';
comment on column core.fato_chamada.id_chamada is 'Chave da chamada';
comment on column core.fato_chamada.id_agente is 'Agente que atendeu';
comment on column core.fato_chamada.id_fila is 'Fila de atendimento';
comment on column core.fato_chamada.id_motivo is 'Motivo do contato';
comment on column core.fato_chamada.tipo_atendimento is 'URA ou humano';
comment on column core.fato_chamada.dt_inicio is 'Início da chamada';
comment on column core.fato_chamada.duracao_seg is 'Tempo de atendimento em segundos';
comment on column core.fato_chamada.tempo_espera_seg is 'Tempo de espera em segundos';
comment on column core.fato_chamada.fl_atendida is 'Chamada atendida (S/N)';
comment on column core.fato_chamada.fl_abandonada is 'Chamada abandonada em fila (S/N)';
comment on column core.fato_chamada.fl_resolvida_primeiro_contato is 'Resolvida no primeiro contato (S/N)';
