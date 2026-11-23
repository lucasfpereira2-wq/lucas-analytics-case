# Motor de governança

Gera os JSONs de `app/public/data/governanca/` a partir dos contratos em `data-engineering/catalog/`.

```bash
python3 data-engineering/governanca/gerar.py            # a partir da raiz do repositório
python3 data-engineering/tests/validar_governanca.py    # asserts de coerência (--reproduzir roda o motor de novo e compara)
```

"Agora" é `cenario.DATA_REFERENCIA` (17/11/2026 08:00); a janela é de 30 dias (19/10 a 17/11/2026). A seed é `cenario.SEED`.
Se existir `data-engineering/output/resumo_simulacao.json`, o motor usa os volumes e os valores em R$ da simulação
(os mesmos dos cubos dos relatórios); sem o arquivo, usa volumes padrão. A saída é reprodutível para um mesmo resumo.

| Arquivo | Papel |
|---|---|
| `base.py` | datas, grafo de linhagem, volumes, formatação |
| `execucoes.py` | horário fixo de cada pipeline, 30 dias de execuções por tabela, eventos do cenário, consolidação por pipeline |
| `qualidade.py` | testes de qualidade, farol e Índice de Saúde |
| `amostras.py` | amostra fictícia por tabela, com as linhas problemáticas marcadas |
| `conteudo.py` | metadados dos incidentes, frases dos selos, glossário |
| `gerar.py` | ponto de entrada: monta e grava catálogo, detalhes, linhagem, pipelines, saúde, incidentes, selos e glossário |

## Como o farol nasce

O status de `tabelas.py` é só o alvo da validação. O motor simula a evidência (execuções e testes) e calcula o farol:

- **Vermelho**: a última execução agendada falhou ou não executou; ou a tabela está sem atualizar há mais de um SLA além do prazo;
  ou há teste de severidade crítica ou alta com resultado `falha`.
- **Amarelo**: a última execução foi `atrasada` ou `alerta`; ou há atraso em relação ao SLA; ou há teste em `alerta`.
- **Verde**: dentro do SLA e com todos os testes aprovados.

`atraso_horas` é o maior valor entre (idade da última carga menos o SLA) e o atraso com que a última carga foi concluída.

## Regras de qualidade (3 a 8 testes por tabela, escolhidos pelo schema)

| Regra | O que verifica | Quando entra |
|---|---|---|
| `pk_existente` | a tabela tem chave primária definida | sempre |
| `unicidade` | não há duplicidade na chave (ou na coluna candidata, se não há PK) | sempre |
| `nao_nulo` | coluna obrigatória preenchida | quando há coluna obrigatória fora da PK |
| `integridade_referencial` | toda FK existe na tabela de referência | quando há FK |
| `volume` | linhas da carga contra o esperado para o dia da semana | staging, fatos e marts |
| `frescor` | horas desde a última carga contra o SLA | sempre |
| `schema_drift` | schema recebido igual ao contrato | staging e tabelas com fonte externa |
| `reconciliacao` | totais batem com a origem (ERP, CNAB, marts) | marts e tabelas financeiras |
| `dominio_valores` | valores dentro do domínio (situação, canal, CEP, telefone) | quando há coluna categórica |

`frescor` e `volume` são derivados das execuções simuladas. Os demais achados vêm de `cenario.PROBLEMAS` e entram com
data de início, o que gera o `historico_7d` de cada teste e a tendência do índice. A PK é a chave declarada no catálogo:
o warehouse não impõe unicidade, por isso `fato_parcelas` tem PK e, mesmo assim, 312 duplicados em `id_parcela`.
Na staging, queda de volume acima de 50% é `falha`; nas camadas seguintes o efeito é herdado e vira `alerta`.

## Índice de Saúde (0 a 100)

```
saúde da tabela = 100 x (0,40 x testes + 0,30 x frescor + 0,20 x sucesso das rotinas em 30 dias + 0,10 x chave primária) x fator de risco
```

- **Testes**: parcela aprovada, ponderada pela severidade (crítico 4, alto 3, médio 2, baixo 1); alerta vale metade.
- **Frescor**: 1 dentro do SLA; cai de forma linear com as horas de atraso e zera quando o atraso alcança um SLA inteiro.
- **Sucesso das rotinas**: média das execuções agendadas em 30 dias (sucesso 1; alerta 0,8; atrasada 0,5; falha 0).
- **Chave primária**: 1 se existe, 0 se não existe.
- **Fator de risco**: 1,00 no verde, 0,54 no amarelo e 0,25 no vermelho. É o que impede uma tabela com um único teste
  crítico reprovado de aparecer com nota alta. Os dois fatores foram calibrados para o índice geral ficar em 70 a 73.

Índice geral, por domínio e por camada: média das tabelas ponderada pela criticidade (alta 3, média 2, baixa 1).
`tendencia_30d` recalcula a mesma fórmula para a fotografia das 08:00 de cada dia, com as execuções e os testes daquele dia.
As cinco dimensões (completude, unicidade, frescor, integridade, conformidade) usam o pior resultado da tabela nos testes
da dimensão (ok 100, alerta 55, falha 15), também ponderado pela criticidade.

## Selo de confiança

Para cada relatório, o motor percorre todo o upstream do mart na linhagem:

1. **Crítico** se o mart está vermelho (o farol do mart já carrega a reconciliação e as falhas herdadas).
2. **Atenção** se o mart está amarelo, se há qualquer tabela não-verde no upstream ou incidente com efeito declarado no relatório.
3. **Confiável** apenas quando o mart e todo o upstream estão verdes.

A mensagem vem dos incidentes com efeito declarado em `cenario.INCIDENTES` (efeitos marginais vão para o fim). A lista
`problemas` traz primeiro esses incidentes e depois as demais tabelas não-verdes do upstream, marcadas como
"sem efeito direto declarado".
