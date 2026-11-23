-- core.dim_grupo
-- Grupos de consórcio (prazo, participantes, situação)
-- Domínio: Grupos e Cotas | Camada: core | Dono: Camila Furtado (Operações de Grupos)
-- Rotina: core_grupos_cotas | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.dim_grupo (
    id_grupo                  integer     not null,
    cd_grupo                  varchar(8)  not null,
    id_plano                  integer     not null,
    segmento                  varchar(20) not null,
    prazo_meses               smallint    not null,
    qt_participantes_max      integer     not null,
    dia_vencimento            smallint    not null,
    dt_formacao               date        not null,
    dt_primeira_assembleia    date        not null,
    dt_encerramento_previsto  date        not null,
    situacao_grupo            varchar(20) not null,
    constraint pk_dim_grupo primary key (id_grupo),
    constraint fk_dim_grupo_id_plano foreign key (id_plano) references core.dim_plano (id_plano)
);

comment on table core.dim_grupo is 'Grupos de consórcio (prazo, participantes, situação)';
comment on column core.dim_grupo.id_grupo is 'Chave do grupo de consórcio';
comment on column core.dim_grupo.cd_grupo is 'Código do grupo no ERP';
comment on column core.dim_grupo.id_plano is 'Plano do grupo';
comment on column core.dim_grupo.segmento is 'Segmento do grupo';
comment on column core.dim_grupo.prazo_meses is 'Prazo do grupo em meses';
comment on column core.dim_grupo.qt_participantes_max is 'Número máximo de participantes';
comment on column core.dim_grupo.dia_vencimento is 'Dia de vencimento das parcelas';
comment on column core.dim_grupo.dt_formacao is 'Data de formação do grupo';
comment on column core.dim_grupo.dt_primeira_assembleia is 'Data da primeira assembleia';
comment on column core.dim_grupo.dt_encerramento_previsto is 'Encerramento previsto';
comment on column core.dim_grupo.situacao_grupo is 'Em formação, em andamento ou encerrado';
