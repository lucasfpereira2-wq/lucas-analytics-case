-- core.fato_fundo_comum
-- Movimentação do fundo comum por grupo
-- Domínio: Financeiro e Cobrança | Camada: core | Dono: Patrícia Lemos (Crédito & Cobrança)
-- Rotina: core_financeiro_fundos | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.fato_fundo_comum (
    id_movimento    bigint        not null,
    id_grupo        integer       not null,
    id_pagamento    bigint,
    tipo_movimento  varchar(30)   not null,
    competencia     char(7)       not null,
    vl_movimento    decimal(14,2) not null,
    vl_saldo_apos   decimal(16,2) not null,
    dt_movimento    date          not null,
    constraint pk_fato_fundo_comum primary key (id_movimento),
    constraint fk_fato_fundo_comum_id_grupo foreign key (id_grupo) references core.dim_grupo (id_grupo),
    constraint fk_fato_fundo_comum_id_pagamento foreign key (id_pagamento) references core.fato_pagamento (id_pagamento)
);

comment on table core.fato_fundo_comum is 'Movimentação do fundo comum por grupo';
comment on column core.fato_fundo_comum.id_movimento is 'Chave do movimento';
comment on column core.fato_fundo_comum.id_grupo is 'Grupo';
comment on column core.fato_fundo_comum.id_pagamento is 'Pagamento que originou o movimento';
comment on column core.fato_fundo_comum.tipo_movimento is 'Arrecadação, contemplação, rendimento ou devolução';
comment on column core.fato_fundo_comum.competencia is 'Mês de competência (AAAA-MM)';
comment on column core.fato_fundo_comum.vl_movimento is 'Valor do movimento';
comment on column core.fato_fundo_comum.vl_saldo_apos is 'Saldo do fundo após o movimento';
comment on column core.fato_fundo_comum.dt_movimento is 'Data do movimento';
