import { useMemo, useRef, type ReactNode } from 'react'
import { ChartCard } from '@/components/dados'
import { EChart, type EChartHandle, type EChartsOption } from '@/components/dados/EChart'
import { fmtMes, fmtNumero, fmtPct } from '@/lib/formato'
import { useTema } from '@/lib/tema'
import { tokensGrafico } from '@/lib/tema-echarts'
import { corNaRampa, textoSobre } from '../carteira/cores'
import { LegendaEscala } from '../carteira/ui'
import { denominador, numerador, parcial, ROTULO_INDICADOR, taxa, type Denominador, type Indicador, type ModeloSafras } from './dados'

/** Heatmap triangular safra × MOB: uma célula por par observado, com o % escrito e escala sequencial do tema. */
export function MatrizSafra({
  modelo,
  indicador,
  den,
  titulo,
  subtitulo,
  acoes,
  nomeArquivo,
  destacadas,
}: {
  modelo: ModeloSafras
  indicador: Indicador
  den: Denominador
  titulo: string
  subtitulo: ReactNode
  acoes?: ReactNode
  nomeArquivo: string
  /** safras em comparação (rótulo do eixo em destaque) */
  destacadas?: string[]
}) {
  const ref = useRef<EChartHandle>(null)
  const tema = useTema((s) => s.tema)
  const { safras, mobs } = modelo

  const { option, min, max } = useMemo(() => {
    const t = tokensGrafico(tema)
    const itens: { s: number; m: number; v: number }[] = []
    let min = Infinity
    let max = -Infinity
    safras.forEach((safra, s) => {
      for (const m of mobs) {
        const v = taxa(modelo.celula(safra, m), indicador, den)
        if (v == null) continue
        itens.push({ s, m, v })
        if (v < min) min = v
        if (v > max) max = v
      }
    })
    if (!itens.length) {
      min = 0
      max = 1
    }
    const amp = max - min || 1
    const sel = new Set(destacadas ?? [])
    const option: EChartsOption = {
      grid: { left: 8, right: 8, top: 40, bottom: 4, containLabel: true },
      tooltip: {
        trigger: 'item',
        formatter: (p: unknown) => {
          const v = (p as { value: number[] }).value
          const safra = safras[v[1]]
          const c = modelo.celula(safra, v[0])
          if (!c) return ''
          const linha = (nome: string, valor: string) => `<div style="display:flex;justify-content:space-between;gap:20px;line-height:1.7"><span style="opacity:.8">${nome}</span><strong style="font-variant-numeric:tabular-nums">${valor}</strong></div>`
          return `<div style="min-width:210px"><div style="font-weight:600">Safra ${fmtMes(safra)} · MOB ${v[0]}</div>
            <div style="opacity:.65;font-size:11px;margin-bottom:6px">${parcial(modelo, safra, v[0]) ? 'MOB parcial (posição mais recente)' : `${v[0]} ${v[0] === 1 ? 'mês' : 'meses'} depois da venda`}</div>
            ${linha(ROTULO_INDICADOR[indicador], fmtPct(v[2], 2, { fracao: false }))}
            ${linha('Cotas no indicador', fmtNumero(numerador(c, indicador)))}
            ${linha(indicador === 'cancel' || indicador === 'retencao' || den === 'base' ? 'Cotas da safra' : 'Cotas ativas', fmtNumero(denominador(c, indicador, den)))}</div>`
        },
      },
      xAxis: {
        type: 'category', position: 'top', data: mobs.map(String), name: 'MOB (meses desde a venda)', nameLocation: 'middle', nameGap: 24,
        nameTextStyle: { color: t.textoSecundario, fontSize: 11 }, axisLine: { show: false }, axisLabel: { color: t.textoSecundario, fontSize: 11, interval: 0, margin: 6 },
      },
      yAxis: {
        type: 'category', inverse: true, data: safras, axisLine: { show: false },
        axisLabel: { interval: 0, fontSize: 11, formatter: (v: string) => fmtMes(v), color: (v?: string | number) => (sel.size && !sel.has(String(v)) ? t.textoSecundario : t.texto), fontWeight: sel.size ? 600 : 500 },
      },
      visualMap: { show: false, min: 0, max: 1, dimension: 3, inRange: { color: t.sequencial } },
      series: [
        {
          type: 'heatmap', name: ROTULO_INDICADOR[indicador],
          data: itens.map(({ s, m, v }) => {
            const n = (v - min) / amp
            return { value: [m, s, +(v * 100).toFixed(2), n], label: { color: textoSobre(corNaRampa(n, t.sequencial)) } }
          }),
          label: {
            show: true, fontSize: 10,
            formatter: (p: { value: unknown }) => {
              const x = (p.value as number[])[2]
              return fmtNumero(x, x >= 99.95 ? 0 : 1)
            },
          },
          itemStyle: { borderColor: t.superficie, borderWidth: 1.5, borderRadius: 3 },
          emphasis: { itemStyle: { borderColor: t.texto, borderWidth: 1.5 } },
        },
      ],
    }
    return { option, min, max }
  }, [modelo, safras, mobs, indicador, den, tema, destacadas])

  const t = tokensGrafico(tema)
  return (
    <ChartCard
      titulo={titulo}
      subtitulo={subtitulo}
      acoes={acoes}
      chartRef={ref}
      nomeArquivo={nomeArquivo}
      vazio={!safras.length}
      csv={() => ({
        nome: nomeArquivo,
        colunas: ['Safra', ...mobs.map((m) => `MOB ${m} (%)`)],
        linhas: safras.map((s) => [s, ...mobs.map((m) => { const v = taxa(modelo.celula(s, m), indicador, den); return v == null ? '' : +(v * 100).toFixed(2) })]),
      })}
      rodape={
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
          <span>Valores em %. Células vazias: MOB ainda não observado. A última célula de cada safra é parcial.</span>
          <LegendaEscala className="ml-auto" cores={t.sequencial} minimo={fmtPct(min)} maximo={fmtPct(max)} />
        </div>
      }
    >
      <EChart ref={ref} altura={70 + Math.max(4, safras.length) * 25} option={option} descricao={`Matriz safra por MOB de ${ROTULO_INDICADOR[indicador]}`} />
    </ChartCard>
  )
}
