-- Teste: reconciliação do recebimento do mart com o extrato bancário (regra: reconciliacao | severidade: crítico)
-- Tolerância: 0,1% por dia. Falha se retornar linhas. Em 16/11/2026 o mart está 1,8% acima do CNAB.
with mart as (
    select dt_referencia, sum(vl_recebido) as vl_mart
    from marts.mart_cobranca_carteira
    group by 1
),
banco as (
    select dt_pagamento as dt_referencia, sum(vl_pago) as vl_banco
    from core.fato_pagamento
    where fl_conciliado = 'S'
    group by 1
)
select
    m.dt_referencia,
    m.vl_mart,
    b.vl_banco,
    round(100.0 * (m.vl_mart - b.vl_banco) / nullif(b.vl_banco, 0), 2) as diferenca_pct
from mart m
join banco b using (dt_referencia)
where abs(m.vl_mart - b.vl_banco) > 0.001 * b.vl_banco
order by m.dt_referencia desc;
