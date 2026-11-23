-- core.dim_cota
-- Cotas de consórcio e sua situação atual
-- Domínio: Grupos e Cotas | Camada: core | Dono: Camila Furtado (Operações de Grupos)
-- Rotina: core_grupos_cotas | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.dim_cota (
    id_cota          bigint        not null,
    id_grupo         integer       not null,
    id_cliente       bigint        not null,
    id_plano         integer       not null,
    nr_cota          integer       not null,
    situacao_cota    varchar(20)   not null,
    vl_credito       decimal(14,2) not null,
    pc_pago          decimal(7,4)  not null,
    dt_adesao        date          not null,
    dt_contemplacao  date,
    dt_cancelamento  date,
    dt_atualizacao   timestamp     not null,
    constraint pk_dim_cota primary key (id_cota),
    constraint fk_dim_cota_id_grupo foreign key (id_grupo) references core.dim_grupo (id_grupo),
    constraint fk_dim_cota_id_cliente foreign key (id_cliente) references core.dim_cliente (id_cliente),
    constraint fk_dim_cota_id_plano foreign key (id_plano) references core.dim_plano (id_plano)
);

comment on table core.dim_cota is 'Cotas de consórcio e sua situação atual';
comment on column core.dim_cota.id_cota is 'Chave da cota';
comment on column core.dim_cota.id_grupo is 'Grupo da cota';
comment on column core.dim_cota.id_cliente is 'Titular atual da cota';
comment on column core.dim_cota.id_plano is 'Plano da cota';
comment on column core.dim_cota.nr_cota is 'Número da cota dentro do grupo';
comment on column core.dim_cota.situacao_cota is 'Ativa, contemplada, cancelada ou quitada';
comment on column core.dim_cota.vl_credito is 'Valor atual do crédito';
comment on column core.dim_cota.pc_pago is 'Percentual do plano já pago';
comment on column core.dim_cota.dt_adesao is 'Data de adesão';
comment on column core.dim_cota.dt_contemplacao is 'Data de contemplação';
comment on column core.dim_cota.dt_cancelamento is 'Data de cancelamento';
comment on column core.dim_cota.dt_atualizacao is 'Última atualização';
