-- core.dim_canal_venda
-- Canais de venda (Loja, Representante, Digital, Parceiro)
-- Domínio: Vendas | Camada: core | Dono: Bruno Tavares (Inteligência Comercial)
-- Rotina: core_vendas | Frequência: semanal | SLA: 168h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.dim_canal_venda (
    id_canal_venda      smallint     not null,
    nm_canal            varchar(30)  not null,
    tipo_canal          varchar(20)  not null,
    fl_digital          char(1)      not null,
    pc_comissao_padrao  decimal(7,4) not null,
    fl_ativo            char(1)      not null,
    constraint pk_dim_canal_venda primary key (id_canal_venda)
);

comment on table core.dim_canal_venda is 'Canais de venda (Loja, Representante, Digital, Parceiro)';
comment on column core.dim_canal_venda.id_canal_venda is 'Chave do canal de venda';
comment on column core.dim_canal_venda.nm_canal is 'Loja, Representante, Digital ou Parceiro';
comment on column core.dim_canal_venda.tipo_canal is 'Próprio ou terceiro';
comment on column core.dim_canal_venda.fl_digital is 'Canal digital (S/N)';
comment on column core.dim_canal_venda.pc_comissao_padrao is 'Comissão padrão do canal';
comment on column core.dim_canal_venda.fl_ativo is 'Canal ativo (S/N)';
