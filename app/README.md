# Lucas Analytics Case (front-end)

Portal estático (React 19 + TypeScript + Vite 8 + Tailwind 4) que simula o ambiente de dados de uma administradora de
consórcios. Sem backend: os dados são JSONs em `public/data/` (contratos em `src/types/` e `../docs/contratos.md`).

```bash
npm install
npm run dev        # desenvolvimento
npm run build      # tsc + build de produção em dist/ (base './', HashRouter: funciona em qualquer subpasta)
npm test           # testes do motor de cubos (vitest)
```

## Mapa

```
src/
  App.tsx                      rotas (todas lazy) — ver docs/contratos.md, seção 3
  index.css                    tokens de cor (claro/escuro), tema Tailwind, animações
  content/                     textos editáveis: perfil.json, artigos.json, plano90.json
  lib/
    formato.ts                 formatação brasileira (números, moeda, datas, durações)
    dados.ts                   carregarJSON + hooks (useMeta, useCatalogo, useRelatorio...)
    cubo.ts                    motor dos cubos colunares (filtrar, agrupar, séries, comparação)
    filtros.ts                 store zustand dos filtros globais + sincronização com a URL
    tema.ts / tema-echarts.ts  tema claro/escuro e tema dos gráficos (paleta validada)
    exportar.ts                exportarCSV (";" + BOM) e download de arquivos
    relatorios.ts              cadastro de páginas/relatórios (sidebar, breadcrumb, busca)
    referencia.ts              "agora" do portal (meta.data_referencia) e fallbacks
  components/
    ui/                        primitivos no padrão shadcn/ui (button, card, dialog, popover, tooltip, command, calendar, skeleton)
    dados/                     KpiCard, ChartCard, EChart, Sparkline, SeloConfianca, StatusBadge, StatusDot, EmptyState, Skeletons
    relatorio/                 LayoutRelatorio, BarraFiltros, MultiSelecao
    layout/                    Shell (sidebar + topo + rodapé), BuscaGlobal (Ctrl+K), Pagina, MarcaAncora
  pages/                       uma tela por arquivo (placeholders marcados como "Placeholder" no JSDoc)
```

Regras da casa: tudo em PT-BR; cores sempre por token (`bg-card`, `text-muted-foreground`, `text-primary`...), nunca hex solto;
verde/amarelo/vermelho só para status e sempre com ícone (`StatusBadge`); nenhum número ou data formatado "na mão";
o "hoje" é `meta.fim_historico` e o "agora" é `meta.data_referencia` (nunca `new Date()`); `EChart` só em páginas lazy
(importe de `@/components/dados/EChart`, não do `index.ts`), para o ECharts ficar fora do bundle inicial.

## Formatação — `@/lib/formato`

```ts
fmtBRL(1234.5)                      // "R$ 1.234,50"      fmtBRL(v, 0) sem centavos
fmtNumero(38412)                    // "38.412"
fmtPct(0.184)                       // "18,4%" (recebe fração)   fmtPct(18.4, 1, { fracao: false })   { sinal: true } -> "+18,4%"
fmtCompacto(1.2e9, { moeda: true }) // "R$ 1,2 bi"        fmtCompacto(38400) -> "38,4 mil"
fmtData('2026-11-16')               // "16/11/2026"       fmtDataHora(iso) -> "17/11/2026 08:00"   fmtMes('2026-11') -> "nov/26"
fmtDuracao(252)                     // "4min 12s"
fmtRelativo(iso)                    // "há 2h", "há 3 dias" (relativo à data de referência do portal)
fmtMedida(v, medida.formato, { compacto: true })   // por tipo de medida do cubo: int | brl | pct | dec | seg
variacao(atual, anterior)           // fração ou null
```

## Dados — `@/lib/dados`

```ts
const { dados, carregando, erro } = useRelatorio('vendas')   // DadosRelatorio | null
const { dados: meta } = useMeta()                             // também: useCatalogo, useSaude, useSelos, useIncidentes,
                                                              // useLinhagem, usePipelines, useGlossario, useTabelaDetalhe(nome)
const x = await carregarJSON<T>('governanca/saude.json')      // cache em memória; caminho relativo a public/data
```

Arquivo ausente não quebra a tela: `dados` fica `null` e `erro.ausente === true` (mostre `EmptyState`).

## Cubos — `@/lib/cubo`

```ts
const f = useFiltrosResolvidos({ dimCanal: 'canal' })           // de @/lib/filtros
const cubo = dados.cubos.vendas
const linhas = useMemo(() => filtrar(cubo, f.filtrosCubo, f.meta), [cubo, f.filtrosCubo, f.meta])

totais(cubo, linhas, ['qtd', 'valor'])                          // { qtd, valor }
agrupar(cubo, linhas, ['segmento'], ['valor'])                  // [{ chave: ['Imóveis'], valores: { valor } }]
ordenarPor(grupos, 'valor')                                     // desc
serieTemporal(cubo, linhas, f.granularidade, ['valor'], f.periodo)          // { buckets, rotulos, valores: { valor: number[] } }
serieTemporalPor(cubo, linhas, f.granularidade, 'segmento', 'valor', f.periodo) // { buckets, rotulos, series: [{ nome, valores, total }] }
compararPeriodos(cubo, f.filtrosCubo, f.meta, ['valor'])        // { atual, anterior, variacao, periodoAnterior }
razao(tot.valor, tot.qtd)                                       // ticket médio (razões sempre no front)
```

- `filtrar` aplica as regras de `src/types/cubo.ts`: dimensão nativa; UF em cubo só com `regional` (pondera por `meta.pesos_uf`);
  cubo sem geografia (pondera por `meta.pesos_regional`); regional em cubo só com `uf`. Filtros extras: `{ dims: { faixa_atraso: [...] } }`.
- Medidas `estoque` nunca somam datas: vale a última fotografia do período (em `totais`/`agrupar`) ou de cada bucket (nas séries).
- O filtro de canal atua na dimensão informada em `useFiltrosResolvidos({ dimCanal })`: nos cubos atuais é `canal` (vendas),
  `canal_cobranca` (cobrança) e `canal_atendimento` (atendimento).
- Semanas começam na segunda; buckets sem dado entram com 0; cubos com dimensão `mes` sempre saem mensais.
- `compararPeriodos` usa o período imediatamente anterior com o mesmo número de dias (`variacao` é `null` sem base).

## Filtros — `@/lib/filtros`

Store `useFiltros` (zustand): `preset` (`30d | 90d | mes_atual | mes_anterior | ano_atual | 12m | tudo | personalizado`),
`personalizado`, `granularidade`, `segmentos`, `regionais`, `ufs`, `canais` + `definir*`, `aplicar(parcial)`, `limpar()`.
Padrão: últimos 12 meses, mês. `useFiltrosResolvidos()` devolve `{ periodo, dias, granularidade (efetiva), diaDesabilitado,
filtrosCubo, meta, limites, ativos, ... }`. "Dia" é desabilitado acima de 120 dias. A `BarraFiltros` sincroniza tudo na URL
(`#/relatorios/vendas?p=90d&g=semana&seg=Imóveis&reg=Sul&uf=PR&canal=Digital` ou `de=`/`ate=`).

## Página de relatório

```tsx
import { useRef } from 'react'
import { ChartCard, KpiCard } from '@/components/dados'
import { EChart, type EChartHandle } from '@/components/dados/EChart'
import { LayoutRelatorio } from '@/components/relatorio/LayoutRelatorio'
import { tooltipBR } from '@/lib/tema-echarts'

const ref = useRef<EChartHandle>(null)

<LayoutRelatorio relatorio="vendas" subtitulo="..." carregando={carregando} vazio={!dados}
  filtros={{ filtros: ['periodo', 'granularidade', 'segmento', 'regional', 'uf', 'canal'],
             canal: { rotulo: 'Canal de venda', opcoes: meta?.canais_venda ?? [] } }}>
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <KpiCard rotulo="Produção" valor={fmtCompacto(tot.valor, { moeda: true })} variacao={comp.variacao.valor}
             maiorE="melhor" sparkline={serie.valores.valor} definicao="Soma do valor de crédito das cotas vendidas." />
  </div>
  <ChartCard titulo="Produção por mês" subtitulo="R$" chartRef={ref}
             csv={{ nome: 'producao', colunas: ['Mês', 'Valor'], linhas: serie.buckets.map((b, i) => [b, serie.valores.valor[i]]) }}>
    <EChart ref={ref} altura={300} option={{
      tooltip: { trigger: 'axis', formatter: tooltipBR((v) => fmtCompacto(v, { moeda: true })) },
      xAxis: { type: 'category', data: serie.rotulos },
      yAxis: { type: 'value', axisLabel: { formatter: (v: number) => fmtCompacto(v) } },
      series: [{ type: 'bar', name: 'Produção', data: serie.valores.valor }],
    }} />
  </ChartCard>
</LayoutRelatorio>
```

- `LayoutRelatorio`: `relatorio` (id; liga o Selo de Confiança), `titulo?`, `subtitulo?`, `icone?`, `filtros?: BarraFiltrosProps | false`,
  `acoes?`, `carregando?`, `vazio?`, `mensagemVazio?`, `children`.
- `BarraFiltros`: `filtros?: ('periodo'|'granularidade'|'segmento'|'regional'|'uf'|'canal')[]`, `canal?: { rotulo?, opcoes }`,
  `segmentos?`, `extras?`.
- `KpiCard`: `rotulo`, `valor`, `variacao?` (fração), `variacaoTexto?` (ex.: "+0,4 p.p."), `maiorE?: 'melhor'|'pior'|'neutro'`,
  `comparacao?`, `sparkline?`, `definicao?`, `icone?`, `detalhe?`, `carregando?`, `onClick?`.
- `ChartCard`: `titulo`, `subtitulo?`, `csv?` (objeto ou função), `chartRef?` (PNG), `nomeArquivo?`, `telaCheia?`, `acoes?`,
  `carregando?`, `vazio?`, `mensagemVazio?`, `rodape?`, `alturaMinima?`.
- `EChart`: `option`, `altura?`, `onEvents?: { click: (params, instancia) => ... }`, `notMerge?`, `descricao?`, `ref` →
  `{ instancia(), png(), exportarPNG(nome) }`. Tema claro/escuro automático. Tipos extras: `echarts.use([...])` (exportado do módulo).
- `SeloConfianca relatorio="vendas"`, `StatusBadge status="amarelo" rotulo?`, `StatusDot status pulsar?`,
  `Sparkline dados`, `EmptyState titulo descricao icone acao`, `SkeletonKpi | SkeletonGrafico | SkeletonTabela | SkeletonRelatorio`,
  `TextoComTabelas texto` (nomes entre crases viram links para `/farol/<tabela>`).
- Páginas que não são relatório: `<Pagina titulo subtitulo icone acoes>` de `@/components/layout/Pagina`.

## Gráficos — `@/lib/tema-echarts`

Paleta de séries (6 matizes, ordem fixa, validada para daltonismo e contraste nas duas superfícies):
claro `#175B8C #22ABA8 #6F5FD0 #58A6E8 #B4589E #C2703D`; escuro `#4877D6 #17A596 #9466D9 #4A9BD2 #C4609F #C27A48`.
Mais de 6 categorias: agrupe o restante em "Outros" (`tokensGrafico(tema).outros`). Use `corDaSerie(indice, tema)` para a cor
seguir a entidade (não o ranking), `tokensGrafico(tema).sequencial` em heatmaps (um matiz, do verde-água ao marinho),
`tokensGrafico(tema).status` apenas para status. Um único eixo Y por gráfico. `exportarCSV(nome, colunas, linhas)` em `@/lib/exportar`.

## Conteúdo editável

`src/content/perfil.json` (links com `[PREENCHER...]` aparecem desabilitados com a dica "Link a definir"; `foto` vazio mostra o
monograma), `src/content/artigos.json` (com `link` real o card abre a publicação; sem link abre o texto em modal) e
`src/content/plano90.json` (fases, métricas, curva de projeção e lista de problemas usada enquanto não há `incidentes.json`).
