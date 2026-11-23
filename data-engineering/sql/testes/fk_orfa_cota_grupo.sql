-- Teste: integridade referencial dim_cota.id_grupo -> dim_grupo.id_grupo (regra: integridade_referencial | severidade: alto)
-- Falha se retornar linhas. Hoje retorna 147 cotas cujo grupo foi excluído fisicamente no ERP.
select c.id_cota, c.id_grupo, c.situacao_cota, c.dt_adesao
from core.dim_cota c
left join core.dim_grupo g on g.id_grupo = c.id_grupo
where g.id_grupo is null
order by c.id_grupo, c.id_cota;
