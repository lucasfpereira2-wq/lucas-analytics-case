import { useMemo, useRef } from 'react'
import { ChartCard } from '@/components/dados'
import { EChart, type EChartHandle } from '@/components/dados/EChart'
import { agrupar, filtrar, ordenarPor, serieTemporalPor } from '@/lib/cubo'
import type { FiltrosResolvidos } from '@/lib/filtros'
import { fmtMes, fmtNumero, fmtPct } from '@/lib/formato'
import { corDaSerie } from '@/lib/tema-echarts'
import type { Cubo } from '@/types/cubo'
import { BarrasH, type ItemBarra } from './Comuns'
import { DIM_CANAL, mesesDoPeriodo, opcao, pctCSV, tooltipHTML, useTokens, type LinhaTooltip } from './util'

const NOME_G = { mes: 'mês', semana: 'semana', dia: 'dia' } as const

/** Principais motivos de detração (cubo mensal) e CSAT por canal no tempo. */
export function BlocoSatisfacao({ detracao, csat, f }: { detracao: Cubo; csat: Cubo; f: FiltrosResolvidos }) {
  const refDet = useRef<EChartHandle>(null)
  const refCsat = useRef<EChartHandle>(null)
  const { tema, t } = useTokens()
  const meses = mesesDoPeriodo(f)
  const ordemCanais = useMemo(() => csat.dims.find((d) => d.nome === DIM_CANAL)?.valores ?? [], [csat])

  const motivos = useMemo(() => {
    const grupos = ordenarPor(agrupar(detracao, filtrar(detracao, f.filtrosCubo, f.meta), ['motivo_detracao'], ['detratores']), 'detratores')
    const total = grupos.reduce((s, g) => s + g.valores.detratores, 0)
    const itens: ItemBarra[] = grupos
      .filter((g) => g.valores.detratores > 0)
      .map((g) => ({
        nome: g.chave[0],
        valor: total ? g.valores.detratores / total : 0,
        cor: t.series[2],
        detalhes: [
          { nome: 'Participação', valor: fmtPct(total ? g.valores.detratores / total : 0), cor: t.series[2] },
          { nome: 'Detratores', valor: fmtNumero(g.valores.detratores) },
        ],
      }))
    return { itens, total, grupos }
  }, [detracao, f.filtrosCubo, f.meta, t])

  // por dia a amostra de respostas por canal é pequena demais (ruído): o CSAT desce no máximo até semana
  const g = f.granularidade === 'dia' ? 'semana' : f.granularidade
  const serie = useMemo(() => {
    const linhas = filtrar(csat, f.filtrosCubo, f.meta)
    const resp = serieTemporalPor(csat, linhas, g, DIM_CANAL, 'respostas', f.periodo)
    const sat = serieTemporalPor(csat, linhas, g, DIM_CANAL, 'satisfeitos', f.periodo)
    const series = resp.series.map((r) => {
      const s = sat.series.find((x) => x.nome === r.nome)
      return { nome: r.nome, respostas: r.valores, valores: r.valores.map((v, i) => (v > 0 && s ? s.valores[i] / v : null)) }
    })
    return { buckets: resp.buckets, rotulos: resp.rotulos, series }
  }, [csat, f.filtrosCubo, f.meta, g, f.periodo])

  const optionCsat = useMemo(() => {
    const validos = serie.series.flatMap((s) => s.valores).filter((v): v is number => v != null)
    const minimo = validos.length ? Math.max(0, Math.floor((Math.min(...validos) * 100 - 2) / 5) * 5) / 100 : 0
    return opcao({
      legend: { top: 0, left: 0 },
      grid: { left: 8, right: 16, top: 40, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        formatter: (params: { dataIndex: number; seriesIndex: number; seriesName: string; value: number | null; color: string }[]) => {
          if (!params.length) return ''
          const i = params[0].dataIndex
          const ls: LinhaTooltip[] = [...params]
            .sort((a, b) => (b.value ?? -1) - (a.value ?? -1))
            .map((p) => ({
              nome: p.seriesName,
              cor: p.color,
              valor: p.value == null ? 'sem respostas' : fmtPct(p.value),
              nota: p.value == null ? undefined : `${fmtNumero(serie.series[p.seriesIndex]?.respostas[i] ?? 0)} resp.`,
            }))
          return tooltipHTML(serie.rotulos[i] ?? '', ls)
        },
      },
      xAxis: { type: 'category', data: serie.rotulos, boundaryGap: false },
      yAxis: { type: 'value', min: minimo, max: 1, axisLabel: { formatter: (v: number) => fmtPct(v, 0) } },
      series: serie.series.map((s) => ({
        type: 'line',
        name: s.nome,
        data: s.valores,
        connectNulls: false,
        showSymbol: serie.buckets.length <= 14,
        symbolSize: 6,
        itemStyle: { color: corDaSerie(ordemCanais.indexOf(s.nome), tema) },
        lineStyle: { width: 2 },
      })),
    })
  }, [serie, ordemCanais, tema])

  const periodoMeses = meses.primeiro === meses.ultimo ? fmtMes(meses.primeiro) : `${fmtMes(meses.primeiro)} a ${fmtMes(meses.ultimo)}`

  return (
    <div className="grid gap-4 xl:grid-cols-5">
      <ChartCard
        className="xl:col-span-2"
        titulo="O que mais gera detratores?"
        subtitulo={`Principais motivos de detração · participação entre ${fmtNumero(motivos.total)} detratores · base mensal (${periodoMeses})`}
        chartRef={refDet}
        nomeArquivo="motivos-de-detracao"
        vazio={!motivos.itens.length}
        csv={() => ({
          nome: 'motivos-de-detracao',
          colunas: ['Motivo de detração', 'Detratores', 'Participação (%)'],
          linhas: motivos.grupos.map((g) => [g.chave[0], Math.round(g.valores.detratores), pctCSV(motivos.total ? g.valores.detratores / motivos.total : null)]),
        })}
        rodape="Motivo principal declarado pelo detrator. O cubo é mensal e não tem canal: o filtro de canal não se aplica aqui."
      >
        <BarrasH ref={refDet} itens={motivos.itens} fmt={(v) => fmtPct(v)} altura={290} descricao="Principais motivos de detração" />
      </ChartCard>
      <ChartCard
        className="xl:col-span-3"
        titulo="A satisfação com o atendimento se sustenta em todos os canais?"
        subtitulo={`CSAT por canal (% de notas 4 e 5), por ${NOME_G[g]}${f.granularidade === 'dia' ? ' · a amostra diária por canal é pequena demais para leitura' : ''}`}
        chartRef={refCsat}
        nomeArquivo="csat-por-canal"
        vazio={!serie.series.length}
        csv={() => ({
          nome: 'csat-por-canal',
          colunas: ['Período', ...serie.series.map((s) => `${s.nome} (%)`)],
          linhas: serie.buckets.map((b, i) => [b, ...serie.series.map((s) => pctCSV(s.valores[i]))]),
        })}
      >
        <EChart ref={refCsat} option={optionCsat} altura={290} descricao="CSAT por canal ao longo do tempo" />
      </ChartCard>
    </div>
  )
}
