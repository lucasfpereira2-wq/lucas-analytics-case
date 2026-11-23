import { useMemo, useRef } from 'react'
import { ChartCard } from '@/components/dados'
import { EChart, type EChartHandle, type EChartsOption } from '@/components/dados/EChart'
import { fmtNumero, fmtPct } from '@/lib/formato'
import { useTema } from '@/lib/tema'
import { tokensGrafico } from '@/lib/tema-echarts'
import { taxa, type Celula } from './dados'

const SERIES = [
  { ind: 'over30', nome: 'Over 30', cor: 0 },
  { ind: 'over90', nome: 'Over 90', cor: 2 },
  { ind: 'cancel', nome: 'Cancelamento acumulado', cor: 3 },
] as const

/** Barras de over 30, over 90 e cancelamento em um MOB fixo, por uma dimensão (segmento ou canal de venda). */
export function QuebraRisco({
  titulo,
  dimensao,
  mob,
  dados,
  selecionados,
  onAlternar,
  nomeArquivo,
}: {
  titulo: string
  dimensao: string
  mob: number
  dados: { nome: string; c: Celula }[]
  selecionados: string[]
  onAlternar: (nome: string) => void
  nomeArquivo: string
}) {
  const ref = useRef<EChartHandle>(null)
  const tema = useTema((s) => s.tema)
  const option = useMemo<EChartsOption>(() => {
    const t = tokensGrafico(tema)
    return {
      legend: { data: SERIES.map((s) => s.nome) },
      grid: { left: 8, right: 16, top: 44, bottom: 4, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const i = (params as { dataIndex: number }[])[0]?.dataIndex ?? 0
          const d = dados[i]
          if (!d) return ''
          return `<div style="min-width:230px"><div style="font-weight:600">${d.nome} · MOB ${mob}</div><div style="opacity:.65;font-size:11px;margin-bottom:6px">${fmtNumero(d.c.base)} cotas de safras que já chegaram ao MOB ${mob}</div>
            ${SERIES.map((s) => `<div style="display:flex;justify-content:space-between;gap:20px;line-height:1.7"><span style="opacity:.85"><span style="display:inline-block;width:9px;height:9px;border-radius:3px;background:${t.series[s.cor]};margin-right:6px"></span>${s.nome}</span><span style="font-variant-numeric:tabular-nums"><strong>${fmtPct(taxa(d.c, s.ind), 2)}</strong> <span style="opacity:.6">${fmtNumero(s.ind === 'cancel' ? d.c.cancel : d.c[s.ind])} cotas</span></span></div>`).join('')}
            <div style="opacity:.6;font-size:11px;margin-top:6px">Clique para filtrar o relatório</div></div>`
        },
      },
      xAxis: { type: 'category', data: dados.map((d) => d.nome), axisLabel: { interval: 0, color: (v?: string | number) => (selecionados.length && !selecionados.includes(String(v)) ? t.textoSecundario : t.texto), fontSize: 12 } },
      yAxis: { type: 'value', axisLabel: { formatter: (v: number) => fmtPct(v, 0, { fracao: false }) } },
      series: SERIES.map((s) => ({
        type: 'bar' as const, name: s.nome, color: t.series[s.cor], barMaxWidth: 26, barGap: '12%', cursor: 'pointer',
        data: dados.map((d) => ({ value: +((taxa(d.c, s.ind) ?? 0) * 100).toFixed(3), itemStyle: { opacity: selecionados.length && !selecionados.includes(d.nome) ? 0.4 : 1 } })),
        label: { show: true, position: 'top' as const, fontSize: 11, color: t.texto, formatter: (p: { value: unknown }) => fmtNumero(p.value as number, 1) },
        emphasis: { focus: 'none' as const },
      })),
    }
  }, [dados, mob, selecionados, tema])

  return (
    <ChartCard
      titulo={titulo}
      subtitulo={`Over 30, over 90 e cancelamento acumulado no MOB ${mob}, em % das cotas da safra. Clique em uma barra para filtrar.`}
      chartRef={ref}
      nomeArquivo={nomeArquivo}
      vazio={!dados.length}
      mensagemVazio={`Nenhuma safra do filtro chegou ao MOB ${mob}.`}
      csv={{
        nome: nomeArquivo,
        colunas: [dimensao, 'MOB', 'Cotas da safra', 'Over 30 (%)', 'Over 90 (%)', 'Cancelamento acumulado (%)'],
        linhas: dados.map((d) => [d.nome, mob, Math.round(d.c.base), ...SERIES.map((s) => +((taxa(d.c, s.ind) ?? 0) * 100).toFixed(2))]),
      }}
    >
      <EChart ref={ref} altura={280} option={option} descricao={`${titulo} no MOB ${mob}`} onEvents={{ click: (p) => onAlternar((p as { name: string }).name) }} />
    </ChartCard>
  )
}
