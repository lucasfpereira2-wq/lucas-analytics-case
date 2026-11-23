-- Teste: unicidade de `id_parcela` em fato_parcelas (regra: unicidade | severidade: crítico | bloqueante)
-- Falha se retornar linhas. Em 17/11/2026 retorna 312 chaves duplicadas (lote de 16/11 regravado em modo append).
select
    id_parcela,
    count(*)      as ocorrencias,
    min(dt_carga) as primeira_carga,
    max(dt_carga) as ultima_carga
from core.fato_parcelas
group by id_parcela
having count(*) > 1
order by ocorrencias desc, id_parcela;
