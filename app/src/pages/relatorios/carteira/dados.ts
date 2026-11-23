/** Cálculos locais do relatório de carteira (estoque por fotografia, faixas de atraso). */
import { agrupar, bucketDe, rotuloBucket, type Granularidade, type LinhasFiltradas } from '@/lib/cubo'
import { fmtNumero } from '@/lib/formato'
import type { Cubo } from '@/types/cubo'

export const FAIXAS_ATRASO = ['1–30', '31–60', '61–90', '90+'] as const
export const FAIXAS_OVER30 = ['31–60', '61–90', '90+']
export const FAIXA_OVER90 = '90+'

export interface PosicaoCarteira {
  saldo: number
  cotas: number
  atraso: number
  saldoOver30: number
  saldoOver90: number
  saldoAtrasado: number
  /** % do saldo nas faixas 31–60, 61–90 e 90+ */
  over30: number | null
  over90: number | null
  porFaixa: Record<string, { saldo: number; cotas: number; atraso: number }>
}

export function posicaoDe(porFaixa: Record<string, { saldo: number; cotas: number; atraso: number }>): PosicaoCarteira {
  let saldo = 0
  let cotas = 0
  let atraso = 0
  let saldoOver30 = 0
  let saldoOver90 = 0
  let saldoAtrasado = 0
  for (const [faixa, v] of Object.entries(porFaixa)) {
    saldo += v.saldo
    cotas += v.cotas
    atraso += v.atraso
    if (faixa !== 'Em dia') saldoAtrasado += v.saldo
    if (FAIXAS_OVER30.includes(faixa)) saldoOver30 += v.saldo
    if (faixa === FAIXA_OVER90) saldoOver90 += v.saldo
  }
  return {
    saldo,
    cotas,
    atraso,
    saldoOver30,
    saldoOver90,
    saldoAtrasado,
    over30: saldo > 0 ? saldoOver30 / saldo : null,
    over90: saldo > 0 ? saldoOver90 / saldo : null,
    porFaixa,
  }
}

/** Posição da carteira na última fotografia da seleção (medidas de estoque: o motor usa a última data). */
export function posicaoCarteira(cubo: Cubo, linhas: LinhasFiltradas): PosicaoCarteira {
  const porFaixa: PosicaoCarteira['porFaixa'] = {}
  for (const g of agrupar(cubo, linhas, ['faixa'], ['saldo_devedor', 'cotas', 'valor_em_atraso'])) {
    porFaixa[g.chave[0]] = { saldo: g.valores.saldo_devedor, cotas: g.valores.cotas, atraso: g.valores.valor_em_atraso }
  }
  return posicaoDe(porFaixa)
}

/** Data da última fotografia presente na seleção. */
export function ultimaFotografia(cubo: Cubo, linhas: LinhasFiltradas): string | null {
  const col = cubo.colunas.data
  const valores = cubo.dims.find((d) => d.nome === 'data')?.valores ?? []
  let melhor: string | null = null
  const visto = new Set<number>()
  for (let j = 0; j < linhas.idx.length; j++) {
    const t = col[linhas.idx[j]]
    if (visto.has(t)) continue
    visto.add(t)
    const d = valores[t]
    if (!melhor || d > melhor) melhor = d
  }
  return melhor
}

export interface SerieEstoque {
  buckets: string[]
  rotulos: string[]
  /** data da fotografia usada em cada bucket */
  datas: string[]
  posicoes: PosicaoCarteira[]
}

/**
 * Série de estoque: para cada bucket (dia, semana ou mês) vale a ÚLTIMA fotografia dentro dele.
 * Buckets sem fotografia não entram (não há o que mostrar), e datas nunca são somadas.
 */
export function serieEstoque(cubo: Cubo, linhas: LinhasFiltradas, g: Granularidade): SerieEstoque {
  const porData = new Map<string, PosicaoCarteira['porFaixa']>()
  for (const gr of agrupar(cubo, linhas, ['data', 'faixa'], ['saldo_devedor', 'cotas', 'valor_em_atraso'])) {
    let m = porData.get(gr.chave[0])
    if (!m) porData.set(gr.chave[0], (m = {}))
    m[gr.chave[1]] = { saldo: gr.valores.saldo_devedor, cotas: gr.valores.cotas, atraso: gr.valores.valor_em_atraso }
  }
  const ultimaDoBucket = new Map<string, string>()
  for (const data of [...porData.keys()].sort()) ultimaDoBucket.set(bucketDe(data, g), data)
  const buckets = [...ultimaDoBucket.keys()].sort()
  const datas = buckets.map((b) => ultimaDoBucket.get(b) as string)
  return {
    buckets,
    rotulos: g === 'mes' ? buckets.map(rotuloBucket) : datas.map(rotuloBucket),
    datas,
    posicoes: datas.map((d) => posicaoDe(porData.get(d) ?? {})),
  }
}

/** Diferença em pontos percentuais já formatada ("+0,4 p.p."). */
export function fmtPP(atual: number | null | undefined, anterior: number | null | undefined, casas = 2): string | undefined {
  if (atual == null || anterior == null) return undefined
  const d = (atual - anterior) * 100
  const txt = fmtNumero(Math.abs(d), casas)
  const zero = Number(Math.abs(d).toFixed(casas)) === 0
  return `${zero ? '' : d > 0 ? '+' : '−'}${txt} p.p.`
}

/** Fim do mês de um bucket mensal YYYY-MM. */
export function fimDoMes(mes: string): string {
  const a = Number(mes.slice(0, 4))
  const m = Number(mes.slice(5, 7))
  return new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10)
}
