-- core.dim_regua_cobranca
-- Régua de cobrança (etapas, canais e prazos)
-- Domínio: Financeiro e Cobrança | Camada: core | Dono: Patrícia Lemos (Crédito & Cobrança)
-- Rotina: core_cobranca | Frequência: semanal | SLA: 168h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.dim_regua_cobranca (
    id_etapa_regua      smallint     not null,
    nm_etapa            varchar(60)  not null,
    dias_atraso_inicio  smallint     not null,
    dias_atraso_fim     smallint     not null,
    canal_cobranca      varchar(40)  not null,
    acao_prevista       varchar(120) not null,
    fl_ativa            char(1)      not null,
    constraint pk_dim_regua_cobranca primary key (id_etapa_regua)
);

comment on table core.dim_regua_cobranca is 'Régua de cobrança (etapas, canais e prazos)';
comment on column core.dim_regua_cobranca.id_etapa_regua is 'Chave da etapa da régua';
comment on column core.dim_regua_cobranca.nm_etapa is 'Nome da etapa';
comment on column core.dim_regua_cobranca.dias_atraso_inicio is 'Dia de atraso em que a etapa começa';
comment on column core.dim_regua_cobranca.dias_atraso_fim is 'Dia de atraso em que a etapa termina';
comment on column core.dim_regua_cobranca.canal_cobranca is 'Canal de cobrança da etapa';
comment on column core.dim_regua_cobranca.acao_prevista is 'Ação prevista';
comment on column core.dim_regua_cobranca.fl_ativa is 'Etapa ativa (S/N)';
