import { useMemo, useRef } from 'react'
import { ChartCard } from '@/components/dados'
import { EChart, type EChartHandle, type EChartsOption } from '@/components/dados/EChart'
import { filtrar, razao, serieTemporal } from '@/lib/cubo'
import type { FiltrosResolvidos } from '@/lib/filtros'
import { fmtBRL, fmtCompacto, fmtNumero, fmtPct, variacao } from '@/lib/formato'
import { useTema } from '@/lib/tema'
import { tokensGrafico } from '@/lib/tema-echarts'
import type { Cubo } from '@/types/cubo'
import { TrilhaDrill } from './Controles'
import { bucketParcial, eixoCompacto, indiceDoClique, intervaloDoBucket, NOME_GRANULARIDADE, proRata, rotuloLongo, tip, useDrill } from './comum'

interface Props {
  cubo: Cubo
  f: FiltrosResolvidos
  /** meta de crédito por mês (mês cheio), já com os filtros de segmento, geografia e canal */
  metaPorMes: Map<string, number>
}

/** Crédito (barras) e cotas (linha) em painéis alinhados, com meta mensal e drill-down mês → semana → dia. */
export function TendenciaVendas({ cubo, f, metaPorMes }: Props) {
  const ref = useRef<EChartHandle>(null)
  const tema = useTema((s) => s.tema)
  const drill = useDrill(f.periodo, f.granularidade)
  const g = drill.granularidade

  const d = useMemo(() => {
    const filtros = { ...f.filtrosCubo, inicio: drill.periodo.inicio, fim: drill.periodo.fim }
    const linhas = filtrar(cubo, filtros, f.meta)
    const s = serieTemporal(cubo, linhas, g, ['cotas_vendidas', 'credito_vendido'], drill.periodo)
    const credito = s.valores.credito_vendido
    const cotas = s.valores.cotas_vendidas
    const meta = s.buckets.map((b) => {
      const i = intervaloDoBucket(b, g, drill.periodo)
      return proRata(metaPorMes, i.inicio, i.fim)
    })
    const parcial = s.buckets.map((b) => bucketParcial(b, g, drill.periodo))
    const totalCredito = credito.reduce((a, v) => a + v, 0)
    return { ...s, credito, cotas, meta, parcial, totalCredito }
  }, [cubo, f.filtrosCubo, f.meta, drill.periodo, g, metaPorMes])

  const option = useMemo<EChartsOption>(() => {
    const t = tokensGrafico(tema)
    const mostrarMeta = g === 'mes'
    const esquerda = 74
    return {
      legend: { data: ['Crédito comercializado', ...(mostrarMeta ? ['Meta do mês'] : []), 'Cotas vendidas'] },
      axisPointer: { link: [{ xAxisIndex: 'all' }] },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const p = (Array.isArray(params) ? params[0] : params) as { dataIndex: number }
          const i = p.dataIndex
          const b = d.buckets[i]
          if (b === undefined) return ''
          const ating = razao(d.credito[i], d.meta[i])
          const ant = i > 0 ? variacao(d.credito[i], d.credito[i - 1]) : null
          return tip(
            rotuloLongo(b, g),
            [
              { rotulo: 'Crédito comercializado', valor: fmtBRL(d.credito[i], 0), cor: t.series[0], forte: true },
              { rotulo: 'Meta proporcional', valor: fmtBRL(d.meta[i], 0), cor: t.textoSecundario },
              { rotulo: 'Atingimento da meta', valor: fmtPct(ating) },
              { rotulo: 'Cotas vendidas', valor: fmtNumero(d.cotas[i]), cor: t.series[1] },
              { rotulo: 'Ticket médio', valor: fmtBRL(razao(d.credito[i], d.cotas[i]), 0) },
              { rotulo: 'Participação no período', valor: fmtPct(razao(d.credito[i], d.totalCredito)) },
              ant !== null && !d.parcial[i] && !d.parcial[i - 1] && { rotulo: `vs ${NOME_GRANULARIDADE[g]} anterior`, valor: fmtPct(ant, 1, { sinal: true }) },
            ],
            d.parcial[i] ? `Período parcial: dados de ${intervaloDoBucket(b, g, drill.periodo).inicio.slice(8, 10)}/${b.slice(5, 7)} até ${intervaloDoBucket(b, g, drill.periodo).fim.slice(8, 10)}/${intervaloDoBucket(b, g, drill.periodo).fim.slice(5, 7)}.` : undefined,
          )
        },
      },
      title: [
        { text: 'Crédito comercializado (R$)', left: 0, top: 30, textStyle: { fontSize: 11, fontWeight: 500, color: t.textoSecundario } },
        { text: 'Cotas vendidas', left: 0, top: '69%', textStyle: { fontSize: 11, fontWeight: 500, color: t.textoSecundario } },
      ],
      grid: [
        { left: esquerda, right: 16, top: 58, height: '46%' },
        { left: esquerda, right: 16, top: '76%', bottom: 28 },
      ],
      xAxis: [
        { type: 'category', gridIndex: 0, data: d.rotulos, axisLabel: { show: false } },
        { type: 'category', gridIndex: 1, data: d.rotulos, boundaryGap: true },
      ],
      yAxis: [
        { type: 'value', gridIndex: 0, splitNumber: 4, axisLabel: { formatter: (v: number) => eixoCompacto(v, true) } },
        { type: 'value', gridIndex: 1, splitNumber: 2, axisLabel: { formatter: (v: number) => eixoCompacto(v) } },
      ],
      series: [
        {
          name: 'Crédito comercializado',
          type: 'bar',
          xAxisIndex: 0,
          yAxisIndex: 0,
          cursor: drill.podeDescer ? 'pointer' : 'default',
          itemStyle: { color: t.series[0] },
          emphasis: { focus: 'none' },
          data: d.credito.map((v, i) => (d.parcial[i] ? { value: v, itemStyle: { color: t.series[0], opacity: 0.55 } } : v)),
        },
        ...(mostrarMeta
          ? [
              {
                name: 'Meta do mês',
                type: 'line' as const,
                step: 'middle' as const,
                xAxisIndex: 0,
                yAxisIndex: 0,
                symbol: 'none',
                silent: true,
                itemStyle: { color: t.textoSecundario },
                lineStyle: { color: t.textoSecundario, width: 1.5, type: [5, 4] as number[] },
                emphasis: { disabled: true },
                data: d.meta,
              },
            ]
          : []),
        {
          name: 'Cotas vendidas',
          type: 'line',
          xAxisIndex: 1,
          yAxisIndex: 1,
          showSymbol: d.buckets.length <= 31,
          symbolSize: 7,
          cursor: drill.podeDescer ? 'pointer' : 'default',
          itemStyle: { color: t.series[1], borderColor: t.superficie, borderWidth: 2 },
          lineStyle: { color: t.series[1], width: 2 },
          areaStyle: { color: t.series[1], opacity: 0.08 },
          emphasis: { focus: 'none' },
          data: d.cotas,
        },
      ],
    }
  }, [d, g, tema, drill.podeDescer, drill.periodo])

  const titulos: Record<string, string> = {
    mes: 'Quanto vendemos a cada mês e como ficamos em relação à meta?',
    semana: 'Como as vendas evoluíram semana a semana?',
    dia: 'Como as vendas evoluíram dia a dia?',
  }

  return (
    <ChartCard
      titulo={titulos[g]}
      subtitulo={`Crédito comercializado e cotas vendidas por ${NOME_GRANULARIDADE[g]} · ${fmtCompacto(d.totalCredito, { moeda: true })} no recorte`}
      chartRef={ref}
      nomeArquivo="vendas-tendencia"
      vazio={d.buckets.length === 0}
      csv={() => ({
        nome: 'vendas-tendencia',
        colunas: ['Período', 'Crédito comercializado (R$)', 'Meta proporcional (R$)', 'Atingimento (%)', 'Cotas vendidas', 'Ticket médio (R$)'],
        linhas: d.buckets.map((b, i) => [
          rotuloLongo(b, g),
          Math.round(d.credito[i]),
          Math.round(d.meta[i]),
          d.meta[i] ? Math.round((d.credito[i] / d.meta[i]) * 1000) / 10 : null,
          Math.round(d.cotas[i]),
          d.cotas[i] ? Math.round(d.credito[i] / d.cotas[i]) : null,
        ]),
      })}
      rodape={
        g === 'mes' && d.parcial.some(Boolean)
          ? 'Barras esmaecidas indicam mês parcial; a meta desses meses é proporcional aos dias corridos do período.'
          : undefined
      }
    >
      <TrilhaDrill drill={drill} />
      <div
        className={drill.podeDescer ? 'cursor-pointer' : undefined}
        onClick={(e) => {
          const i = indiceDoClique(e, ref.current?.instancia(), 2)
          if (i !== null && d.buckets[i]) drill.descer(d.buckets[i])
        }}
      >
        <EChart ref={ref} altura={400} option={option} descricao="Crédito comercializado e cotas vendidas ao longo do tempo" />
      </div>
    </ChartCard>
  )
}
