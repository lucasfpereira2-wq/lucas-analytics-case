-- core.fato_fundo_reserva
-- Movimentação do fundo de reserva por grupo
-- Domínio: Financeiro e Cobrança | Camada: core | Dono: Patrícia Lemos (Crédito & Cobrança)
-- Rotina: core_financeiro_fundos | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.fato_fundo_reserva (
    id_movimento    bigint        not null,
    id_grupo        integer       not null,
    id_pagamento    bigint,
    tipo_movimento  varchar(30)   not null,
    competencia     char(7)       not null,
    vl_movimento    decimal(14,2) not null,
    vl_saldo_apos   decimal(16,2) not null,
    dt_movimento    date          not null,
    constraint pk_fato_fundo_reserva primary key (id_movimento),
    constraint fk_fato_fundo_reserva_id_grupo foreign key (id_grupo) references core.dim_grupo (id_grupo),
    constraint fk_fato_fundo_reserva_id_pagamento foreign key (id_pagamento) references core.fato_pagamento (id_pagamento)
);

comment on table core.fato_fundo_reserva is 'Movimentação do fundo de reserva por grupo';
comment on column core.fato_fundo_reserva.id_movimento is 'Chave do movimento';
comment on column core.fato_fundo_reserva.id_grupo is 'Grupo';
comment on column core.fato_fundo_reserva.id_pagamento is 'Pagamento que originou o movimento';
comment on column core.fato_fundo_reserva.tipo_movimento is 'Arrecadação, cobertura de inadimplência ou rendimento';
comment on column core.fato_fundo_reserva.competencia is 'Mês de competência (AAAA-MM)';
comment on column core.fato_fundo_reserva.vl_movimento is 'Valor do movimento';
comment on column core.fato_fundo_reserva.vl_saldo_apos is 'Saldo do fundo após o movimento';
comment on column core.fato_fundo_reserva.dt_movimento is 'Data do movimento';
