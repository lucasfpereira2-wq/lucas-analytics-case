-- core.dim_bem_referencia
-- Bens de referência e valores de crédito
-- Domínio: Produto | Camada: core | Dono: Rafael Nogueira (Produtos)
-- Rotina: core_produto | Frequência: semanal | SLA: 168h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.dim_bem_referencia (
    id_bem           integer       not null,
    cd_bem           varchar(12)   not null,
    descricao_bem    varchar(120)  not null,
    segmento         varchar(20)   not null,
    vl_credito       decimal(14,2) not null,
    indice_reajuste  varchar(10)   not null,
    fl_ativo         char(1)       not null,
    dt_atualizacao   timestamp     not null,
    constraint pk_dim_bem_referencia primary key (id_bem)
);

comment on table core.dim_bem_referencia is 'Bens de referência e valores de crédito';
comment on column core.dim_bem_referencia.id_bem is 'Chave do bem de referência';
comment on column core.dim_bem_referencia.cd_bem is 'Código do bem no ERP';
comment on column core.dim_bem_referencia.descricao_bem is 'Descrição do bem ou serviço';
comment on column core.dim_bem_referencia.segmento is 'Segmento do bem';
comment on column core.dim_bem_referencia.vl_credito is 'Valor atual do crédito de referência';
comment on column core.dim_bem_referencia.indice_reajuste is 'Índice de reajuste aplicado (INCC, IPCA, FIPE)';
comment on column core.dim_bem_referencia.fl_ativo is 'Bem em comercialização (S/N)';
comment on column core.dim_bem_referencia.dt_atualizacao is 'Última atualização';
