# Engenharia de Dados — Lucas Analytics Case

Gera, com seed fixa (`catalog/cenario.py`), todos os dados fictícios que o portal consome. Nada aqui depende de
banco de dados ou de rede: é Python 3 com `numpy` e `pandas`, e o resultado é 100% reprodutível.

## Como rodar

```bash
python3 data-engineering/run_all.py                    # simulação -> governança -> DDL -> validações
python3 data-engineering/simulacao/main.py             # só a simulação de negócio (~3 s)
python3 data-engineering/tests/validar_relatorios.py   # só as validações dos relatórios
python3 data-engineering/sql/gerar_ddl.py              # só a DDL das 80 tabelas
```

`run_all.py` termina com código 1 se qualquer etapa falhar.

## O que cada pasta faz

| Pasta | Conteúdo |
|---|---|
| `catalog/` | Contratos: lista mestre das 80 tabelas (`tabelas.py`), cenário de problemas e números-chave (`cenario.py`) e colunas, PK/FK e PII (`schemas.py`). |
| `simulacao/` | Simulação de negócio. `cotas.py` simula ~94 mil cotas (estoque inicial + vendas diárias) e a cadeia de Markov mensal de atraso; `vendas.py`, `cobranca.py`, `atendimento.py` e `assembleias.py` montam os cubos; `comum.py` tem calendário, dimensões e o montador de cubos; `main.py` grava tudo. |
| `governanca/` | Motor de governança (catálogo, execuções, testes, linhagem, selos, saúde). Lê `output/resumo_simulacao.json`. |
| `sql/ddl/` | Um `create table` por tabela, gerado por `sql/gerar_ddl.py` a partir de `catalog/schemas.py`. |
| `sql/marts/` | Um modelo SQL por mart (estilo dbt), legível, mostrando como cada relatório nasce das tabelas core. |
| `sql/testes/` | Testes de qualidade em SQL: unicidade, PK existente, FK órfã, nulos, volume por dia da semana, frescor, duplicidade e reconciliação. |
| `tests/` | `validar_relatorios.py`: schema dos cubos, os 5 itens do cenário e reconciliações entre cubos. |
| `output/` | `resumo_simulacao.json`: volumes das 80 tabelas e números reais do cenário (insumo da governança). |

## Saídas

- `app/public/data/meta.json`: dimensões, UFs, regionais e pesos de alocação (`pesos_uf`, `pesos_regional`).
- `app/public/data/relatorios/{vendas,cobranca-carteira,cobranca-safra,atendimento,assembleias}.json`: cubos colunares
  (contrato em `app/src/types/cubo.ts`). Dimensões são índices de dicionário; medidas são aditivas e inteiras;
  razões (ticket médio, TMA, % de inadimplência, NPS) nunca vêm prontas.

## Como a simulação funciona

- **Cotas**: 38,5 mil cotas ativas em 30/11/2024 + ~2.350 vendas/mês (tendência leve, picos em março e outubro/novembro,
  vale em janeiro, dias úteis vendem mais). Cada cota tem segmento, UF, canal, vendedor, crédito, prazo e vencimento.
- **Atraso**: cadeia de Markov mensal por cota (Em dia, 1–30, 31–60, 61–90, 90+, cancelada, quitada), com risco maior em
  Serviços e Auto, no canal Digital e nas safras de janeiro a junho de 2025. A transição acontece no dia do vencimento,
  o que permite fotografar a carteira em qualquer dia.
- **Derivados das cotas**: vendas, cancelamentos, carteira, roll rate, recebimento, safra x MOB e ocupação dos grupos.
  Por isso os cubos fecham entre si (ex.: vendas = base das safras; cotas ocupadas = carteira ativa).
- **Agregados**: funil, metas, recuperação, atendimento, NPS/CSAT, contemplações e lances (Poisson/binomial com
  sazonalidade semanal e intradiária).

## Cenário de problemas refletido nos cubos

| Incidente | Onde aparece |
|---|---|
| 312 parcelas duplicadas em 16/11 (+1,8%) | `cobranca-carteira.recebimento`: `valor_recebido` é o reportado; `*_dup` isola a duplicata |
| Telefonia parada de 14 a 16/11 | `atendimento.contatos`, `motivos` e `hora`: sem linhas do canal Voz nesses dias |
| NPS de outubro 62 reportado x 56 correto | `atendimento.nps`: colunas `*_dup` a partir de 01/10/2026, concentradas em promotores do App |
| Carga parcial de propostas (412 x 1.148) | `vendas.funil`: `propostas` de 16/11; leads e contratos seguem normais |
| Assembleias | sem anomalias |

Convenções: novembro/2026 é parcial (até 16/11); as metas são do mês cheio; `roll_rate` só traz meses fechados;
o último MOB de cada safra usa a posição de 16/11/2026.
