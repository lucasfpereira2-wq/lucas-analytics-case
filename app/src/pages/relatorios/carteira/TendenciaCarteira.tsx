import { ChevronRight, MousePointerClick } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChartCard } from '@/components/dados'
import { EChart, type EChartHandle, type EChartsOption } from '@/components/dados/EChart'
import { filtrar, somarDias, type FiltrosCubo, type Granularidade, type MetaCubo } from '@/lib/cubo'
import { fmtCompacto, fmtData, fmtMes, fmtNumero, fmtPct } from '@/lib/formato'
import { useTema } from '@/lib/tema'
import { tokensGrafico } from '@/lib/tema-echarts'
import type { Cubo } from '@/types/cubo'
import { coresFaixas } from './cores'
import { FAIXAS_ATRASO, fimDoMes, serieEstoque } from './dados'

interface Foco {
  inicio: string
  fim: string
  g: Granularidade
  rotulo: string
}

const NOME_G: Record<Granularidade, string> = { mes: 'mês', semana: 'semana', dia: 'dia' }

/**
 * Tendência da carteira: saldo em atraso por faixa (área empilhada) e, em painel próprio com o mesmo eixo de tempo,
 * o % over 30 e over 90. Um eixo Y por painel (nunca dois eixos no mesmo gráfico).
 * Drill-down por clique: mês → semanas do mês → dias da semana (onde houver fotografia).
 */
export function TendenciaCarteira({
  cubo,
  filtrosBase,
  meta,
  periodo,
  granularidade,
}: {
  cubo: Cubo
  /** filtros de segmento/regional/UF (sem período) */
  filtrosBase: FiltrosCubo
  meta: MetaCubo | null
  periodo: { inicio: string; fim: string }
  granularidade: Granularidade
}) {
  const ref = useRef<EChartHandle>(null)
  const tema = useTema((s) => s.tema)
  const [trilha, setTrilha] = useState<Foco[]>([])
  // mudou o período ou a granularidade global: volta ao nível inicial
  useEffect(() => setTrilha([]), [periodo.inicio, periodo.fim, granularidade])

  const foco = trilha[trilha.length - 1]
  const g = foco?.g ?? granularidade
  const ini = foco?.inicio ?? periodo.inicio
  const fim = foco?.fim ?? periodo.fim

  const serie = useMemo(() => {
    const linhas = filtrar(cubo, { ...filtrosBase, inicio: ini, fim }, meta)
    return serieEstoque(cubo, linhas, g)
  }, [cubo, filtrosBase, meta, ini, fim, g])

  const descer = (i: number) => {
    const b = serie.buckets[i]
    if (!b || g === 'dia') return
    const max = (a: string, c: string) => (a > c ? a : c)
    const min = (a: string, c: string) => (a < c ? a : c)
    if (g === 'mes') {
      setTrilha((t) => [...t, { inicio: max(`${b}-01`, periodo.inicio), fim: min(fimDoMes(b), periodo.fim), g: 'semana', rotulo: fmtMes(b) }])
    } else {
      setTrilha((t) => [...t, { inicio: max(b, ini), fim: min(somarDias(b, 6), fim), g: 'dia', rotulo: `semana de ${fmtData(b).slice(0, 5)}` }])
    }
  }

  const option = useMemo<EChartsOption>(() => {
    const t = tokensGrafico(tema)
    const cores = coresFaixas(tema)
    const n = serie.buckets.length
    const poucos = n <= 8
    const pct = (v: number | null) => (v == null ? null : +(v * 100).toFixed(3))
    return {
      legend: { data: ['% over 30', '% over 90', ...FAIXAS_ATRASO.map((f) => `Atraso ${f}`)] },
      axisPointer: { link: [{ xAxisIndex: 'all' }] },
      tooltip: {
        trigger: 'axis',
        formatter: (params: unknown) => {
          const lista = params as { dataIndex: number }[]
          const i = lista[0]?.dataIndex ?? 0
          const p = serie.posicoes[i]
          if (!p) return ''
          const linha = (cor: string, nome: string, valor: string) =>
            `<div style="display:flex;justify-content:space-between;gap:24px;line-height:1.7"><span style="opacity:.85"><span style="display:inline-block;width:9px;height:9px;border-radius:3px;background:${cor};margin-right:6px"></span>${nome}</span><strong style="font-variant-numeric:tabular-nums">${valor}</strong></div>`
          return `<div style="min-width:220px"><div style="font-weight:600">${g === 'mes' ? fmtMes(serie.buckets[i]) : g === 'semana' ? `Semana de ${fmtData(serie.buckets[i])}` : fmtData(serie.datas[i])}</div>
            <div style="opacity:.65;font-size:11px;margin-bottom:6px">Fotografia de ${fmtData(serie.datas[i])}</div>
            ${linha(t.series[0], '% over 30', fmtPct(p.over30, 2))}
            ${linha(t.series[2], '% over 90', fmtPct(p.over90, 2))}
            <div style="border-top:1px solid rgba(128,150,170,.3);margin:5px 0"></div>
            ${FAIXAS_ATRASO.map((f) => linha(cores[f], `Atraso ${f} dias`, `${fmtCompacto(p.porFaixa[f]?.saldo ?? 0, { moeda: true })} · ${fmtNumero(p.porFaixa[f]?.cotas ?? 0)} cotas`)).join('')}
            <div style="border-top:1px solid rgba(128,150,170,.3);margin:5px 0"></div>
            <div style="display:flex;justify-content:space-between;gap:24px"><span style="opacity:.85">Carteira ativa</span><strong>${fmtCompacto(p.saldo, { moeda: true })}</strong></div>
            ${g === 'dia' ? '' : `<div style="opacity:.6;font-size:11px;margin-top:6px">Clique para abrir ${g === 'mes' ? 'as semanas' : 'os dias'}</div>`}</div>`
        },
      },
      grid: [
        { left: 8, right: 16, top: 44, height: 92, containLabel: true },
        { left: 8, right: 16, top: 176, bottom: 6, containLabel: true },
      ],
      xAxis: [
        { type: 'category', gridIndex: 0, data: serie.rotulos, boundaryGap: true, axisLabel: { show: false } },
        { type: 'category', gridIndex: 1, data: serie.rotulos, boundaryGap: true },
      ],
      yAxis: [
        { type: 'value', gridIndex: 0, scale: true, splitNumber: 2, axisLabel: { formatter: (v: number) => fmtPct(v, 1, { fracao: false }), width: 52, align: 'right' } },
        { type: 'value', gridIndex: 1, axisLabel: { formatter: (v: number) => fmtCompacto(v, { moeda: true, casas: 0 }), width: 52, align: 'right' } },
      ],
      series: [
        {
          type: 'line', name: '% over 30', xAxisIndex: 0, yAxisIndex: 0, data: serie.posicoes.map((p) => pct(p.over30)),
          color: t.series[0], showSymbol: poucos, symbolSize: 7,
          endLabel: { show: n > 1, formatter: (p: { value: unknown }) => fmtPct(p.value as number, 2, { fracao: false }), color: t.texto, fontWeight: 600, fontSize: 11, distance: 6 },
        },
        {
          type: 'line', name: '% over 90', xAxisIndex: 0, yAxisIndex: 0, data: serie.posicoes.map((p) => pct(p.over90)),
          color: t.series[2], showSymbol: poucos, symbolSize: 7, lineStyle: { width: 2, type: [5, 4] },
          endLabel: { show: n > 1, formatter: (p: { value: unknown }) => fmtPct(p.value as number, 2, { fracao: false }), color: t.texto, fontWeight: 600, fontSize: 11, distance: 6 },
        },
        ...FAIXAS_ATRASO.map((f) => ({
          type: 'line' as const, name: `Atraso ${f}`, xAxisIndex: 1, yAxisIndex: 1, stack: 'atraso', data: serie.posicoes.map((p) => Math.round(p.porFaixa[f]?.saldo ?? 0)),
          color: cores[f], showSymbol: poucos, symbolSize: 6, lineStyle: { width: 1.5, color: t.superficie },
          areaStyle: { opacity: 1, color: cores[f] }, emphasis: { focus: 'none' as const },
          itemStyle: { color: cores[f], borderColor: t.superficie, borderWidth: 1.5 },
        })),
        // camada invisível para capturar o clique do drill-down em qualquer ponto da coluna
        {
          type: 'bar', name: '_alvo', xAxisIndex: 1, yAxisIndex: 1, barWidth: '100%', barMaxWidth: 4000, barGap: '-100%', z: 10, cursor: g === 'dia' ? 'default' : 'pointer',
          data: serie.posicoes.map((p) => Math.round(p.saldoAtrasado)), itemStyle: { color: 'rgba(0,0,0,0)', borderRadius: 0 },
          emphasis: { itemStyle: { color: tema === 'escuro' ? 'rgba(255,255,255,.06)' : 'rgba(0,32,58,.05)' } }, tooltip: { show: false },
        },
      ],
    }
  }, [serie, tema, g])

  const vazio = serie.buckets.length === 0
  return (
    <ChartCard
      titulo="A inadimplência está subindo ou cedendo?"
      subtitulo={
        <>
          % do saldo em atraso acima de 30 e de 90 dias (painel superior) e saldo devedor por faixa de atraso (painel inferior). Estoque: vale a última
          fotografia de cada {NOME_G[g]}.
        </>
      }
      chartRef={ref}
      nomeArquivo="carteira-tendencia-inadimplencia"
      vazio={vazio}
      mensagemVazio="Não há fotografia da carteira neste recorte. As fotografias existem aos domingos, nos fins de mês e em todos os dias dos últimos 35 dias."
      csv={() => ({
        nome: 'carteira-tendencia-inadimplencia',
        colunas: ['Bucket', 'Data da fotografia', 'Carteira ativa (R$)', 'Over 30 (%)', 'Over 90 (%)', ...FAIXAS_ATRASO.map((f) => `Saldo ${f} (R$)`)],
        linhas: serie.buckets.map((b, i) => {
          const p = serie.posicoes[i]
          return [b, serie.datas[i], Math.round(p.saldo), p.over30 == null ? '' : +(p.over30 * 100).toFixed(3), p.over90 == null ? '' : +(p.over90 * 100).toFixed(3), ...FAIXAS_ATRASO.map((f) => Math.round(p.porFaixa[f]?.saldo ?? 0))]
        }),
      })}
      rodape={
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <button type="button" onClick={() => setTrilha([])} disabled={!trilha.length} className="font-medium text-foreground enabled:hover:text-primary disabled:cursor-default">
            Período filtrado
          </button>
          {trilha.map((f, i) => (
            <span key={`${f.inicio}-${f.g}`} className="inline-flex items-center gap-1.5">
              <ChevronRight className="size-3.5" aria-hidden />
              <button type="button" onClick={() => setTrilha((t) => t.slice(0, i + 1))} disabled={i === trilha.length - 1} className="font-medium text-foreground enabled:hover:text-primary disabled:cursor-default">
                {f.rotulo}
              </button>
            </span>
          ))}
          <span className="ml-auto inline-flex items-center gap-1.5">
            <MousePointerClick className="size-3.5" aria-hidden />
            {g === 'dia' ? 'Nível diário: último nível do detalhamento.' : `Visão por ${NOME_G[g]}. Clique em uma coluna para abrir ${g === 'mes' ? 'as semanas do mês' : 'os dias da semana'}.`}
          </span>
        </div>
      }
    >
      <EChart
        ref={ref}
        altura={430}
        option={option}
        descricao="Evolução do percentual over 30 e over 90 e do saldo em atraso por faixa"
        onEvents={{
          click: (p) => {
            const e = p as { seriesName?: string; dataIndex?: number }
            if (typeof e.dataIndex === 'number') descer(e.dataIndex)
          },
        }}
      />
    </ChartCard>
  )
}
