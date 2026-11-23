-- core.fato_atualizacao_cadastral
-- Histórico de alterações cadastrais
-- Domínio: Cadastro | Camada: core | Dono: Marina Azevedo (Cadastro & CRM)
-- Rotina: core_cadastro | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.fato_atualizacao_cadastral (
    id_atualizacao       bigint       not null,
    id_cliente           bigint       not null,
    campo_alterado       varchar(40)  not null,
    valor_anterior       varchar(200),
    valor_novo           varchar(200),
    origem               varchar(30)  not null,
    usuario_responsavel  varchar(40)  not null,
    dt_alteracao         timestamp    not null,
    constraint pk_fato_atualizacao_cadastral primary key (id_atualizacao),
    constraint fk_fato_atualizacao_cadastral_id_cliente foreign key (id_cliente) references staging.stg_crm_clientes (id_cliente_crm)
);

comment on table core.fato_atualizacao_cadastral is 'Histórico de alterações cadastrais';
comment on column core.fato_atualizacao_cadastral.id_atualizacao is 'Chave da alteração cadastral';
comment on column core.fato_atualizacao_cadastral.id_cliente is 'Cliente (identificador do CRM)';
comment on column core.fato_atualizacao_cadastral.campo_alterado is 'Campo que sofreu alteração';
comment on column core.fato_atualizacao_cadastral.valor_anterior is '[PII/LGPD] Valor antes da alteração';
comment on column core.fato_atualizacao_cadastral.valor_novo is '[PII/LGPD] Valor depois da alteração';
comment on column core.fato_atualizacao_cadastral.origem is 'Canal que originou a alteração';
comment on column core.fato_atualizacao_cadastral.usuario_responsavel is 'Usuário ou sistema responsável';
comment on column core.fato_atualizacao_cadastral.dt_alteracao is 'Data e hora da alteração';
