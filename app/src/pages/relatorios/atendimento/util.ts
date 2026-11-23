/** Utilitários locais do relatório de Atendimento (formatação, NPS, filtros, tooltips). */
import { useCallback, useMemo } from 'react'
import type { EChartsOption } from '@/components/dados/EChart'
import type { FiltrosCubo } from '@/lib/cubo'
import { useFiltros, type FiltrosResolvidos } from '@/lib/filtros'
import { fmtNumero } from '@/lib/formato'
import { useTema, type Tema } from '@/lib/tema'
import { tokensGrafico, type TokensGrafico } from '@/lib/tema-echarts'

export const DIM_CANAL = 'canal_atendimento'

/** Tema atual + tokens de gráfico com referência estável (seguro em dependências de useMemo). */
export function useTokens(): { tema: Tema; t: TokensGrafico } {
  const tema = useTema((s) => s.tema)
  const t = useMemo(() => tokensGrafico(tema), [tema])
  return { tema, t }
}

/** Atalho para montar options do ECharts sem brigar com os tipos da biblioteca. */
export const opcao = (o: Record<string, unknown>): EChartsOption => o as EChartsOption

/** Segundos → "06:50" (mm:ss; acima de 1h os minutos passam de 59, ex.: "72:05"). */
export function fmtMMSS(seg: number | null | undefined): string {
  if (seg == null || !Number.isFinite(seg)) return '–'
  const s = Math.max(0, Math.round(seg))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/** Fração → percentual com 2 casas para CSV (o exportador troca o ponto por vírgula). */
export function pctCSV(v: number | null | undefined): number | string {
  return v == null || !Number.isFinite(v) ? '' : Math.round(v * 10000) / 100
}

const nfEixo = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
/** Rótulo de eixo de volume com unidade consistente entre os ticks: "8 mil", "10 mil", "1,5 mi". */
export function fmtEixo(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 1e6) return `${nfEixo.format(v / 1e6)} mi`
  if (abs >= 1e3) return `${nfEixo.format(v / 1e3)} mil`
  return nfEixo.format(v)
}

const sinal = (v: number) => (v > 0 ? '+' : '')

/** Diferença em pontos percentuais entre duas frações: pronto para KpiCard (variacao + variacaoTexto). */
export function difPP(atual: number | null, anterior: number | null): { variacao: number | null; texto?: string } {
  if (atual == null || anterior == null) return { variacao: null }
  const d = atual - anterior
  return { variacao: d, texto: `${sinal(d)}${fmtNumero(d * 100, 1)} p.p.` }
}

/** Diferença em pontos (NPS). */
export function difPts(atual: number | null, anterior: number | null): { variacao: number | null; texto?: string } {
  if (atual == null || anterior == null) return { variacao: null }
  const d = atual - anterior
  return { variacao: d / 100, texto: `${sinal(d)}${fmtNumero(d, 1)} pts` }
}

// ----------------------------------------------------------------------------------------------
// NPS
// ----------------------------------------------------------------------------------------------

export const MEDIDAS_NPS = ['promotores', 'neutros', 'detratores']

export interface PartesNps {
  promotores: number
  neutros: number
  detratores: number
  respostas: number
  /** (promotores − detratores) / respostas × 100, ou null sem respostas */
  nps: number | null
}

export function partesNps(v: Record<string, number>): PartesNps {
  const promotores = v.promotores ?? 0
  const neutros = v.neutros ?? 0
  const detratores = v.detratores ?? 0
  const respostas = promotores + neutros + detratores
  return { promotores, neutros, detratores, respostas, nps: respostas > 0 ? ((promotores - detratores) / respostas) * 100 : null }
}

// ----------------------------------------------------------------------------------------------
// Filtros
// ----------------------------------------------------------------------------------------------

/** Mesmo filtro global, sem o canal: base dos comparativos por canal (o canal selecionado vira destaque). */
export function semCanal(filtros: FiltrosCubo): FiltrosCubo {
  return { ...filtros, dims: { ...filtros.dims, [DIM_CANAL]: undefined } }
}

/** Cross-filter: clicar num canal aplica ou remove o filtro global de canal. */
export function useAlternarCanal(): (canal: string) => void {
  const definirCanais = useFiltros((s) => s.definirCanais)
  return useCallback(
    (canal: string) => {
      const atual = useFiltros.getState().canais
      definirCanais(atual.includes(canal) ? atual.filter((c) => c !== canal) : [...atual, canal])
    },
    [definirCanais],
  )
}

/** Primeiro e último dia dos meses que intersectam o período (cubos e visões mensais). */
export function mesesDoPeriodo(f: Pick<FiltrosResolvidos, 'periodo'>): { inicio: string; fim: string; primeiro: string; ultimo: string } {
  const primeiro = f.periodo.inicio.slice(0, 7)
  const ultimo = f.periodo.fim.slice(0, 7)
  const a = Number(ultimo.slice(0, 4))
  const m = Number(ultimo.slice(5, 7))
  const ultimoDia = new Date(Date.UTC(a, m, 0)).getUTCDate()
  return { inicio: `${primeiro}-01`, fim: `${ultimo}-${String(ultimoDia).padStart(2, '0')}`, primeiro, ultimo }
}

// ----------------------------------------------------------------------------------------------
// Tooltip rico (HTML) no padrão do tema
// ----------------------------------------------------------------------------------------------

export interface LinhaTooltip {
  nome: string
  valor: string
  cor?: string
  /** texto auxiliar à direita do valor (ex.: participação) */
  nota?: string
  /** separador acima (ex.: linha de total) */
  separar?: boolean
}

export function tooltipHTML(titulo: string, linhas: LinhaTooltip[], rodape?: string): string {
  const corpo = linhas
    .map((l) => {
      const marca = l.cor
        ? `<span style="display:inline-block;margin-right:7px;border-radius:3px;width:9px;height:9px;background:${l.cor}"></span>`
        : ''
      const nota = l.nota ? `<span style="opacity:.6;margin-left:8px;font-variant-numeric:tabular-nums">${l.nota}</span>` : ''
      const borda = l.separar ? 'margin-top:4px;padding-top:4px;border-top:1px solid rgba(128,150,170,.3);' : ''
      return `<div style="display:flex;align-items:center;justify-content:space-between;gap:22px;line-height:1.7;${borda}">
        <span style="opacity:.82">${marca}${l.nome}</span>
        <span><strong style="font-variant-numeric:tabular-nums;font-weight:600">${l.valor}</strong>${nota}</span></div>`
    })
    .join('')
  const pe = rodape ? `<div style="margin-top:6px;max-width:260px;white-space:normal;font-size:11px;line-height:1.45;opacity:.7">${rodape}</div>` : ''
  return `<div style="min-width:170px"><div style="font-weight:600;margin-bottom:4px">${titulo}</div>${corpo}${pe}</div>`
}
