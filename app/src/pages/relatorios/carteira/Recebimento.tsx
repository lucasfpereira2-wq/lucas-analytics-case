import { useMemo, useRef } from 'react'
import { ChartCard } from '@/components/dados'
import { EChart, type EChartHandle, type EChartsOption } from '@/components/dados/EChart'
import type { Granularidade, SerieTemporal } from '@/lib/cubo'
import { fmtCompacto, fmtData, fmtMes, fmtPct } from '@/lib/formato'
import { useTema } from '@/lib/tema'
import { tokensGrafico } from '@/lib/tema-echarts'

/**
 * Previsto × recebido por bucket.
 * A análise de qualidade do dado (lançamentos duplicados, valor corrigido) fica na página "Impacto nos relatórios".
 */
export function Recebimento({ serie, granularidade }: { serie: SerieTemporal; granularidade: Granularidade }) {
  const ref = useRef<EChartHandle>(null)
  const tema = useTema((s) => s.tema)
  const previsto = serie.valores.valor_previsto ?? []
  const recebido = serie.valores.valor_recebido ?? []

  const option = useMemo<EChartsOption>(() => {
    const t = tokensGrafico(tema)
    const titulo = (b: string) => (b.length === 7 ? fmtMes(b) : granularidade === 'semana' ? `Semana de ${fmtData(b)}` : fmtData(b))
    return {
      legend: { data: ['Previsto', 'Recebido'] },
      grid: { left: 8, right: 16, top: 44, bottom: 6, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const i = (params as { dataIndex: number }[])[0]?.dataIndex ?? 0
          const linha = (cor: string | null, nome: string, valor: string) =>
            `<div style="display:flex;justify-content:space-between;gap:24px;line-height:1.7"><span style="opacity:.85">${cor ? `<span style="display:inline-block;width:9px;height:9px;border-radius:3px;background:${cor};margin-right:6px"></span>` : ''}${nome}</span><strong style="font-variant-numeric:tabular-nums">${valor}</strong></div>`
          return `<div style="min-width:220px"><div style="font-weight:600;margin-bottom:4px">${titulo(serie.buckets[i])}</div>
            ${linha(t.outros, 'Previsto', fmtCompacto(previsto[i], { moeda: true, casas: 2 }))}
            ${linha(t.series[0], 'Recebido', fmtCompacto(recebido[i], { moeda: true, casas: 2 }))}
            ${linha(null, 'Recebido / previsto', fmtPct(previsto[i] ? recebido[i] / previsto[i] : null))}</div>`
        },
      },
      xAxis: { type: 'category', data: serie.rotulos },
      yAxis: { type: 'value', axisLabel: { formatter: (v: number) => fmtCompacto(v, { moeda: true, casas: 0 }) } },
      series: [
        { type: 'bar', name: 'Previsto', data: previsto.map(Math.round), itemStyle: { color: t.outros, opacity: 0.45 }, barGap: '10%', barMaxWidth: 22 },
        { type: 'bar', name: 'Recebido', data: recebido.map(Math.round), itemStyle: { color: t.series[0], borderRadius: [4, 4, 0, 0] }, barMaxWidth: 22 },
      ],
    }
  }, [serie, previsto, recebido, tema, granularidade])

  return (
    <ChartCard
      titulo="O recebimento acompanha o previsto?"
      subtitulo="Valor previsto das parcelas a vencer e valor recebido em cada período."
      chartRef={ref}
      nomeArquivo="carteira-recebimento"
      vazio={!serie.buckets.length}
      csv={() => ({
        nome: 'carteira-recebimento',
        colunas: ['Período', 'Previsto (R$)', 'Recebido (R$)', 'Parcelas pagas'],
        linhas: serie.buckets.map((b, i) => [b, Math.round(previsto[i]), Math.round(recebido[i]), Math.round(serie.valores.parcelas_pagas?.[i] ?? 0)]),
      })}
    >
      <EChart ref={ref} altura={300} option={option} descricao="Recebimento previsto e realizado por período" />
    </ChartCard>
  )
}
