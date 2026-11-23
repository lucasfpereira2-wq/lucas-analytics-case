-- core.fato_cota_movimentacao
-- Movimentações de situação das cotas
-- Domínio: Grupos e Cotas | Camada: core | Dono: Camila Furtado (Operações de Grupos)
-- Rotina: core_grupos_cotas | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.fato_cota_movimentacao (
    id_movimentacao    bigint      not null,
    id_cota            bigint      not null,
    situacao_anterior  varchar(20) not null,
    situacao_nova      varchar(20) not null,
    motivo             varchar(60),
    usuario_origem     varchar(40) not null,
    dt_movimentacao    timestamp   not null,
    constraint pk_fato_cota_movimentacao primary key (id_movimentacao),
    constraint fk_fato_cota_movimentacao_id_cota foreign key (id_cota) references core.dim_cota (id_cota)
);

comment on table core.fato_cota_movimentacao is 'Movimentações de situação das cotas';
comment on column core.fato_cota_movimentacao.id_movimentacao is 'Chave da movimentação';
comment on column core.fato_cota_movimentacao.id_cota is 'Cota movimentada';
comment on column core.fato_cota_movimentacao.situacao_anterior is 'Situação antes da movimentação';
comment on column core.fato_cota_movimentacao.situacao_nova is 'Situação após a movimentação';
comment on column core.fato_cota_movimentacao.motivo is 'Motivo informado';
comment on column core.fato_cota_movimentacao.usuario_origem is 'Usuário ou rotina que originou a movimentação';
comment on column core.fato_cota_movimentacao.dt_movimentacao is 'Data e hora da movimentação';
