/**
 * Utilitários locais dos relatórios de Vendas e Assembleias: drill-down temporal (mês → semana → dia),
 * rateio de metas mensais pelos dias do período, cross-filter e tooltips HTML dos gráficos.
 */
import { useMemo, useState } from 'react'
import { diasEntre, gerarBuckets, somarDias, type Granularidade } from '@/lib/cubo'
import { useFiltros, type Periodo } from '@/lib/filtros'
import type { Meta } from '@/types/governanca'

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

// ----------------------------------------------------------------------------------------------
// Datas e buckets
// ----------------------------------------------------------------------------------------------

/** Último dia do mês "YYYY-MM". */
export function fimDoMes(mes: string): string {
  const a = Number(mes.slice(0, 4))
  const m = Number(mes.slice(5, 7))
  return new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10)
}

export function diasNoMes(mes: string): number {
  return Number(fimDoMes(mes).slice(8, 10))
}

const maior = (a: string, b: string) => (a > b ? a : b)
const menor = (a: string, b: string) => (a < b ? a : b)

/** Intervalo de datas coberto por um bucket, limitado ao período informado. */
export function intervaloDoBucket(bucket: string, g: Granularidade, periodo: Periodo): Periodo {
  let ini: string
  let fim: string
  if (bucket.length === 7) {
    ini = `${bucket}-01`
    fim = fimDoMes(bucket)
  } else if (g === 'semana') {
    ini = bucket
    fim = somarDias(bucket, 6)
  } else {
    ini = bucket
    fim = bucket
  }
  return { inicio: maior(ini, periodo.inicio), fim: menor(fim, periodo.fim) }
}

/** Rótulo por extenso de um bucket: "nov/2026", "semana de 09/11", "16/11/2026". */
export function rotuloLongo(bucket: string, g: Granularidade): string {
  if (bucket.length === 7) return `${MESES[Number(bucket.slice(5, 7)) - 1]}/${bucket.slice(0, 4)}`
  const dm = `${bucket.slice(8, 10)}/${bucket.slice(5, 7)}`
  return g === 'semana' ? `semana de ${dm}` : `${dm}/${bucket.slice(0, 4)}`
}

/** Um bucket é parcial quando o período não cobre todos os seus dias (ex.: novembro/2026 até 16/11). */
export function bucketParcial(bucket: string, g: Granularidade, periodo: Periodo): boolean {
  if (g === 'dia') return false
  const cheio = intervaloDoBucket(bucket, g, { inicio: '0000-01-01', fim: '9999-12-31' })
  const real = intervaloDoBucket(bucket, g, periodo)
  return real.inicio !== cheio.inicio || real.fim !== cheio.fim
}

/**
 * Rateia valores mensais (mês cheio) pelos dias de um intervalo: cada mês contribui com
 * valor × (dias do mês dentro do intervalo ÷ dias do mês). É a regra de "meta proporcional".
 */
export function proRata(porMes: Map<string, number>, inicio: string, fim: string): number {
  if (inicio > fim) return 0
  let total = 0
  for (const mes of gerarBuckets(inicio, fim, 'mes')) {
    const v = porMes.get(mes)
    if (!v) continue
    const a = maior(`${mes}-01`, inicio)
    const b = menor(fimDoMes(mes), fim)
    if (a > b) continue
    total += (v * diasEntre(a, b)) / diasNoMes(mes)
  }
  return total
}

/** Quantidade de meses (fracionada pelos dias) dentro do intervalo: 01/11 a 16/11 = 0,53. */
export function mesesNoPeriodo(inicio: string, fim: string): number {
  const um = new Map(gerarBuckets(inicio, fim, 'mes').map((m) => [m, 1]))
  return proRata(um, inicio, fim)
}

// ----------------------------------------------------------------------------------------------
// Drill-down temporal
// ----------------------------------------------------------------------------------------------

export interface Drill {
  /** período e granularidade efetivos do nível atual */
  periodo: Periodo
  granularidade: Granularidade
  /** trilha de navegação: o primeiro item é sempre "Todos" */
  trilha: string[]
  /** há um nível abaixo do atual (mês → semana → dia) */
  podeDescer: boolean
  /** granularidade do próximo nível, se houver */
  proximo: Granularidade | null
  descer: (bucket: string) => void
  /** volta para o nível n da trilha (0 = "Todos") */
  irPara: (nivel: number) => void
  voltar: () => void
}

/** Estado do drill-down de um gráfico de tendência. Reinicia quando período ou granularidade global mudam. */
export function useDrill(periodo: Periodo, granularidade: Granularidade): Drill {
  const chave = `${periodo.inicio}|${periodo.fim}|${granularidade}`
  const [estado, setEstado] = useState<{ chave: string; caminho: string[] }>({ chave, caminho: [] })
  const caminho = estado.chave === chave ? estado.caminho : []

  return useMemo(() => {
    let p = periodo
    let g = granularidade
    const trilha = ['Todos']
    for (const b of caminho) {
      if (g === 'dia') break
      trilha.push(rotuloLongo(b, g))
      p = intervaloDoBucket(b, g, p)
      g = g === 'mes' ? 'semana' : 'dia'
    }
    const proximo: Granularidade | null = g === 'mes' ? 'semana' : g === 'semana' ? 'dia' : null
    return {
      periodo: p,
      granularidade: g,
      trilha,
      podeDescer: proximo !== null,
      proximo,
      descer: (bucket: string) => {
        if (proximo) setEstado({ chave, caminho: [...caminho, bucket] })
      },
      irPara: (nivel: number) => setEstado({ chave, caminho: caminho.slice(0, Math.max(0, nivel)) }),
      voltar: () => setEstado({ chave, caminho: caminho.slice(0, -1) }),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, caminho.join('|')])
}

export const NOME_GRANULARIDADE: Record<Granularidade, string> = { dia: 'dia', semana: 'semana', mes: 'mês' }

// ----------------------------------------------------------------------------------------------
// Cross-filter
// ----------------------------------------------------------------------------------------------

function alternar(lista: string[], valor: string): string[] {
  return lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor]
}

/** Aplica/remove o filtro global ao clicar numa barra, fatia ou UF. */
export function alternarFiltro(dim: 'segmento' | 'regional' | 'uf' | 'canal', valor: string, meta?: Pick<Meta, 'ufs'> | null) {
  const s = useFiltros.getState()
  if (dim === 'segmento') s.definirSegmentos(alternar(s.segmentos, valor))
  else if (dim === 'canal') s.definirCanais(alternar(s.canais, valor))
  else if (dim === 'uf') {
    // UF fora das regionais filtradas: troca o recorte geográfico em vez de combinar filtros incompatíveis
    const regional = meta?.ufs.find((u) => u.sigla === valor)?.regional
    const fora = !s.ufs.includes(valor) && s.regionais.length > 0 && !!regional && !s.regionais.includes(regional)
    if (fora) s.aplicar({ regionais: [], ufs: [valor] })
    else s.definirUfs(alternar(s.ufs, valor))
  }
  else s.definirRegionais(alternar(s.regionais, valor), meta)
}

/** Regionais em destaque: as filtradas ou, na falta, as das UFs filtradas. Vazio = tudo em destaque. */
export function regionaisAtivas(regionais: string[], ufs: string[], meta: Pick<Meta, 'ufs'> | null): Set<string> {
  if (ufs.length && meta) {
    const s = new Set<string>()
    for (const u of meta.ufs) if (ufs.includes(u.sigla)) s.add(u.regional)
    return s
  }
  return new Set(regionais)
}

// ----------------------------------------------------------------------------------------------
// Tooltip HTML (ECharts)
// ----------------------------------------------------------------------------------------------

export interface LinhaTip {
  rotulo: string
  valor: string
  /** cor do marcador (opcional) */
  cor?: string
  /** linha de destaque (negrito) */
  forte?: boolean
}

const marcador = (cor?: string) =>
  cor ? `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${cor};margin-right:6px"></span>` : ''

/** Monta o HTML de um tooltip: título, linhas "rótulo — valor" e rodapé discreto. */
export function tip(titulo: string, linhas: (LinhaTip | null | false | undefined)[], rodape?: string): string {
  const corpo = linhas
    .filter((l): l is LinhaTip => !!l)
    .map(
      (l) => `<div style="display:flex;align-items:center;justify-content:space-between;gap:24px;line-height:1.75">
        <span style="opacity:.8">${marcador(l.cor)}${l.rotulo}</span>
        <strong style="font-variant-numeric:tabular-nums;font-weight:${l.forte ? 700 : 600}">${l.valor}</strong></div>`,
    )
    .join('')
  const pe = rodape
    ? `<div style="margin-top:6px;padding-top:6px;border-top:1px solid rgba(128,150,170,.3);font-size:11px;opacity:.7;max-width:260px;white-space:normal">${rodape}</div>`
    : ''
  return `<div style="min-width:180px"><div style="font-weight:600;margin-bottom:4px">${titulo}</div>${corpo}${pe}</div>`
}

/** Normaliza texto para busca (sem acentos, minúsculas). */
export function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** Interpola uma rampa sequencial (lista de hex) na posição t ∈ [0, 1]. */
export function corNaRampa(rampa: string[], t: number): string {
  const x = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0)) * (rampa.length - 1)
  const i = Math.min(rampa.length - 2, Math.floor(x))
  const f = x - i
  const hex = (h: string) => [1, 3, 5].map((p) => parseInt(h.slice(p, p + 2), 16))
  const a = hex(rampa[i])
  const b = hex(rampa[i + 1])
  const c = a.map((v, k) => Math.round(v + (b[k] - v) * f))
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/** Luminância relativa aproximada (0 = preto, 1 = branco) para escolher a cor do rótulo sobre um preenchimento. */
export function luminancia(hexCor: string): number {
  const [r, g, b] = [1, 3, 5].map((p) => parseInt(hexCor.slice(p, p + 2), 16) / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// ----------------------------------------------------------------------------------------------
// Rótulos de eixo
// ----------------------------------------------------------------------------------------------

/** Rótulo compacto para eixos: "R$ 120 mi", "2,5 mi", "800" (uma casa só quando necessário). */
export function eixoCompacto(v: number, moeda = false): string {
  const abs = Math.abs(v)
  const unidade = abs >= 1e9 ? 1e9 : abs >= 1e6 ? 1e6 : abs >= 1e4 ? 1e3 : 1
  const sufixo = unidade === 1e9 ? ' bi' : unidade === 1e6 ? ' mi' : unidade === 1e3 ? ' mil' : ''
  const x = abs / unidade
  const casas = Math.abs(x - Math.round(x)) < 1e-9 ? 0 : 1
  const texto = x.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
  return `${v < 0 ? '-' : ''}${moeda ? 'R$ ' : ''}${texto}${sufixo}`
}

/** Variação em pontos percentuais entre duas frações, pronta para o KpiCard: "+0,4 p.p.". */
export function variacaoPP(atual: number | null, anterior: number | null, casas = 1): { texto: string; valor: number } | null {
  if (atual == null || anterior == null || !Number.isFinite(atual) || !Number.isFinite(anterior)) return null
  const d = (atual - anterior) * 100
  const texto = `${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(d).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })} p.p.`
  return { texto, valor: d }
}

// ----------------------------------------------------------------------------------------------
// Clique na coluna inteira (drill-down)
// ----------------------------------------------------------------------------------------------

interface InstanciaGrafico {
  getDom: () => HTMLElement
  containPixel: (finder: { gridIndex: number }, ponto: number[]) => boolean
  convertFromPixel: (finder: { xAxisIndex: number }, valor: number) => unknown
}

/**
 * Índice da categoria do eixo X sob o clique, considerando a coluna inteira (não só a barra).
 * Devolve null quando o clique cai fora das áreas de plotagem (legenda, títulos, margens).
 */
export function indiceDoClique(ev: { clientX: number; clientY: number }, instancia: unknown, grades = 1): number | null {
  const inst = instancia as InstanciaGrafico | null | undefined
  if (!inst) return null
  const r = inst.getDom().getBoundingClientRect()
  const ponto = [ev.clientX - r.left, ev.clientY - r.top]
  for (let g = 0; g < grades; g++) {
    if (!inst.containPixel({ gridIndex: g }, ponto)) continue
    const i = Number(inst.convertFromPixel({ xAxisIndex: g }, ponto[0]))
    return Number.isFinite(i) ? Math.round(i) : null
  }
  return null
}
