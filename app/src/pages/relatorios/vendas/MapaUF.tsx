import { useMemo, useRef } from 'react'
import { ChartCard } from '@/components/dados'
import { EChart, type EChartHandle, type EChartsOption } from '@/components/dados/EChart'
import { agrupar, filtrar, razao } from '@/lib/cubo'
import { useFiltros, type FiltrosResolvidos } from '@/lib/filtros'
import { fmtBRL, fmtCompacto, fmtNumero, fmtPct } from '@/lib/formato'
import { useTema } from '@/lib/tema'
import { tokensGrafico } from '@/lib/tema-echarts'
import type { Cubo } from '@/types/cubo'
import { DicaFiltro } from './Controles'
import { alternarFiltro, corNaRampa, luminancia, tip } from './comum'

/** Cartograma em grade: posição [coluna, linha] de cada UF (aproxima a geografia, todas com a mesma área). */
const GRADE: Record<string, [number, number]> = {
  RR: [2, 0], AP: [3, 0],
  AM: [1, 1], PA: [2, 1], MA: [3, 1], CE: [4, 1], RN: [5, 1],
  AC: [0, 2], RO: [1, 2], TO: [2, 2], PI: [3, 2], PE: [4, 2], PB: [5, 2],
  MT: [1, 3], GO: [2, 3], BA: [3, 3], SE: [4, 3], AL: [5, 3],
  MS: [1, 4], DF: [2, 4], MG: [3, 4], ES: [4, 4],
  SP: [2, 5], RJ: [3, 5],
  PR: [2, 6], SC: [3, 6],
  RS: [2, 7],
}
const COLUNAS = 6
const LINHAS = 8

interface LinhaUF {
  uf: string
  nome: string
  regional: string
  credito: number
  cotas: number
  part: number | null
  posicao: number
}

const nomeDe = (p: unknown) => (p as { name?: string }).name ?? ''

export function MapaVendas({ f, cubo }: { f: FiltrosResolvidos; cubo: Cubo }) {
  const refMapa = useRef<EChartHandle>(null)
  const refRanking = useRef<EChartHandle>(null)
  const tema = useTema((s) => s.tema)

  const d = useMemo(() => {
    const semGeo = { ...f.filtrosCubo, regionais: [], ufs: [] }
    const grupos = agrupar(cubo, filtrar(cubo, semGeo, f.meta), ['uf'], ['credito_vendido', 'cotas_vendidas'])
    const porUf = new Map(grupos.map((g) => [g.chave[0], g.valores]))
    const total = grupos.reduce((a, g) => a + g.valores.credito_vendido, 0)
    const ufs: LinhaUF[] = (f.meta?.ufs ?? []).map((u) => {
      const v = porUf.get(u.sigla)
      const credito = v?.credito_vendido ?? 0
      return { uf: u.sigla, nome: u.nome, regional: u.regional, credito, cotas: v?.cotas_vendidas ?? 0, part: razao(credito, total), posicao: 0 }
    })
    const ranking = [...ufs].sort((a, b) => b.credito - a.credito)
    ranking.forEach((u, i) => (u.posicao = i + 1))
    const maximo = ranking[0]?.credito ?? 0
    return { ufs, ranking, total, maximo }
  }, [cubo, f.filtrosCubo, f.meta])

  const ativa = useMemo(() => {
    if (f.ufs.length) return (u: LinhaUF) => f.ufs.includes(u.uf)
    if (f.regionais.length) return (u: LinhaUF) => f.regionais.includes(u.regional)
    return () => true
  }, [f.ufs, f.regionais])

  const linhasTip = (u: LinhaUF, cor?: string) =>
    tip(
      `${u.nome} (${u.uf})`,
      [
        { rotulo: 'Crédito comercializado', valor: fmtBRL(u.credito, 0), cor, forte: true },
        { rotulo: 'Cotas vendidas', valor: fmtNumero(u.cotas) },
        { rotulo: 'Ticket médio', valor: fmtBRL(razao(u.credito, u.cotas), 0) },
        { rotulo: 'Participação no total', valor: fmtPct(u.part) },
        { rotulo: 'Posição no ranking', valor: `${u.posicao}º de ${d.ufs.length}` },
      ],
      `Regional ${u.regional}`,
    )

  const t = tokensGrafico(tema)
  const corDe = (u: LinhaUF) => corNaRampa(t.sequencial, d.maximo ? Math.sqrt(u.credito / d.maximo) : 0)

  const optMapa = useMemo<EChartsOption>(() => {
    const porNome = new Map(d.ufs.map((u) => [u.uf, u]))
    return {
      tooltip: {
        trigger: 'item',
        formatter: (p: unknown) => {
          const u = porNome.get(nomeDe(p))
          return u ? linhasTip(u, corDe(u)) : ''
        },
      },
      series: [
        {
          type: 'custom',
          coordinateSystem: 'none',
          name: 'UF',
          data: d.ufs.filter((u) => GRADE[u.uf]).map((u) => ({ name: u.uf, value: [GRADE[u.uf][0], GRADE[u.uf][1], u.credito] })),
          renderItem: ((params: { dataIndex: number }, api: { value: (i: number) => number; getWidth: () => number; getHeight: () => number }) => {
            const u = d.ufs.filter((x) => GRADE[x.uf])[params.dataIndex]
            const L = api.getWidth()
            const A = api.getHeight()
            const lado = Math.floor(Math.min((L - 8) / COLUNAS, (A - 8) / LINHAS))
            const x0 = (L - lado * COLUNAS) / 2
            const y0 = (A - lado * LINHAS) / 2
            const folga = 2
            const x = x0 + api.value(0) * lado + folga
            const y = y0 + api.value(1) * lado + folga
            const tam = lado - folga * 2
            const cor = corDe(u)
            const claro = luminancia(cor) > 0.55
            const tinta = claro ? '#0B2239' : '#FFFFFF'
            const selecionada = f.ufs.includes(u.uf)
            const opacidade = ativa(u) ? 1 : 0.25
            return {
              type: 'group',
              children: [
                {
                  type: 'rect',
                  shape: { x, y, width: tam, height: tam, r: 6 },
                  style: { fill: cor, opacity: opacidade, stroke: selecionada ? t.texto : 'transparent', lineWidth: selecionada ? 2 : 0 },
                  emphasis: { style: { stroke: t.texto, lineWidth: 2 } },
                },
                {
                  type: 'text',
                  silent: true,
                  style: { x: x + tam / 2, y: y + tam / 2 - (tam >= 40 ? 6 : 0), text: u.uf, align: 'center', verticalAlign: 'middle', fill: tinta, opacity: opacidade, font: `600 ${tam >= 40 ? 13 : 11}px 'Inter Variable', sans-serif` },
                },
                ...(tam >= 40
                  ? [
                      {
                        type: 'text',
                        silent: true,
                        style: { x: x + tam / 2, y: y + tam / 2 + 9, text: fmtCompacto(u.credito, { casas: u.credito >= 1e8 ? 0 : 1 }), align: 'center', verticalAlign: 'middle', fill: tinta, opacity: opacidade * 0.85, font: `500 10px 'Inter Variable', sans-serif` },
                      },
                    ]
                  : []),
              ],
            }
          }) as never,
        },
      ],
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, tema, f.ufs, ativa])

  const TOP = 12
  const optRanking = useMemo<EChartsOption>(() => {
    const top = d.ranking.slice(0, TOP)
    return {
      grid: { left: 8, right: 116, top: 4, bottom: 0, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const u = top.find((x) => x.uf === nomeDe(Array.isArray(params) ? params[0] : params))
          return u ? linhasTip(u, t.series[0]) : ''
        },
      },
      xAxis: { type: 'value', show: false },
      yAxis: { type: 'category', inverse: true, data: top.map((u) => u.uf), axisLine: { show: false }, axisLabel: { color: t.texto, fontSize: 12, fontWeight: 600 } },
      series: [
        {
          type: 'bar',
          name: 'Crédito comercializado',
          barWidth: 16,
          itemStyle: { color: t.series[0], borderRadius: [0, 4, 4, 0] },
          label: {
            show: true,
            position: 'right',
            distance: 8,
            formatter: (p: unknown) => {
              const u = top[(p as { dataIndex: number }).dataIndex]
              return `{v|${fmtCompacto(u.credito, { moeda: true })}}  {p|${fmtPct(u.part)}}`
            },
            rich: { v: { color: t.texto, fontSize: 12, fontWeight: 600 }, p: { color: t.textoSecundario, fontSize: 11 } },
          },
          data: top.map((u) => ({ value: u.credito, itemStyle: { opacity: ativa(u) ? 1 : 0.28 } })),
        },
      ],
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, tema, ativa])

  const csv = () => ({
    nome: 'vendas-por-uf',
    colunas: ['Posição', 'UF', 'Estado', 'Regional', 'Crédito comercializado (R$)', 'Cotas vendidas', 'Ticket médio (R$)', 'Participação (%)'],
    linhas: d.ranking.map((u) => [u.posicao, u.uf, u.nome, u.regional, Math.round(u.credito), Math.round(u.cotas), u.cotas ? Math.round(u.credito / u.cotas) : null, u.part === null ? null : Math.round(u.part * 1000) / 10]),
  })
  const top3 = d.ranking.slice(0, 3).reduce((a, u) => a + (u.part ?? 0), 0)

  return (
    <div className="grid gap-4 xl:grid-cols-5">
      <ChartCard
        className="xl:col-span-3"
        titulo="Onde está concentrada a produção no país?"
        subtitulo="Crédito comercializado por UF em cartograma: cada estado ocupa a mesma área e a cor indica o volume"
        chartRef={refMapa}
        nomeArquivo="vendas-mapa-uf"
        vazio={d.total === 0}
        csv={csv}
        rodape={<DicaFiltro texto="Clique em um estado para filtrar a UF." ativos={f.ufs} aoLimpar={() => useFiltros.getState().definirUfs([])} />}
      >
        <EChart ref={refMapa} altura={440} option={optMapa} descricao="Cartograma do crédito comercializado por UF" onEvents={{ click: (p) => nomeDe(p) && alternarFiltro('uf', nomeDe(p), f.meta) }} />
        <div className="mt-1 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <span>Menor volume</span>
          <span className="h-2 w-40 rounded-full" style={{ background: `linear-gradient(to right, ${t.sequencial.join(', ')})` }} aria-hidden />
          <span>Maior volume</span>
        </div>
      </ChartCard>
      <ChartCard
        className="xl:col-span-2"
        titulo="Quais estados lideram as vendas?"
        subtitulo={`${TOP} maiores de ${d.ufs.length} UFs · as 3 primeiras somam ${fmtPct(top3)} do crédito`}
        chartRef={refRanking}
        nomeArquivo="vendas-ranking-uf"
        vazio={d.total === 0}
        csv={csv}
      >
        <EChart ref={refRanking} altura={464} option={optRanking} descricao="Ranking das UFs por crédito comercializado" onEvents={{ click: (p) => nomeDe(p) && alternarFiltro('uf', nomeDe(p), f.meta) }} />
      </ChartCard>
    </div>
  )
}
