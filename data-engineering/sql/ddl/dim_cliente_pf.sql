-- core.dim_cliente_pf
-- Atributos específicos de pessoa física
-- Domínio: Cadastro | Camada: core | Dono: Marina Azevedo (Cadastro & CRM)
-- Rotina: core_cadastro | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.dim_cliente_pf (
    id_cliente     bigint       not null,
    cpf            varchar(14)  not null,
    nome_mae       varchar(120),
    dt_nascimento  date         not null,
    sexo           char(1),
    estado_civil   varchar(20),
    profissao      varchar(60),
    faixa_renda    varchar(20),
    constraint pk_dim_cliente_pf primary key (id_cliente),
    constraint fk_dim_cliente_pf_id_cliente foreign key (id_cliente) references core.dim_cliente (id_cliente)
);

comment on table core.dim_cliente_pf is 'Atributos específicos de pessoa física';
comment on column core.dim_cliente_pf.id_cliente is 'Cliente pessoa física';
comment on column core.dim_cliente_pf.cpf is '[PII/LGPD] CPF';
comment on column core.dim_cliente_pf.nome_mae is '[PII/LGPD] Nome da mãe';
comment on column core.dim_cliente_pf.dt_nascimento is '[PII/LGPD] Data de nascimento';
comment on column core.dim_cliente_pf.sexo is '[PII/LGPD] Sexo declarado';
comment on column core.dim_cliente_pf.estado_civil is 'Estado civil';
comment on column core.dim_cliente_pf.profissao is 'Profissão declarada';
comment on column core.dim_cliente_pf.faixa_renda is 'Faixa de renda mensal declarada';
