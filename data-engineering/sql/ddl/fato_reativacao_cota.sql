-- core.fato_reativacao_cota
-- Reativações de cotas canceladas
-- Domínio: Grupos e Cotas | Camada: core | Dono: Camila Furtado (Operações de Grupos)
-- Rotina: core_grupos_cotas | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.fato_reativacao_cota (
    id_reativacao              bigint        not null,
    id_cota                    bigint        not null,
    canal_solicitacao          varchar(30)   not null,
    vl_regularizado            decimal(14,2) not null,
    qt_parcelas_regularizadas  smallint      not null,
    usuario_responsavel        varchar(40)   not null,
    dt_reativacao              date          not null,
    constraint pk_fato_reativacao_cota primary key (id_reativacao),
    constraint fk_fato_reativacao_cota_id_cota foreign key (id_cota) references core.dim_cota (id_cota)
);

comment on table core.fato_reativacao_cota is 'Reativações de cotas canceladas';
comment on column core.fato_reativacao_cota.id_reativacao is 'Chave da reativação';
comment on column core.fato_reativacao_cota.id_cota is 'Cota reativada';
comment on column core.fato_reativacao_cota.canal_solicitacao is 'Canal em que a reativação foi solicitada';
comment on column core.fato_reativacao_cota.vl_regularizado is 'Valor regularizado na reativação';
comment on column core.fato_reativacao_cota.qt_parcelas_regularizadas is 'Parcelas regularizadas';
comment on column core.fato_reativacao_cota.usuario_responsavel is 'Usuário que efetivou a reativação';
comment on column core.fato_reativacao_cota.dt_reativacao is 'Data da reativação';
