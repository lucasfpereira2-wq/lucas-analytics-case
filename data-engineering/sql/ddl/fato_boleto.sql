-- core.fato_boleto
-- Boletos emitidos e seu ciclo de vida
-- Domínio: Financeiro e Cobrança | Camada: core | Dono: Patrícia Lemos (Crédito & Cobrança)
-- Rotina: core_financeiro_boletos | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.fato_boleto (
    id_boleto      bigint        not null,
    id_parcela     bigint        not null,
    nosso_numero   varchar(20)   not null,
    canal_envio    varchar(20)   not null,
    status_boleto  varchar(20)   not null,
    vl_boleto      decimal(12,2) not null,
    dt_emissao     date          not null,
    dt_vencimento  date          not null,
    dt_registro    timestamp,
    dt_liquidacao  date,
    constraint pk_fato_boleto primary key (id_boleto),
    constraint fk_fato_boleto_id_parcela foreign key (id_parcela) references core.fato_parcelas (id_parcela)
);

comment on table core.fato_boleto is 'Boletos emitidos e seu ciclo de vida';
comment on column core.fato_boleto.id_boleto is 'Chave do boleto';
comment on column core.fato_boleto.id_parcela is 'Parcela cobrada';
comment on column core.fato_boleto.nosso_numero is 'Identificação do título no banco';
comment on column core.fato_boleto.canal_envio is 'E-mail, aplicativo, WhatsApp ou correio';
comment on column core.fato_boleto.status_boleto is 'Emitido, registrado, liquidado, vencido ou baixado';
comment on column core.fato_boleto.vl_boleto is 'Valor do boleto';
comment on column core.fato_boleto.dt_emissao is 'Data de emissão';
comment on column core.fato_boleto.dt_vencimento is 'Data de vencimento';
comment on column core.fato_boleto.dt_registro is 'Registro no banco';
comment on column core.fato_boleto.dt_liquidacao is 'Data de liquidação';
