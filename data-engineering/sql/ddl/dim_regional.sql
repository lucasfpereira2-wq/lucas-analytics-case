-- core.dim_regional
-- Regionais comerciais e suas UFs
-- Domínio: Corporativo | Camada: core | Dono: Thiago Meireles (Engenharia de Dados)
-- Rotina: core_corporativo | Frequência: semanal | SLA: 168h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.dim_regional (
    id_regional     smallint     not null,
    nm_regional     varchar(30)  not null,
    ufs             varchar(80)  not null,
    nm_gestor       varchar(120) not null,
    fl_ativa        char(1)      not null,
    dt_atualizacao  timestamp    not null,
    constraint pk_dim_regional primary key (id_regional)
);

comment on table core.dim_regional is 'Regionais comerciais e suas UFs';
comment on column core.dim_regional.id_regional is 'Chave da regional';
comment on column core.dim_regional.nm_regional is 'Nome da regional';
comment on column core.dim_regional.ufs is 'UFs atendidas pela regional';
comment on column core.dim_regional.nm_gestor is '[PII/LGPD] Gestor regional';
comment on column core.dim_regional.fl_ativa is 'Regional ativa (S/N)';
comment on column core.dim_regional.dt_atualizacao is 'Última atualização';
