-- core.fato_pagamento
-- Pagamentos liquidados e conciliados
-- Domínio: Financeiro e Cobrança | Camada: core | Dono: Patrícia Lemos (Crédito & Cobrança)
-- Rotina: core_financeiro_parcelas | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.fato_pagamento (
    id_pagamento    bigint        not null,
    id_parcela      bigint        not null,
    nosso_numero    varchar(20)   not null,
    meio_pagamento  varchar(20)   not null,
    cd_banco        char(3)       not null,
    vl_pago         decimal(12,2) not null,
    vl_juros_multa  decimal(10,2) not null,
    fl_conciliado   char(1)       not null,
    dt_pagamento    date          not null,
    dt_credito      date          not null,
    constraint pk_fato_pagamento primary key (id_pagamento),
    constraint fk_fato_pagamento_id_parcela foreign key (id_parcela) references core.fato_parcelas (id_parcela)
);

comment on table core.fato_pagamento is 'Pagamentos liquidados e conciliados';
comment on column core.fato_pagamento.id_pagamento is 'Chave do pagamento';
comment on column core.fato_pagamento.id_parcela is 'Parcela liquidada';
comment on column core.fato_pagamento.nosso_numero is 'Identificação do título no banco';
comment on column core.fato_pagamento.meio_pagamento is 'Boleto, débito em conta ou Pix';
comment on column core.fato_pagamento.cd_banco is 'Banco da liquidação';
comment on column core.fato_pagamento.vl_pago is 'Valor pago';
comment on column core.fato_pagamento.vl_juros_multa is 'Juros e multa cobrados';
comment on column core.fato_pagamento.fl_conciliado is 'Conciliado com o retorno bancário (S/N)';
comment on column core.fato_pagamento.dt_pagamento is 'Data do pagamento';
comment on column core.fato_pagamento.dt_credito is 'Data do crédito em conta';
