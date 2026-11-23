-- core.fato_cancelamento_cota
-- Cancelamentos e exclusões de cotas
-- Domínio: Grupos e Cotas | Camada: core | Dono: Camila Furtado (Operações de Grupos)
-- Rotina: core_grupos_cotas | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.fato_cancelamento_cota (
    id_cancelamento      bigint        not null,
    id_cota              bigint        not null,
    tipo_cancelamento    varchar(20)   not null,
    motivo_cancelamento  varchar(60),
    qt_parcelas_pagas    smallint      not null,
    mob_cancelamento     smallint      not null,
    vl_pago_acumulado    decimal(14,2) not null,
    vl_a_devolver        decimal(14,2) not null,
    dt_cancelamento      date          not null,
    constraint pk_fato_cancelamento_cota primary key (id_cancelamento),
    constraint fk_fato_cancelamento_cota_id_cota foreign key (id_cota) references core.dim_cota (id_cota)
);

comment on table core.fato_cancelamento_cota is 'Cancelamentos e exclusões de cotas';
comment on column core.fato_cancelamento_cota.id_cancelamento is 'Chave do cancelamento';
comment on column core.fato_cancelamento_cota.id_cota is 'Cota cancelada';
comment on column core.fato_cancelamento_cota.tipo_cancelamento is 'Desistência, inadimplência ou arrependimento (7 dias)';
comment on column core.fato_cancelamento_cota.motivo_cancelamento is 'Motivo declarado';
comment on column core.fato_cancelamento_cota.qt_parcelas_pagas is 'Parcelas pagas até o cancelamento';
comment on column core.fato_cancelamento_cota.mob_cancelamento is 'Meses desde a adesão no cancelamento';
comment on column core.fato_cancelamento_cota.vl_pago_acumulado is 'Valor pago ao fundo comum';
comment on column core.fato_cancelamento_cota.vl_a_devolver is 'Valor a devolver ao excluído';
comment on column core.fato_cancelamento_cota.dt_cancelamento is 'Data do cancelamento';
