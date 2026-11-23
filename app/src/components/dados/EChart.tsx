/**
 * Wrapper React do ECharts: tema próprio (claro/escuro) que reage ao alternador, resize automático,
 * eventos e ref para exportar PNG. Este módulo carrega o ECharts: importe-o só em páginas lazy.
 *
 *   const ref = useRef<EChartHandle>(null)
 *   <EChart ref={ref} option={option} altura={300} onEvents={{ click: (p) => ... }} />
 */
import { BarChart, CustomChart, FunnelChart, GaugeChart, HeatmapChart, LineChart, PieChart, RadarChart, SankeyChart, ScatterChart, TreemapChart } from 'echarts/charts'
import {
  AriaComponent,
  CalendarComponent,
  DataZoomComponent,
  DatasetComponent,
  GraphicComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  MarkPointComponent,
  RadarComponent,
  TitleComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components'
import * as echarts from 'echarts/core'
import type { EChartsOption } from 'echarts'
import { LabelLayout, LegacyGridContainLabel, UniversalTransition } from 'echarts/features'
import { CanvasRenderer } from 'echarts/renderers'
import { useEffect, useImperativeHandle, useRef, type CSSProperties, type Ref } from 'react'
import { baixarArquivo } from '@/lib/exportar'
import { useTema } from '@/lib/tema'
import { temaECharts, tokensGrafico } from '@/lib/tema-echarts'
import { cn } from '@/lib/utils'

echarts.use([
  LineChart, BarChart, PieChart, ScatterChart, HeatmapChart, FunnelChart, GaugeChart, TreemapChart, SankeyChart, RadarChart, CustomChart,
  GridComponent, TooltipComponent, LegendComponent, TitleComponent, DatasetComponent, MarkLineComponent, MarkPointComponent,
  MarkAreaComponent, VisualMapComponent, DataZoomComponent, GraphicComponent, CalendarComponent, RadarComponent, AriaComponent,
  LabelLayout, LegacyGridContainLabel, UniversalTransition, CanvasRenderer,
])
echarts.registerTheme('hub-claro', temaECharts('claro'))
echarts.registerTheme('hub-escuro', temaECharts('escuro'))

export type { EChartsOption }
/** Instância `echarts/core` já configurada (use para echarts.use(...) de tipos extras, ex.: MapChart). */
// eslint-disable-next-line react/only-export-components
export { echarts }

export interface EChartHandle {
  /** instância do ECharts (ou null antes de montar) */
  instancia: () => echarts.ECharts | null
  /** data URL PNG em 2x, com o fundo da superfície do tema */
  png: () => string | null
  /** baixa o gráfico como PNG */
  exportarPNG: (nomeArquivo: string) => void
}

export interface EChartProps {
  option: EChartsOption
  /** altura em px (padrão 300) ou valor CSS ("100%") */
  altura?: number | string
  /** mapa evento → handler (click, legendselectchanged, datazoom...) */
  onEvents?: Record<string, (params: unknown, instancia: echarts.ECharts) => void>
  /** substitui toda a option a cada mudança (padrão true: evita séries "fantasma" ao trocar filtros) */
  notMerge?: boolean
  /** descrição para leitores de tela */
  descricao?: string
  className?: string
  style?: CSSProperties
  ref?: Ref<EChartHandle>
}

export function EChart({ option, altura = 300, onEvents, notMerge = true, descricao, className, style, ref }: EChartProps) {
  const el = useRef<HTMLDivElement>(null)
  const inst = useRef<echarts.ECharts | null>(null)
  const tema = useTema((s) => s.tema)
  const eventos = useRef(onEvents)
  eventos.current = onEvents
  const opt = useRef(option)
  opt.current = option

  // (re)cria a instância quando o tema muda
  useEffect(() => {
    if (!el.current) return
    const reduzir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const c = echarts.init(el.current, tema === 'escuro' ? 'hub-escuro' : 'hub-claro', { renderer: 'canvas' })
    inst.current = c
    c.setOption({ animation: !reduzir, animationDuration: 500, animationDurationUpdate: 300, ...opt.current }, true)
    const nomes = new Set(Object.keys(eventos.current ?? {}))
    for (const nome of nomes) c.on(nome, (p: unknown) => eventos.current?.[nome]?.(p, c))
    const ro = new ResizeObserver(() => c.resize())
    ro.observe(el.current)
    return () => {
      ro.disconnect()
      c.dispose()
      inst.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tema, Object.keys(onEvents ?? {}).join('|')])

  useEffect(() => {
    inst.current?.setOption(option, notMerge)
  }, [option, notMerge])

  useImperativeHandle(
    ref,
    () => {
      const png = () =>
        inst.current?.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: tokensGrafico(useTema.getState().tema).superficie }) ?? null
      return {
        instancia: () => inst.current,
        png,
        exportarPNG: (nome: string) => {
          const url = png()
          if (url) baixarArquivo(nome.endsWith('.png') ? nome : `${nome}.png`, url)
        },
      }
    },
    [],
  )

  return (
    <div
      ref={el}
      role="img"
      aria-label={descricao ?? 'Gráfico'}
      className={cn('w-full min-w-0', className)}
      style={{ height: altura, ...style }}
    />
  )
}

export default EChart
