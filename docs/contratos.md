# Contratos compartilhados — Lucas Analytics Case

Documento de referência para todos os agentes. Em caso de dúvida, vale o que está aqui e nos arquivos citados.

## 1. Fontes de verdade

| O quê | Onde |
|---|---|
| Lista mestre das 80 tabelas (domínio, camada, dono, SLA, pipeline, status-alvo, linhagem) | `data-engineering/catalog/tabelas.py` |
| Cenário de problemas, números-chave, incidentes, dimensões de negócio | `data-engineering/catalog/cenario.py` |
| Tipos dos JSONs de governança | `app/src/types/governanca.ts` |
| Tipos dos cubos de relatório | `app/src/types/cubo.ts` |
| Memória viva do projeto | `CLAUDE.md` (raiz) |

Data de referência do portal ("agora"): **17/11/2026 08:00**. Histórico de negócio: 01/12/2024 a 16/11/2026. Seed fixa.

## 2. Arquivos de dados (gerados por Python, versionados)

```
app/public/data/meta.json                         Meta
app/public/data/governanca/catalogo.json          Catalogo (80 tabelas + 30 dias de execuções)
app/public/data/governanca/tabelas/<nome>.json    TabelaDetalhe (carregado sob demanda)
app/public/data/governanca/linhagem.json          Linhagem (fontes -> tabelas -> relatórios)
app/public/data/governanca/pipelines.json         Pipeline[]
app/public/data/governanca/saude.json             Saude
app/public/data/governanca/incidentes.json        Incidente[]
app/public/data/governanca/selos.json             Record<relatorio, Selo>
app/public/data/governanca/glossario.json         TermoGlossario[]
app/public/data/relatorios/<id>.json              DadosRelatorio (cubos)   id ∈ vendas | cobranca-carteira | cobranca-safra | atendimento | assembleias
data-engineering/output/resumo_simulacao.json     volumes e números reais da simulação (lido pelo motor de governança, se existir)
```

Dono de cada arquivo: `meta.json` e `relatorios/*` → Engenharia de Dados. `governanca/*` → Governança.

## 3. Rotas do front (HashRouter, `base: './'`)

| Rota | Tela |
|---|---|
| `/` | Abertura "Quem está apresentando" (sem sidebar) |
| `/visao-executiva` | Home / Visão Executiva |
| `/farol` | Farol de Dados (grade, lista, heatmap) |
| `/farol/:tabela` | Detalhe da tabela |
| `/rotinas` | Rotinas / Pipelines |
| `/impactos` | Impacto nos relatórios: selo de confiança, tabela causadora e desvio de cada relatório |
| `/glossario` | Glossário de métricas |
| `/relatorios/vendas` · `/relatorios/cobranca-carteira` · `/relatorios/cobranca-safra` · `/relatorios/atendimento` · `/relatorios/assembleias` | Relatórios |
| `/plano-90-dias` | Plano de 90 dias |
| `/artigos` | Artigos & publicações |

## 4. Identidade visual

Base de cores própria: marinho + índigo (os tokens mantêm os nomes `marinho-*` e `agua-*` por compatibilidade). **Sem logotipo ou marca de empresa**: ícone genérico de dados e o nome "Lucas Analytics Case".

| Token | Claro | Uso |
|---|---|---|
| `--marinho-950` | `#00172B` | fundo do modo escuro |
| `--marinho-900` | `#00203A` | sidebar, cabeçalhos, texto forte |
| `--marinho-700` | `#0E3A5C` | superfícies escuras secundárias |
| `--agua-500` | `#2FB6B3` | acento principal (verde-água) |
| `--agua-600` | `#0F8F8D` | acento com contraste para texto/botão |
| `--agua-100` | `#E3F4F3` | fundos suaves, realces |
| `--status-verde` | `#2FA84F` | status OK (sempre com ícone) |
| `--status-amarelo` | `#E0A100` | alerta |
| `--status-vermelho` | `#D64545` | crítico |

- Verde, amarelo e vermelho são **exclusivos de status**. Nunca como cor de série.
- Paleta de séries (ponto de partida; o agente de visualização pode refinar com o validador da skill `dataviz`): `#0E3A5C`, `#2FB6B3`, `#5AA9E6`, `#7B6CD9`, `#B66DAE`, `#8A9BB0`, `#2E6F95`, `#A8DADC`. Sequencial para heatmaps: do `--agua-100` ao `--marinho-900`.
- Tipografia Inter (empacotada, sem CDN). Cantos arredondados, sombras sutis, muito respiro, números grandes com abreviação (R$ 1,2 bi; 38,4 mil).
- Modo claro e escuro. Sem emojis na interface (status usa ícones). Tudo em PT-BR, sem lorem ipsum.
- Rodapé: "Ambiente simulado. Dados fictícios gerados para demonstração."

## 5. Formatação brasileira

R$ com ponto de milhar e vírgula decimal; percentuais com vírgula; datas dd/mm/aaaa; abreviações "mil", "mi", "bi". Funções centralizadas em `app/src/lib/formato.ts`.

## 6. Regras de coerência (o QA valida)

1. O farol de cada tabela nasce das execuções e dos testes simulados, e precisa bater com o status-alvo de `tabelas.py`.
2. O selo de cada relatório é derivado do upstream na linhagem e bate com `SELOS_ESPERADOS`. **Os selos e alertas aparecem somente na página `/impactos`**; as páginas de relatório ficam limpas, com os números como publicados.
3. Os números citados em incidentes e selos são os mesmos presentes nos cubos (312 duplicados, +1,8%, NPS 62 x 56, voz ausente em 14–16/11, propostas 412 x 1.148).
4. Totais de KPI = soma dos detalhamentos sob o mesmo filtro.
