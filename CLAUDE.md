# Memória do projeto — Lucas Analytics Case · Qualidade e Governança de Dados

> Este arquivo é a memória viva do projeto. Qualquer pessoa ou IA que abrir o repositório deve conseguir
> entender o projeto inteiro por aqui. **Atualize a seção "Estado atual" a cada etapa concluída.**

## O que é

Portal web estático e interativo que simula o ambiente de dados de uma administradora de consórcios **fictícia**.
É um case público de **Lucas Pereira** (Lucas Analytics), feito para divulgação no LinkedIn, que responde:
*se eu assumisse hoje uma área de dados com problemas de qualidade, o que eu faria?* Tese: *relatório confiável depende de dado governado*.
Origem: cópia independente (23/11/2026) de um portal feito para um processo seletivo, que vive em outro repositório privado.
**Este case não pode ter vínculo com nenhuma empresa real**: não citar nome de empresa nem de processo seletivo, sem ícone ou cor de marca.
Problemas que o case endereça: informação divulgada errada, rotinas que não atualizam,
rotinas que duplicam dados e tabelas sem chave primária.

## Regras do dono do projeto (não quebrar)

- Tudo em **português do Brasil**, com formatação brasileira (R$, vírgula decimal, dd/mm/aaaa).
- **Não usar logotipo, nome ou marca de nenhuma empresa real.** Identidade própria: marinho + índigo (`#7B8CFF`/`#4C5FD5`;
  os tokens CSS mantêm os nomes `agua-*` por compatibilidade), ícone genérico de dados (`DatabaseZap`, em
  `app/src/components/layout/Marca.tsx`) e o nome "Lucas Analytics Case".
- Verde, amarelo e vermelho são **exclusivos de status**; nunca cor de série em gráfico.
- Sem emojis na interface, sem lorem ipsum, visual de produto enterprise.
- Rodapé: "Ambiente simulado. Dados fictícios gerados para demonstração."
- Site 100% estático, sem backend. Dados em JSON gerados por Python com seed fixa.
- Dados pessoais do autor ainda não informados ficam como `[PREENCHER]` em `app/src/content/perfil.json`
  (e-mail, agenda). Portfólio: https://www.lucasanalytics.com.br/ · LinkedIn (informado em 18/11):
  https://www.linkedin.com/in/lucas-fernandes-317427168/
- **Os relatórios NÃO mostram alertas de erro de dados** (decisão do dono em 17/11): ficam limpos, com os números como
  publicados, para mostrar que o autor também faz relatórios bonitos. Selos de confiança, "publicado × correto" e
  links para a tabela causadora vivem somente na página **Impacto nos relatórios** (`/impactos`). Não reintroduzir
  selo, aviso ou alternador "Reportado | Corrigido" dentro das páginas de relatório.
- Manter este arquivo sempre atualizado.

## Tela de abertura (`app/src/pages/Abertura.tsx`)

- Uma única tela sem rolagem no desktop (validado em 1366×768 e 1440×900). Esquerda: nome, frase, bio, destaques, pilares e botões.
  Direita (painel marinho): retrato ou monograma, **linha do tempo animada da trajetória** e o cartão "Por que este Hub?".
- **Destaque de dados fictícios** (pedido do dono em 18/11): selo "Ambiente simulado · dados 100% fictícios" no topo e a frase
  "Todos os dados são fictícios..." no cartão da direita. Textos em `perfil.json` → `aviso`.
- **Trajetória** (`app/src/pages/abertura/Trajetoria.tsx`, conteúdo em `app/src/content/trajetoria.json`): SVG animado com a curva de
  evolução de cargo (2012 → hoje), faixa de empresas e 7 marcos que se revezam a cada 4,6 s; pausa ao passar o mouse, clique fixa
  um marco, respeita `prefers-reduced-motion`. Fonte: currículo enviado pelo dono (AeC 2012–2020, Mundiale, Sólides, Mundiale,
  AeC como coordenador, A3Data, Raro Labs). Nomes de clientes finais foram omitidos de propósito ("um banco", "cliente de crédito").
- **Foto**: `app/public/foto-lucas.jpg` (640×640, recortada no rosto a partir da foto enviada pelo dono em 18/11), apontada em
  `perfil.json` → `foto`. Aparece no retrato da abertura e no avatar "Sobre o Lucas" da sidebar. Vazio = monograma "LP";
  se o arquivo não carregar, a abertura volta ao monograma.

## Stack

React + TypeScript + Vite, Tailwind, shadcn/ui, ECharts, TanStack Table, React Flow, HashRouter.
Dados: Python 3 (numpy/pandas) em `/data-engineering`. Deploy: GitHub Pages via Actions.

## Mapa do repositório

```
CLAUDE.md                     esta memória
README.md                     apresentação do projeto, arquitetura, como rodar
app/                          front-end
  src/types/                  contratos TypeScript dos JSONs (governanca.ts, cubo.ts)
  src/content/                textos editáveis: perfil.json (inclui o aviso de dados fictícios), trajetoria.json, artigos.json, plano90.json
  src/pages/                  Abertura, VisaoExecutiva, farol/, Rotinas, ImpactoRelatorios, Glossario, relatorios/ (5), Plano90, Artigos
  public/data/                JSONs gerados (meta, governanca/*, relatorios/*)
data-engineering/
  catalog/tabelas.py          lista mestre das 80 tabelas (status-alvo, linhagem, donos, SLA)
  catalog/cenario.py          cenário único de problemas e números-chave
  catalog/schemas.py          colunas, PK/FK e PII das 80 tabelas
  simulacao/                  simulação de negócio -> cubos dos relatórios
  governanca/                 motor de governança -> catálogo, testes, linhagem, selos, saúde
  sql/                        DDL, modelos dos marts e testes de qualidade em SQL
  tests/                      validação e reconciliação
docs/contratos.md             contratos compartilhados (rotas, tokens, arquivos, regras de coerência)
docs/roteiro-demo.md          roteiro de demo de 3 minutos
docs/prints/                  screenshots de cada tela (usados no README)
```

## Como rodar

```bash
cd data-engineering && python3 run_all.py     # regenera todos os JSONs e valida
cd app && npm install && npm run dev          # desenvolvimento
cd app && npm run build                       # build de produção em app/dist
```

## Narrativa central (o coração do Hub)

Cada problema de dado se propaga pela linhagem até um relatório. A página **Impacto nos relatórios** mostra o
**selo de confiança** de cada relatório, o número publicado contra o correto, e aponta de volta para a tabela no Farol.
Caminho da demo: Home → problema → tabela no Farol → linhagem → Impacto nos relatórios → relatório → Plano de 90 dias.

| Problema | Tabela | Efeito no negócio |
|---|---|---|
| 312 parcelas duplicadas (carga sem upsert) | `fato_parcelas` | recebimento de 16/11 ~1,8% acima do extrato |
| Rotina parada há 3 dias | `stg_telefonia_cdr` | Atendimento sem dados de voz de 14 a 16/11 |
| Respostas de pesquisa duplicadas | `fato_pesquisa_nps` | NPS de outubro levado ao comitê como 62; o correto é 56 |
| Carga parcial (412 x 1.148 linhas) | `stg_crm_propostas` | funil de 16/11 subestimado |
| 147 cotas com grupo inexistente | `dim_cota` | cotas fora das análises por grupo e safra |
| Sem chave primária | `stg_whatsapp_conversas`, `fato_chamadas_legacy` | contagens não auditáveis |
| 18% de CPF nulo no canal Parceiro | `dim_cliente` | cobrança e conformidade |

Selos esperados: Vendas = atenção · Carteira = crítico · Safra = atenção · Atendimento = crítico · Assembleias = confiável.
Farol-alvo: 47 verdes, 21 amarelas, 12 vermelhas. Índice de Saúde em torno de 71%.
Data de referência do portal: 17/11/2026 08:00.

## Decisões de arquitetura

- **Cenário único** (`cenario.py`) lido pelos dois geradores, para os números baterem entre Farol e relatórios.
- **Cubos colunares** pré-agregados por relatório; razões (ticket médio, TMA, NPS, % inadimplência) são
  calculadas no front a partir de numerador e denominador aditivos, para os filtros funcionarem.
- Filtro de UF em cubo que só tem regional usa `meta.pesos_uf` (alocação proporcional).
- Medidas de estoque (carteira) usam a última fotografia do período; nunca somam datas.
- HashRouter + `base: './'` para funcionar em GitHub Pages em qualquer subcaminho.

## Organização do trabalho (subagentes)

Orquestrador define contratos e integra. Agentes: Engenharia de Dados, Governança e Qualidade,
UI/UX e Front-end, Visualização (relatórios), QA.

## Estado atual

- [x] Contratos definidos (tabelas mestre, cenário, tipos TypeScript, tokens)
- [x] Onda 1a: simulação e cubos dos 5 relatórios (284 validações passando; `python3 data-engineering/run_all.py`)
- [x] Onda 1b: motor de governança (índice 71,5; 47/21/12; 31 pipelines; 524 testes; 10 incidentes; 28 termos)
- [x] Onda 1c: design system, shell, abertura, artigos, plano de 90 dias, filtros globais, motor de cubos, selo de confiança
- [x] Onda 2: Home, Farol (grade, lista, heatmap), detalhe da tabela com linhagem, Rotinas, Glossário e os 5 relatórios
- [x] Página Impacto nos relatórios (`app/src/pages/ImpactoRelatorios.tsx`); alertas removidos das páginas de relatório
- [x] QA do orquestrador (17/11, sobre o build de produção): 20 rotas com zero erros e warnings de console, sem `NaN`/`undefined`;
      42 combinações de filtro nos 5 relatórios sem falha; soma por segmento, por regional e por canal = KPI total
      (Vendas 28.218 cotas; Atendimento 2.826.342 contatos); caminho do roteiro de demo validado clique a clique;
      modo escuro conferido; carregamento de cada rota em cerca de 1 s; prints em `docs/prints/`
- [x] Versão pública "Lucas Analytics Case" (23/11): nome, ícone, cor de destaque e textos sem vínculo com empresa real; prints refeitos
- [x] README, roteiro de demo (`docs/roteiro-demo.md`), workflow de deploy (`.github/workflows/deploy.yml`)

## Pendências conhecidas

- O build emite um aviso do empacotador sobre a diretiva `"use no memo"` de uma dependência (`react-compiler-runtime`); é inofensivo.
- Chunk do ECharts com 276 kB gzip, carregado sob demanda (fora do bundle inicial de 110 kB gzip).
- Layout em celular foi conferido só na Abertura; as telas internas são desktop-first.

- Preencher e-mail e agenda (`[PREENCHER]`) em `app/src/content/perfil.json`; LinkedIn e foto já estão preenchidos.
- Publicação: este case é um projeto separado da versão original, que continua intocada no repositório dela.
  Deploy na Vercel como projeto próprio (`lucas-analytics-case`). Para versionar, criar um repositório próprio no GitHub
  (sugestão: `lucas-analytics-case`) e enviar esta pasta.
- Texto do post de LinkedIn em `docs/post-linkedin.md`.

## Números reais da simulação (para conferência)

78.480 cotas ativas · saldo de R$ 10,49 bi · over 30 de 6,67% em quantidade de cotas (4,72% em saldo; over 90 de 2,79% em saldo) · 55.683 cotas vendidas em 24 meses · ticket médio de R$ 143,8 mil ·
9.499 contatos por dia útil · 409 grupos · 340 vendedores.
Cenário: 312 parcelas duplicadas em 16/11 (R$ 341.130, +1,8% sobre o recebimento correto de R$ 18,95 mi) ·
NPS de outubro 62,01 reportado x 56,06 corrigido (2.035 respostas duplicadas desde 01/10) ·
propostas de 16/11: 412 contra média de 1.148 · voz sem linhas em 14, 15 e 16/11.

## Cubos por relatório (`app/public/data/relatorios/`)

- `vendas.json`: `vendas`, `cancelamentos`, `funil`, `metas`, `extras.vendedores`
- `cobranca-carteira.json`: `carteira` (estoque, 152 fotografias), `roll_rate`, `recebimento` (com `*_dup`), `recuperacao`
- `cobranca-safra.json`: `safra_mob` (triangular; `cotas_base` repetida em cada MOB)
- `atendimento.json`: `contatos`, `motivos`, `hora`, `nps` (com `*_dup`), `csat`, `detracao` (regional/UF por pesos)
- `assembleias.json`: `contemplacoes`, `lances`, `liberacao`, `grupos`, `extras.grupos`

## Front-end: base compartilhada (ver `app/README.md` para a API completa)

- Versões: React 19, Vite 8, Tailwind 4 (tokens em `app/src/index.css`, sem `tailwind.config`), ECharts 6, react-router 7,
  zustand 5, TanStack Table 9, React Flow (`@xyflow/react`) 13. Componentes de `components/ui` no padrão shadcn (escritos à mão com Radix).
- `src/lib/cubo.ts` (filtrar, agrupar, serieTemporal, compararPeriodos), `src/lib/filtros.ts` (zustand, filtros na URL),
  `src/lib/dados.ts` (carregarJSON + hooks), `src/lib/formato.ts` (formatação brasileira), `src/lib/tema-echarts.ts`.
- `src/components/dados/` (KpiCard, ChartCard, EChart, SeloConfianca, StatusBadge), `src/components/relatorio/` (LayoutRelatorio, BarraFiltros),
  `src/components/layout/` (Shell, BuscaGlobal Ctrl+K).
- Paleta de séries validada (claro): `#175B8C #22ABA8 #6F5FD0 #58A6E8 #B4589E #C2703D`. Acima de 6 categorias, agrupar em "Outros".
- A dimensão de canal muda por cubo: `canal` (vendas, safra), `canal_cobranca`, `canal_atendimento`.

## Governança: como funciona

- `data-engineering/governanca/gerar.py` simula 30 dias de execuções e os testes de qualidade de cada tabela; o farol é calculado
  a partir deles e validado contra o status-alvo. Fórmula do índice em `saude.json` → `formula` e em `data-engineering/governanca/README.md`.
- O nível do selo parte do farol do mart do relatório e é rebaixado para "atenção" se houver upstream não-verde.
- Ids na linhagem: fontes `fonte:<slug>`, relatórios `relatorio:<id>`, tabelas pelo próprio nome.
- O motor lê `data-engineering/output/resumo_simulacao.json`; por isso rode sempre `run_all.py` (simulação antes da governança).
