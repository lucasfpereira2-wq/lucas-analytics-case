-- core.dim_segmento
-- Segmentos de consórcio (Imóvel, Auto, Pesada, Serviços)
-- Domínio: Produto | Camada: core | Dono: Rafael Nogueira (Produtos)
-- Rotina: core_produto | Frequência: semanal | SLA: 168h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.dim_segmento (
    id_segmento         smallint     not null,
    nm_segmento         varchar(20)  not null,
    descricao           varchar(160) not null,
    prazo_maximo_meses  smallint     not null,
    fl_ativo            char(1)      not null,
    dt_atualizacao      timestamp    not null,
    constraint pk_dim_segmento primary key (id_segmento)
);

comment on table core.dim_segmento is 'Segmentos de consórcio (Imóvel, Auto, Pesada, Serviços)';
comment on column core.dim_segmento.id_segmento is 'Chave do segmento';
comment on column core.dim_segmento.nm_segmento is 'Imóvel, Auto, Pesada ou Serviços';
comment on column core.dim_segmento.descricao is 'Descrição do segmento';
comment on column core.dim_segmento.prazo_maximo_meses is 'Prazo máximo dos planos do segmento';
comment on column core.dim_segmento.fl_ativo is 'Segmento comercializado (S/N)';
comment on column core.dim_segmento.dt_atualizacao is 'Última atualização';
