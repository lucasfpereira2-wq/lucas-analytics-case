-- Teste: unicidade de `id_resposta` em fato_pesquisa_nps (regra: unicidade | severidade: crítico)
-- Falha se retornar linhas. Desde 01/10/2026 a plataforma reenvia respostas já entregues; as duplicatas
-- concentram-se em promotores do canal App e inflaram o NPS de outubro de 56 para 62.
select
    competencia,
    canal,
    classificacao,
    count(*)                                  as linhas,
    count(distinct id_resposta)               as respostas_unicas,
    count(*) - count(distinct id_resposta)    as linhas_duplicadas
from core.fato_pesquisa_nps
group by competencia, canal, classificacao
having count(*) > count(distinct id_resposta)
order by competencia, linhas_duplicadas desc;
