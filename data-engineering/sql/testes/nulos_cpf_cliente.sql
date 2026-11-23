-- Teste: completude de `cpf_cliente` em dim_cliente, por canal de origem (regra: nao_nulo | severidade: alto)
-- Limite: até 1% de nulos por canal. Falha se retornar linhas. Hoje: canal Parceiro com 18% (4,1% no total).
select
    canal_origem,
    count(*)                                                                 as cadastros,
    sum(case when cpf_cliente is null or trim(cpf_cliente) = '' then 1 else 0 end) as sem_cpf,
    round(100.0 * sum(case when cpf_cliente is null or trim(cpf_cliente) = '' then 1 else 0 end) / count(*), 2) as pct_sem_cpf
from core.dim_cliente
group by canal_origem
having 100.0 * sum(case when cpf_cliente is null or trim(cpf_cliente) = '' then 1 else 0 end) / count(*) > 1.0
order by pct_sem_cpf desc;
