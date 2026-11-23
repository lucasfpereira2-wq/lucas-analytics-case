-- core.fato_chamadas_legacy
-- Histórico de chamadas do discador antigo (legado)
-- Domínio: Atendimento | Camada: core | Dono: SEM DONO DEFINIDO
-- Rotina: legacy_chamadas_dts | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.fato_chamadas_legacy (
    cod_cham  integer      not null,
    dt_cham   date         not null,
    hr_ini    char(8)      not null,
    hr_fim    char(8),
    ramal     varchar(8),
    fone_cli  varchar(20),
    cod_oper  varchar(8),
    tp_cham   char(1)      not null,
    st_cham   char(2)      not null,
    obs       varchar(255)
);

-- ATENÇÃO: tabela sem chave primária definida (achado de governança; ver Farol de Dados).

comment on table core.fato_chamadas_legacy is 'Histórico de chamadas do discador antigo (legado)';
comment on column core.fato_chamadas_legacy.cod_cham is 'Código da chamada no discador antigo (reinicia a cada ano; não é chave)';
comment on column core.fato_chamadas_legacy.dt_cham is 'Data da chamada';
comment on column core.fato_chamadas_legacy.hr_ini is 'Hora de início';
comment on column core.fato_chamadas_legacy.hr_fim is 'Hora de fim';
comment on column core.fato_chamadas_legacy.ramal is 'Ramal do operador';
comment on column core.fato_chamadas_legacy.fone_cli is '[PII/LGPD] Telefone do cliente';
comment on column core.fato_chamadas_legacy.cod_oper is 'Código do operador';
comment on column core.fato_chamadas_legacy.tp_cham is 'Tipo da chamada (R receptiva, A ativa)';
comment on column core.fato_chamadas_legacy.st_cham is 'Situação da chamada';
comment on column core.fato_chamadas_legacy.obs is 'Observações livres';
