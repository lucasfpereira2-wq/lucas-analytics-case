-- core.dim_colaborador
-- Colaboradores ativos e desligados (origem RH)
-- Domínio: Corporativo | Camada: core | Dono: Thiago Meireles (Engenharia de Dados)
-- Rotina: core_corporativo_rh | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.dim_colaborador (
    id_colaborador     integer      not null,
    matricula          varchar(10)  not null,
    nm_colaborador     varchar(120) not null,
    cpf_colaborador    varchar(14)  not null,
    email_corporativo  varchar(120) not null,
    cargo              varchar(60)  not null,
    cd_centro_custo    varchar(10),
    nm_area            varchar(60)  not null,
    situacao           varchar(20)  not null,
    dt_admissao        date         not null,
    dt_desligamento    date,
    constraint pk_dim_colaborador primary key (id_colaborador)
);

comment on table core.dim_colaborador is 'Colaboradores ativos e desligados (origem RH)';
comment on column core.dim_colaborador.id_colaborador is 'Chave do colaborador';
comment on column core.dim_colaborador.matricula is 'Matrícula no RH';
comment on column core.dim_colaborador.nm_colaborador is '[PII/LGPD] Nome do colaborador';
comment on column core.dim_colaborador.cpf_colaborador is '[PII/LGPD] CPF';
comment on column core.dim_colaborador.email_corporativo is '[PII/LGPD] E-mail corporativo';
comment on column core.dim_colaborador.cargo is 'Cargo';
comment on column core.dim_colaborador.cd_centro_custo is 'Centro de custo (origem passou a enviar `centro_custo_id` em 12/11)';
comment on column core.dim_colaborador.nm_area is 'Área de lotação';
comment on column core.dim_colaborador.situacao is 'Ativo, afastado ou desligado';
comment on column core.dim_colaborador.dt_admissao is 'Data de admissão';
comment on column core.dim_colaborador.dt_desligamento is 'Data de desligamento';
