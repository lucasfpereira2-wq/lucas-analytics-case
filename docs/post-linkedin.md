# Post para o LinkedIn

> Trocar `[LINK DO CASE]` pela URL publicada. Sugestão de imagem: `docs/prints/abertura.png` ou `docs/prints/visao-executiva.png`
> (ou um carrossel com Visão Executiva → Farol → Impacto nos relatórios → Plano de 90 dias).

---

Se eu assumisse hoje uma área de dados com problemas de qualidade, o que eu faria?

Transformei essa pergunta em um case interativo.

O cenário é comum em muitas empresas: o número que chega à diretoria está errado e ninguém percebe. Uma rotina parou e o relatório ficou com dados de três dias atrás. Uma carga rodou duas vezes e duplicou o recebimento do dia. A tabela não tem chave primária, então ninguém consegue provar quantas linhas deveria ter.

Para responder, construí o ambiente de dados completo de uma administradora de consórcios fictícia:

→ 80 tabelas monitoradas em um Farol de Dados (verde, amarelo, vermelho), com dono, SLA e testes de qualidade
→ Linhagem de ponta a ponta: da fonte até o relatório que a diretoria lê
→ Uma página que mostra o impacto de cada falha no negócio: o número publicado contra o número correto
→ 5 relatórios executivos (Vendas, Cobrança, Safra, Atendimento e Assembleias), com filtros e drill-down
→ Um plano de 90 dias: diagnóstico, padronização (PK, testes, SLA e donos) e monitoramento contínuo

Alguns exemplos do que o case encontra:
• 312 parcelas duplicadas inflando o recebimento do dia em 1,8%
• Um NPS levado ao comitê como 62, quando o correto era 56
• Uma carga parcial com 412 linhas contra uma média de 1.148

A tese é simples: relatório confiável depende de dado governado. Um dashboard bonito em cima de uma tabela duplicada continua errado, só que com mais cor.

Todos os dados são 100% fictícios, gerados por simulação em Python com semente fixa. O site é estático, feito com React, TypeScript, ECharts e React Flow.

Explore o case: [LINK DO CASE]

Se você lidera dados ou consome relatórios para decidir, me conta: qual destes problemas você já viu de perto?

#Dados #QualidadeDeDados #GovernançaDeDados #DataQuality #DataGovernance #EngenhariaDeDados #Analytics #BI
