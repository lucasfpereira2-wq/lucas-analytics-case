/**
 * Tema ECharts do Hub (claro e escuro). Paleta de séries validada com o validador da skill dataviz
 * (banda de luminosidade, croma, separação para daltonismo e contraste), nas duas superfícies.
 * Regras: verde/amarelo/vermelho são EXCLUSIVOS de status; no máximo 6 séries (o resto vira "Outros");
 * a cor segue a entidade (use corDaSerie com índice fixo), nunca o ranking; um único eixo Y por gráfico.
 */
import type { Tema } from './tema'

export const SERIES_CLARO = ['#175B8C', '#22ABA8', '#6F5FD0', '#58A6E8', '#B4589E', '#C2703D']
export const SERIES_ESCURO = ['#4877D6', '#17A596', '#9466D9', '#4A9BD2', '#C4609F', '#C27A48']
export const COR_OUTROS = { claro: '#8A9BB0', escuro: '#6F859B' }

/** Sequencial de uma matiz (heatmaps e mapas): do verde-água claro ao marinho. */
export const SEQUENCIAL_CLARO = ['#eceffe', '#B5E2E0', '#7CCBC9', '#7b8cff', '#1A8F9A', '#14697F', '#0E3A5C', '#00203A']
/** No escuro a rampa inverte: valores altos ficam mais claros (saltam da superfície). */
export const SEQUENCIAL_ESCURO = ['#0B2D49', '#0E3F5E', '#125872', '#167585', '#1C9496', '#7b8cff', '#7CD6D3', '#C8F0EE']

export const STATUS_CORES = {
  claro: { verde: '#2FA84F', amarelo: '#E0A100', vermelho: '#D64545' },
  escuro: { verde: '#3CBF62', amarelo: '#F0B429', vermelho: '#EF6461' },
}

export interface TokensGrafico {
  series: string[]
  outros: string
  sequencial: string[]
  status: { verde: string; amarelo: string; vermelho: string }
  superficie: string
  texto: string
  textoSecundario: string
  grade: string
  eixo: string
  destaque: string
}

export function tokensGrafico(tema: Tema): TokensGrafico {
  return tema === 'escuro'
    ? {
        series: SERIES_ESCURO,
        outros: COR_OUTROS.escuro,
        sequencial: SEQUENCIAL_ESCURO,
        status: STATUS_CORES.escuro,
        superficie: '#06243F',
        texto: '#E6EEF5',
        textoSecundario: '#8FA5BA',
        grade: '#123552',
        eixo: '#1F4A6C',
        destaque: '#7b8cff',
      }
    : {
        series: SERIES_CLARO,
        outros: COR_OUTROS.claro,
        sequencial: SEQUENCIAL_CLARO,
        status: STATUS_CORES.claro,
        superficie: '#FFFFFF',
        texto: '#0B2239',
        textoSecundario: '#5A6B7D',
        grade: '#EDF1F5',
        eixo: '#D5DEE7',
        destaque: '#4c5fd5',
      }
}

/** Cor da série pelo índice fixo da entidade (0..5). Índices além disso recebem a cor de "Outros". */
export function corDaSerie(indice: number, tema: Tema): string {
  const t = tokensGrafico(tema)
  return t.series[indice] ?? t.outros
}

const FONTE = "'Inter Variable', ui-sans-serif, system-ui, sans-serif"

/** Objeto de tema registrado no ECharts (echarts.registerTheme). */
export function temaECharts(tema: Tema): Record<string, unknown> {
  const t = tokensGrafico(tema)
  const eixoCategoria = {
    axisLine: { show: true, lineStyle: { color: t.eixo } },
    axisTick: { show: false },
    axisLabel: { color: t.textoSecundario, fontSize: 11, margin: 10, hideOverlap: true },
    splitLine: { show: false },
  }
  const eixoValor = {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: t.textoSecundario, fontSize: 11, margin: 10 },
    splitLine: { show: true, lineStyle: { color: t.grade, type: 'solid' } },
    nameTextStyle: { color: t.textoSecundario, fontSize: 11 },
  }
  return {
    color: t.series,
    backgroundColor: 'transparent',
    textStyle: { fontFamily: FONTE, color: t.texto },
    title: { textStyle: { color: t.texto, fontWeight: 600, fontSize: 14 }, subtextStyle: { color: t.textoSecundario } },
    grid: { left: 8, right: 16, top: 36, bottom: 8, containLabel: true },
    legend: {
      top: 0,
      left: 0,
      icon: 'roundRect',
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 16,
      textStyle: { color: t.textoSecundario, fontSize: 12 },
      inactiveColor: tema === 'escuro' ? '#35536F' : '#C5D0DB',
      pageIconColor: t.textoSecundario,
      pageTextStyle: { color: t.textoSecundario },
    },
    tooltip: {
      backgroundColor: tema === 'escuro' ? '#0A2A47' : '#FFFFFF',
      borderColor: tema === 'escuro' ? '#1B4566' : '#E1E8EF',
      borderWidth: 1,
      padding: [10, 12],
      textStyle: { color: t.texto, fontSize: 12, fontFamily: FONTE },
      extraCssText: 'border-radius:10px;box-shadow:0 12px 32px -8px rgba(0,23,43,.28);',
      axisPointer: {
        type: 'line',
        lineStyle: { color: t.eixo, width: 1 },
        crossStyle: { color: t.eixo },
        shadowStyle: { color: tema === 'escuro' ? 'rgba(123,140,255,.08)' : 'rgba(76,95,213,.06)' },
        label: { backgroundColor: tema === 'escuro' ? '#0E3A5C' : '#00203A' },
      },
    },
    categoryAxis: eixoCategoria,
    timeAxis: eixoCategoria,
    valueAxis: eixoValor,
    logAxis: eixoValor,
    line: { lineStyle: { width: 2 }, symbol: 'circle', symbolSize: 8, showSymbol: false, smooth: false, emphasis: { focus: 'series' } },
    bar: { barMaxWidth: 28, itemStyle: { borderRadius: [4, 4, 0, 0] } },
    pie: { itemStyle: { borderColor: t.superficie, borderWidth: 2 }, label: { color: t.textoSecundario } },
    scatter: { symbolSize: 9, itemStyle: { borderColor: t.superficie, borderWidth: 2 } },
    heatmap: { itemStyle: { borderColor: t.superficie, borderWidth: 2, borderRadius: 3 }, label: { color: t.texto } },
    funnel: { itemStyle: { borderColor: t.superficie, borderWidth: 2 }, label: { color: t.texto } },
    treemap: { itemStyle: { borderColor: t.superficie, borderWidth: 2, gapWidth: 2 } },
    sankey: { lineStyle: { color: 'gradient', opacity: 0.35 }, label: { color: t.texto } },
    gauge: { axisLine: { lineStyle: { color: [[1, t.grade]] } }, detail: { color: t.texto }, title: { color: t.textoSecundario } },
    visualMap: { inRange: { color: t.sequencial }, textStyle: { color: t.textoSecundario, fontSize: 11 }, itemWidth: 10, itemHeight: 90 },
    dataZoom: { borderColor: 'transparent', backgroundColor: t.grade, fillerColor: 'rgba(123,140,255,.18)', handleStyle: { color: t.destaque }, textStyle: { color: t.textoSecundario } },
    markLine: { lineStyle: { color: t.textoSecundario, type: 'dashed' }, label: { color: t.textoSecundario, fontSize: 11 }, symbol: 'none' },
    markPoint: { label: { color: t.texto } },
  }
}

export interface ItemTooltip {
  marker?: string
  seriesName?: string
  name?: string
  axisValueLabel?: string
  value?: unknown
  color?: unknown
}

/**
 * Formatter de tooltip com valores no padrão brasileiro:
 *   tooltip: { trigger: 'axis', formatter: tooltipBR((v) => fmtCompacto(v, { moeda: true })) }
 * `fmt` recebe o valor numérico e o nome da série. Com `total: true` inclui a soma das séries.
 */
export function tooltipBR(
  fmt: (valor: number, serie: string) => string,
  opcoes: { titulo?: (rotulo: string) => string; total?: boolean } = {},
) {
  return (params: unknown): string => {
    const itens = (Array.isArray(params) ? params : [params]) as ItemTooltip[]
    if (!itens.length) return ''
    const bruto = itens[0].axisValueLabel ?? itens[0].name ?? ''
    const titulo = opcoes.titulo ? opcoes.titulo(bruto) : bruto
    const num = (v: unknown): number | null => {
      const x = Array.isArray(v) ? v[v.length - 1] : v
      return typeof x === 'number' && Number.isFinite(x) ? x : null
    }
    let soma = 0
    const linhas = itens
      .map((p) => {
        const v = num(p.value)
        if (v !== null) soma += v
        const nome = itens.length > 1 || !p.name || p.name === bruto ? (p.seriesName ?? '') : p.name
        return `<div style="display:flex;align-items:center;justify-content:space-between;gap:20px;line-height:1.7">
          <span style="opacity:.8">${p.marker ?? ''}${nome}</span>
          <strong style="font-variant-numeric:tabular-nums;font-weight:600">${v === null ? '–' : fmt(v, p.seriesName ?? '')}</strong></div>`
      })
      .join('')
    const total =
      opcoes.total && itens.length > 1
        ? `<div style="display:flex;justify-content:space-between;gap:20px;margin-top:4px;padding-top:4px;border-top:1px solid rgba(128,150,170,.3)">
            <span style="opacity:.8">Total</span><strong style="font-variant-numeric:tabular-nums">${fmt(soma, 'Total')}</strong></div>`
        : ''
    return `<div style="min-width:150px"><div style="font-weight:600;margin-bottom:4px">${titulo}</div>${linhas}${total}</div>`
  }
}
