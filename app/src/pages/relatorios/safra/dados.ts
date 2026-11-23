/** Modelo local das safras: agrega o cubo por (safra, MOB) e calcula os indicadores a partir de numerador/denominador. */
import { agrupar, type LinhasFiltradas } from '@/lib/cubo'
import type { Cubo } from '@/types/cubo'

export type Indicador = 'over30' | 'over60' | 'over90' | 'cancel' | 'retencao'
export type Denominador = 'base' | 'ativas'

export const ROTULO_INDICADOR: Record<Indicador, string> = {
  over30: 'Over 30',
  over60: 'Over 60',
  over90: 'Over 90',
  cancel: 'Cancelamento acumulado',
  retencao: 'Retenção (cotas ativas)',
}

export interface Celula {
  base: number
  ativas: number
  over30: number
  over60: number
  over90: number
  cancel: number
}

export interface ModeloSafras {
  /** safras em ordem cronológica */
  safras: string[]
  /** MOBs observados (0..max) */
  mobs: number[]
  /** último MOB observado de cada safra (parcial: posição da data de referência) */
  maxMob: Record<string, number>
  celula: (safra: string, mob: number) => Celula | undefined
}

const zero = (): Celula => ({ base: 0, ativas: 0, over30: 0, over60: 0, over90: 0, cancel: 0 })

function somar(a: Celula, v: Record<string, number>) {
  a.base += v.cotas_base ?? 0
  a.ativas += v.cotas_ativas ?? 0
  a.over30 += v.over30 ?? 0
  a.over60 += v.over60 ?? 0
  a.over90 += v.over90 ?? 0
  a.cancel += v.cancelados_acum ?? 0
}

/**
 * Agrega por (safra, MOB). `cotas_base` vem repetida em cada MOB, por isso a soma é sempre DENTRO de um
 * par (safra, MOB) e nunca entre MOBs.
 */
export function construirModelo(cubo: Cubo, linhas: LinhasFiltradas): ModeloSafras {
  const m = new Map<string, Celula>()
  const maxMob: Record<string, number> = {}
  let teto = -1
  for (const g of agrupar(cubo, linhas, ['safra', 'mob'])) {
    const safra = g.chave[0]
    const mob = Number(g.chave[1])
    const c = zero()
    somar(c, g.valores)
    if (c.base <= 0) continue
    m.set(`${safra}|${mob}`, c)
    if (maxMob[safra] === undefined || mob > maxMob[safra]) maxMob[safra] = mob
    if (mob > teto) teto = mob
  }
  return {
    safras: Object.keys(maxMob).sort(),
    mobs: Array.from({ length: teto + 1 }, (_, i) => i),
    maxMob,
    celula: (safra, mob) => m.get(`${safra}|${mob}`),
  }
}

/** Quebra de um MOB por uma dimensão (segmento, canal), somando as safras que já observaram aquele MOB. */
export function quebraNoMob(cubo: Cubo, linhas: LinhasFiltradas, dim: string, mob: number): { nome: string; c: Celula }[] {
  const m = new Map<string, Celula>()
  for (const g of agrupar(cubo, linhas, ['mob', dim])) {
    if (Number(g.chave[0]) !== mob) continue
    let c = m.get(g.chave[1])
    if (!c) m.set(g.chave[1], (c = zero()))
    somar(c, g.valores)
  }
  const ordem = cubo.dims.find((d) => d.nome === dim)?.valores ?? []
  return ordem.filter((n) => (m.get(n)?.base ?? 0) > 0).map((nome) => ({ nome, c: m.get(nome) as Celula }))
}

export function numerador(c: Celula, ind: Indicador): number {
  return ind === 'cancel' ? c.cancel : ind === 'retencao' ? c.ativas : c[ind]
}
export function denominador(c: Celula, ind: Indicador, den: Denominador): number {
  return ind === 'cancel' || ind === 'retencao' || den === 'base' ? c.base : c.ativas
}
/** Indicador em fração (0,071 = 7,1%) ou null quando não há denominador. */
export function taxa(c: Celula | undefined, ind: Indicador, den: Denominador = 'base'): number | null {
  if (!c) return null
  const d = denominador(c, ind, den)
  return d > 0 ? numerador(c, ind) / d : null
}

/** Taxa agregada (soma dos numeradores ÷ soma dos denominadores) das safras que observaram o MOB. */
export function taxaAgregada(modelo: ModeloSafras, mob: number, ind: Indicador, den: Denominador = 'base', safras = modelo.safras): { taxa: number | null; n: number } {
  let num = 0
  let dn = 0
  let n = 0
  for (const s of safras) {
    const c = modelo.celula(s, mob)
    if (!c) continue
    num += numerador(c, ind)
    dn += denominador(c, ind, den)
    n++
  }
  return { taxa: dn > 0 ? num / dn : null, n }
}

/** O MOB informado é o último (parcial) daquela safra? */
export function parcial(modelo: ModeloSafras, safra: string, mob: number): boolean {
  return modelo.maxMob[safra] === mob
}
