/** Utilitários de cor locais: interpolação na rampa sequencial do tema e cor de texto legível sobre a célula. */
import type { Tema } from '@/lib/tema'
import { tokensGrafico } from '@/lib/tema-echarts'

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
const hex = (c: number[]) => `#${c.map((x) => Math.round(x).toString(16).padStart(2, '0')).join('')}`

/** Cor na rampa para t em [0, 1] (interpolação linear entre os degraus, igual à do visualMap do ECharts). */
export function corNaRampa(t: number, rampa: string[]): string {
  const x = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0)) * (rampa.length - 1)
  const i = Math.min(rampa.length - 2, Math.floor(x))
  const a = rgb(rampa[i])
  const b = rgb(rampa[i + 1])
  const f = x - i
  return hex([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f])
}

function luminancia(cor: string): number {
  const [r, g, b] = rgb(cor).map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Texto escuro ou claro, o que tiver mais contraste com o fundo. */
export function textoSobre(fundo: string): string {
  return luminancia(fundo) > 0.3 ? '#0B2239' : '#FFFFFF'
}

/**
 * Cores das faixas de atraso: categoria ORDINAL, então usa degraus da rampa sequencial do tema
 * (quanto maior o atraso, mais intensa a cor). "Em dia" fica neutro.
 */
export function coresFaixas(tema: Tema): Record<string, string> {
  const t = tokensGrafico(tema)
  const s = t.sequencial
  const degraus = tema === 'escuro' ? [s[2], s[4], s[6], s[7]] : [s[2], s[4], s[5], s[7]]
  return { 'Em dia': t.outros, '1–30': degraus[0], '31–60': degraus[1], '61–90': degraus[2], '90+': degraus[3], Cancelada: t.outros }
}

/** N cores da rampa sequencial, da mais antiga (recessiva) à mais recente (forte). */
export function rampaDeLinhas(n: number, tema: Tema): string[] {
  const s = tokensGrafico(tema).sequencial.slice(2)
  if (n <= 1) return [s[s.length - 1]]
  return Array.from({ length: n }, (_, i) => corNaRampa(i / (n - 1), s))
}
