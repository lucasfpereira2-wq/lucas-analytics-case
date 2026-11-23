-- core.dim_assessoria_cobranca
-- Assessorias externas de cobrança
-- Domínio: Financeiro e Cobrança | Camada: core | Dono: Patrícia Lemos (Crédito & Cobrança)
-- Rotina: core_cobranca | Frequência: semanal | SLA: 168h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.dim_assessoria_cobranca (
    id_assessoria         integer      not null,
    cnpj_assessoria       varchar(18)  not null,
    razao_social          varchar(120) not null,
    uf                    char(2)      not null,
    faixa_atraso_atuacao  varchar(10)  not null,
    pc_honorario          decimal(7,4) not null,
    fl_ativa              char(1)      not null,
    dt_contrato           date         not null,
    constraint pk_dim_assessoria_cobranca primary key (id_assessoria)
);

comment on table core.dim_assessoria_cobranca is 'Assessorias externas de cobrança';
comment on column core.dim_assessoria_cobranca.id_assessoria is 'Chave da assessoria';
comment on column core.dim_assessoria_cobranca.cnpj_assessoria is 'CNPJ';
comment on column core.dim_assessoria_cobranca.razao_social is 'Razão social';
comment on column core.dim_assessoria_cobranca.uf is 'UF da sede';
comment on column core.dim_assessoria_cobranca.faixa_atraso_atuacao is 'Faixa de atraso em que atua';
comment on column core.dim_assessoria_cobranca.pc_honorario is 'Honorário sobre o valor recuperado';
comment on column core.dim_assessoria_cobranca.fl_ativa is 'Contrato ativo (S/N)';
comment on column core.dim_assessoria_cobranca.dt_contrato is 'Início do contrato';
