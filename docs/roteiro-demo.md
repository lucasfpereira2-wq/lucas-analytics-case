# Roteiro de demo — 3 minutos

Objetivo: contar, em um caminho de cliques, a história "relatório confiável depende de dado governado".
Abra o link do Hub em tela cheia (1440×900 ou maior), modo claro.

Os relatórios são mostrados limpos, como o diretor está acostumado a ver. O que há por trás de cada número
aparece na página **Impacto nos relatórios**.

| Tempo | Tela | Clique | O que dizer |
|---|---|---|---|
| 0:00 – 0:20 | **Abertura** | Deixe a tela respirar e clique em **Explorar o Hub** | "Sou o Lucas. Em vez de trazer slides, construí um ambiente simulado para mostrar como eu atacaria a dor de qualidade e governança de dados." |
| 0:20 – 0:45 | **Visão Executiva** | Aponte o **Índice de Saúde dos Dados** e a contagem do farol | "Este é o retrato de hoje: 80 tabelas monitoradas, 12 em vermelho. O índice caiu 16 pontos em uma semana, e eu sei exatamente por quê." |
| 0:45 – 1:05 | **Top 5 problemas críticos** | Clique em **Parcelas duplicadas inflando o recebimento** | "Cada problema está escrito em linguagem de negócio: não é 'job falhou', é 'o recebimento de ontem aparece 1,8% acima do extrato'." |
| 1:05 – 1:35 | **Farol › `fato_parcelas`** | Mostre **Testes de qualidade** (evidência das 312 duplicadas) e **Amostra de dados** (linhas destacadas) | "312 registros duplicados em `id_parcela`. A rotina reprocessou o lote sem upsert. O teste que detectaria isso leva uma linha de SQL." |
| 1:35 – 1:55 | **Linhagem** (mesma tela) | Aba **Linhagem**; clique em **Ver linhagem completa**, siga o caminho tracejado até o relatório e clique no nó **Cobrança: Carteira e Inadimplência** | "A linhagem mostra até onde o erro viaja: da tabela para o mart e do mart para o relatório que a diretoria lê." |
| 1:55 – 2:25 | **Impacto nos relatórios** | Mostre o cartão de Cobrança (R$ 19,29 mi no relatório, R$ 18,95 mi correto) e o de Atendimento (NPS 62 divulgado, 56 correto) | "Quatro dos cinco relatórios executivos carregam alguma ressalva. Aqui está, para cada um, o número publicado, o número correto e a tabela que causa a diferença. O NPS levado ao comitê estava 6 pontos acima do real." |
| 2:25 – 2:40 | **Relatório** | Clique em **Abrir relatório** (Cobrança ou Vendas) e passe pelos KPIs, filtros e um drill-down | "E estes são os relatórios, do jeito que a diretoria consome. Eu entrego o relatório e também a garantia de que o número está certo." |
| 2:40 – 3:00 | **Plano de 90 dias** | Mostre a timeline e a projeção do índice | "Em 90 dias: inventário, donos e SLAs, chaves primárias, testes automatizados e monitoramento. O índice sai de 71% para acima de 90%." |

## Frase de fechamento

"O que eu trouxe não é só um dashboard bonito. É a forma como eu trabalho: todo número divulgado tem dono, tem teste e tem selo."

## Plano B (se sobrar tempo ou houver perguntas)

- **Farol › Heatmap**: 80 tabelas × 30 dias; a faixa vermelha de `stg_telefonia_cdr` mostra a rotina parada há 3 dias.
- **Rotinas**: taxa de sucesso e falhas recorrentes por pipeline.
- **Safra, MOB e Cohort**: mostra domínio do negócio de crédito e consórcio.
- **Glossário**: definição oficial de cada métrica, com tabela-fonte.
- **Ctrl+K**: busca global por tabela, relatório ou termo.
