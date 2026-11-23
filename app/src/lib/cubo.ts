/**
 * Motor genérico dos cubos colunares (src/types/cubo.ts).
 *
 *   const linhas = filtrar(cubo, filtros, meta)                    // seleção + pesos de alocação
 *   const tot    = totais(cubo, linhas)                             // { vendas: 1234, valor: 5.6e8 }
 *   const porSeg = agrupar(cubo, linhas, ['segmento'], ['valor'])   // [{ chave: ['Imóveis'], valores: { valor } }]
 *   const serie  = serieTemporal(cubo, linhas, 'mes', ['valor'])    // { buckets, rotulos, valores: { valor: [...] } }
 *   const comp   = compararPeriodos(cubo, filtros, meta)            // { atual, anterior, variacao }
 *
 * Regras (comentário de cubo.ts): dimensão presente filtra nativamente; UF em cubo só com `regional`
 * filtra a regional e pondera por meta.pesos_uf; cubo sem uf nem regional pondera por meta.pesos_regional
 * (e pesos_uf); regional em cubo só com `uf` mapeia UF → regional por meta.ufs.
 * Medidas `estoque` nunca somam datas: usa-se a última fotografia do período (ou de cada bucket).
 * Razões (ticket médio, % inadimplência, NPS...) são calculadas por quem chama, a partir dos totais.
 */
import type { Cubo, DimCubo, MedidaCubo } from '@/types/cubo'
import type { Meta } from '@/types/governanca'

export type Granularidade = 'dia' | 'semana' | 'mes'

export interface FiltrosCubo {
  /** YYYY-MM-DD, inclusive */
  inicio?: string | null
  fim?: string | null
  segmentos?: string[]
  regionais?: string[]
  ufs?: string[]
  /** filtros por nome de dimensão (ex.: { canal: ['Digital'], faixa_atraso: ['31-60'] }). Lista vazia = sem filtro. */
  dims?: Record<string, string[] | undefined>
}

/** Subconjunto das informações do meta que o motor usa (facilita testes). */
export type MetaCubo = Pick<Meta, 'ufs' | 'pesos_uf' | 'pesos_regional'>

export interface LinhasFiltradas {
  /** índices das linhas selecionadas */
  idx: Int32Array
  /** peso de alocação por linha selecionada (alinhado a idx) ou null quando todos valem `pesoGlobal` */
  pesos: Float64Array | null
  /** multiplicador aplicado a todas as medidas (1 quando não há alocação por peso) */
  pesoGlobal: number
}

export interface LinhaAgrupada {
  /** valores das dimensões, na ordem pedida */
  chave: string[]
  valores: Record<string, number>
}

export interface SerieTemporal {
  /** chave do bucket: YYYY-MM-DD (dia), segunda-feira YYYY-MM-DD (semana) ou YYYY-MM (mês) */
  buckets: string[]
  /** rótulos curtos para eixo: "16/11", "16/11" (início da semana) ou "nov/26" */
  rotulos: string[]
  valores: Record<string, number[]>
}

export interface SeriePorDimensao {
  buckets: string[]
  rotulos: string[]
  series: { nome: string; valores: number[]; total: number }[]
}

// ----------------------------------------------------------------------------------------------
// Datas (strings YYYY-MM-DD, sempre em UTC para não sofrer com fuso/horário de verão)
// ----------------------------------------------------------------------------------------------

const DIA_MS = 86_400_000
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function utc(d: string): number {
  return Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10) || '1'))
}
function iso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}
export function somarDias(d: string, n: number): string {
  return iso(utc(d) + n * DIA_MS)
}
/** Dias corridos entre duas datas, inclusive (16/11 a 16/11 = 1). */
export function diasEntre(inicio: string, fim: string): number {
  return Math.round((utc(fim) - utc(inicio)) / DIA_MS) + 1
}
/** Segunda-feira da semana da data. */
export function inicioDaSemana(d: string): string {
  const ms = utc(d)
  const dow = (new Date(ms).getUTCDay() + 6) % 7 // seg = 0
  return iso(ms - dow * DIA_MS)
}
export function bucketDe(data: string, g: Granularidade): string {
  if (g === 'mes') return data.slice(0, 7)
  if (data.length === 7) return data // dimensão mensal não desce de mês
  return g === 'semana' ? inicioDaSemana(data) : data
}
export function rotuloBucket(bucket: string): string {
  if (bucket.length === 7) return `${MESES[Number(bucket.slice(5, 7)) - 1]}/${bucket.slice(2, 4)}`
  return `${bucket.slice(8, 10)}/${bucket.slice(5, 7)}`
}
/** Lista contínua de buckets entre duas datas (preenche buracos da série). */
export function gerarBuckets(inicio: string, fim: string, g: Granularidade): string[] {
  const out: string[] = []
  if (inicio > fim) return out
  if (g === 'mes') {
    let a = Number(inicio.slice(0, 4))
    let m = Number(inicio.slice(5, 7))
    const fimMes = fim.slice(0, 7)
    for (;;) {
      const k = `${a}-${String(m).padStart(2, '0')}`
      if (k > fimMes) break
      out.push(k)
      if (++m > 12) {
        m = 1
        a++
      }
    }
    return out
  }
  const passo = g === 'semana' ? 7 : 1
  let ms = utc(g === 'semana' ? inicioDaSemana(inicio) : inicio)
  const lim = utc(fim)
  for (; ms <= lim; ms += passo * DIA_MS) out.push(iso(ms))
  return out
}
/** Período imediatamente anterior, com o mesmo número de dias. */
export function periodoAnterior(inicio: string, fim: string): { inicio: string; fim: string } {
  const n = diasEntre(inicio, fim)
  return { inicio: somarDias(inicio, -n), fim: somarDias(inicio, -1) }
}

// ----------------------------------------------------------------------------------------------
// Acesso ao cubo
// ----------------------------------------------------------------------------------------------

export function dimensao(cubo: Cubo, nome: string): DimCubo | undefined {
  return cubo.dims.find((d) => d.nome === nome)
}
export function medida(cubo: Cubo, nome: string): MedidaCubo | undefined {
  return cubo.medidas.find((m) => m.nome === nome)
}
/** Dimensão de tempo do cubo: `data` (diária) ou `mes` (mensal). */
export function dimTempo(cubo: Cubo): DimCubo | undefined {
  return dimensao(cubo, 'data') ?? dimensao(cubo, 'mes')
}
/** Menor e maior data presentes no cubo (YYYY-MM-DD ou YYYY-MM). */
export function intervaloDoCubo(cubo: Cubo): { inicio: string; fim: string } | null {
  const t = dimTempo(cubo)
  if (!t || !t.valores.length) return null
  let a = t.valores[0]
  let b = t.valores[0]
  for (const v of t.valores) {
    if (v < a) a = v
    if (v > b) b = v
  }
  return { inicio: a, fim: b }
}

function mascaraDe(dim: DimCubo, aceita: (valor: string) => boolean): Uint8Array {
  const m = new Uint8Array(dim.valores.length)
  for (let i = 0; i < m.length; i++) m[i] = aceita(dim.valores[i]) ? 1 : 0
  return m
}

// ----------------------------------------------------------------------------------------------
// filtrar
// ----------------------------------------------------------------------------------------------

/**
 * Seleciona as linhas do cubo que atendem aos filtros e calcula os pesos de alocação geográfica.
 * `meta` só é necessário quando há filtro de regional/UF em cubo que não tem a dimensão correspondente.
 */
export function filtrar(cubo: Cubo, filtros: FiltrosCubo = {}, meta?: MetaCubo | null): LinhasFiltradas {
  const n = cubo.n
  const mascaras: { col: number[]; m: Uint8Array }[] = []
  let pesoGlobal = 1
  let pesoPorValor: { col: number[]; w: Float64Array } | null = null

  const add = (dim: DimCubo, aceita: (valor: string) => boolean) => {
    const col = cubo.colunas[dim.nome]
    if (col) mascaras.push({ col, m: mascaraDe(dim, aceita) })
  }

  // período
  const tempo = dimTempo(cubo)
  if (tempo && (filtros.inicio || filtros.fim)) {
    const mensal = tempo.nome === 'mes'
    const ini = filtros.inicio ? (mensal ? filtros.inicio.slice(0, 7) : filtros.inicio) : ''
    const fim = filtros.fim ? (mensal ? filtros.fim.slice(0, 7) : filtros.fim) : '￿'
    add(tempo, (v) => v >= ini && v <= fim)
  }

  // segmento
  const segs = filtros.segmentos
  const dSeg = dimensao(cubo, 'segmento')
  if (dSeg && segs?.length) {
    const s = new Set(segs)
    add(dSeg, (v) => s.has(v))
  }

  // demais dimensões nomeadas (canal, faixa_atraso, ...)
  if (filtros.dims) {
    for (const nome of Object.keys(filtros.dims)) {
      const sel = filtros.dims[nome]
      const d = dimensao(cubo, nome)
      if (!d || !sel?.length) continue
      const s = new Set(sel)
      add(d, (v) => s.has(v))
    }
  }

  // geografia
  const ufs = filtros.ufs ?? []
  const regs = filtros.regionais ?? []
  if (ufs.length || regs.length) {
    const dUf = dimensao(cubo, 'uf')
    const dReg = dimensao(cubo, 'regional')
    const regDaUf = new Map<string, string>()
    for (const u of meta?.ufs ?? []) regDaUf.set(u.sigla, u.regional)
    const pUf = meta?.pesos_uf ?? {}
    const pReg = meta?.pesos_regional ?? {}

    if (dUf) {
      // nativo; a regional é derivada da UF (cubos com uf e regional também caem aqui)
      const sUf = new Set(ufs)
      const sReg = new Set(regs)
      add(dUf, (v) => (ufs.length ? sUf.has(v) : sReg.has(regDaUf.get(v) ?? '')))
    } else if (dReg) {
      if (ufs.length) {
        // peso da regional = soma das participações das UFs escolhidas dentro dela
        const w = new Float64Array(dReg.valores.length)
        for (const uf of ufs) {
          const r = regDaUf.get(uf)
          const i = r ? dReg.valores.indexOf(r) : -1
          if (i >= 0) w[i] += pUf[uf] ?? 0
        }
        const col = cubo.colunas[dReg.nome]
        mascaras.push({ col, m: mascaraDe(dReg, (v) => w[dReg.valores.indexOf(v)] > 0) })
        pesoPorValor = { col, w }
      } else {
        const sReg = new Set(regs)
        add(dReg, (v) => sReg.has(v))
      }
    } else if (ufs.length) {
      pesoGlobal = 0
      for (const uf of ufs) pesoGlobal += (pReg[regDaUf.get(uf) ?? ''] ?? 0) * (pUf[uf] ?? 0)
    } else {
      pesoGlobal = 0
      for (const r of regs) pesoGlobal += pReg[r] ?? 0
    }
  }

  // varredura única
  const nm = mascaras.length
  const tmp = new Int32Array(n)
  let k = 0
  if (nm === 0) {
    for (let i = 0; i < n; i++) tmp[i] = i
    k = n
  } else {
    linhas: for (let i = 0; i < n; i++) {
      for (let j = 0; j < nm; j++) {
        const mk = mascaras[j]
        if (mk.m[mk.col[i]] === 0) continue linhas
      }
      tmp[k++] = i
    }
  }
  const idx = tmp.slice(0, k)

  let pesos: Float64Array | null = null
  if (pesoPorValor) {
    const { col, w } = pesoPorValor as { col: number[]; w: Float64Array }
    pesos = new Float64Array(k)
    for (let j = 0; j < k; j++) pesos[j] = w[col[idx[j]]]
  }
  return { idx, pesos, pesoGlobal }
}

// ----------------------------------------------------------------------------------------------
// agregação
// ----------------------------------------------------------------------------------------------

interface OpcoesAgregacao {
  /** quando informado e a dimensão de tempo está em `dims`, o tempo é agrupado em buckets */
  granularidade?: Granularidade
}

function agregar(
  cubo: Cubo,
  linhas: LinhasFiltradas,
  dims: string[],
  nomesMedidas: string[] | undefined,
  opcoes: OpcoesAgregacao = {},
): LinhaAgrupada[] {
  const meds = (nomesMedidas ?? cubo.medidas.map((m) => m.nome))
    .map((nm) => medida(cubo, nm))
    .filter((m): m is MedidaCubo => !!m && !!cubo.colunas[m.nome])
  const { idx, pesos, pesoGlobal } = linhas
  const k = idx.length
  const tempo = dimTempo(cubo)
  const colTempo = tempo ? cubo.colunas[tempo.nome] : undefined

  // tradução por dimensão: índice do dicionário -> índice do grupo (identidade, exceto tempo com bucket)
  const eixos = dims.map((nome) => {
    const d = dimensao(cubo, nome)
    if (!d) throw new Error(`Cubo "${cubo.id}" não tem a dimensão "${nome}"`)
    const col = cubo.colunas[nome]
    if (tempo && nome === tempo.nome && opcoes.granularidade) {
      const rotulos: string[] = []
      const pos = new Map<string, number>()
      const mapa = new Int32Array(d.valores.length)
      for (let i = 0; i < d.valores.length; i++) {
        const b = bucketDe(d.valores[i], opcoes.granularidade)
        let p = pos.get(b)
        if (p === undefined) {
          p = rotulos.length
          rotulos.push(b)
          pos.set(b, p)
        }
        mapa[i] = p
      }
      return { col, mapa, rotulos, card: rotulos.length, tempo: true }
    }
    return { col, mapa: null as Int32Array | null, rotulos: d.valores, card: d.valores.length, tempo: nome === tempo?.nome }
  })
  const eixoTempo = eixos.find((e) => e.tempo)

  // fotografia das medidas de estoque: última data do período (ou de cada bucket de tempo)
  const temEstoque = meds.some((m) => m.tipo === 'estoque') && !!tempo && !!colTempo
  let ordem: Int32Array | null = null // posição cronológica de cada valor do dicionário de tempo
  let ultimaPorBucket: Int32Array | null = null
  if (temEstoque && tempo && colTempo) {
    const ord = tempo.valores.map((v, i) => [v, i] as const).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    ordem = new Int32Array(tempo.valores.length)
    for (let r = 0; r < ord.length; r++) ordem[ord[r][1]] = r
    ultimaPorBucket = new Int32Array(eixoTempo ? eixoTempo.card : 1).fill(-1)
    for (let j = 0; j < k; j++) {
      const t = colTempo[idx[j]]
      const b = eixoTempo ? (eixoTempo.mapa ? eixoTempo.mapa[t] : t) : 0
      if (ordem[t] > ultimaPorBucket[b]) ultimaPorBucket[b] = ordem[t]
    }
  }

  // chave de grupo em base mista
  const ne = eixos.length
  const mult = new Array<number>(ne)
  let total = 1
  for (let e = ne - 1; e >= 0; e--) {
    mult[e] = total
    total *= Math.max(1, eixos[e].card)
  }
  const slotDe = new Map<number, number>()
  const chaves: number[] = []
  const nmed = meds.length
  const acum: number[][] = meds.map(() => [])
  const colsMed = meds.map((m) => cubo.colunas[m.nome])
  const ehEstoque = meds.map((m) => m.tipo === 'estoque' && temEstoque)

  for (let j = 0; j < k; j++) {
    const i = idx[j]
    let chave = 0
    for (let e = 0; e < ne; e++) {
      const ex = eixos[e]
      const v = ex.col[i]
      chave += (ex.mapa ? ex.mapa[v] : v) * mult[e]
    }
    let s = slotDe.get(chave)
    if (s === undefined) {
      s = chaves.length
      slotDe.set(chave, s)
      chaves.push(chave)
      for (let m = 0; m < nmed; m++) acum[m].push(0)
    }
    const w = (pesos ? pesos[j] : 1) * pesoGlobal
    let naFoto = true
    if (ultimaPorBucket && ordem && colTempo) {
      const t = colTempo[i]
      const b = eixoTempo ? (eixoTempo.mapa ? eixoTempo.mapa[t] : t) : 0
      naFoto = ordem[t] === ultimaPorBucket[b]
    }
    for (let m = 0; m < nmed; m++) {
      if (ehEstoque[m] && !naFoto) continue
      acum[m][s] += colsMed[m][i] * w
    }
  }

  const out: LinhaAgrupada[] = new Array(chaves.length)
  for (let s = 0; s < chaves.length; s++) {
    let resto = chaves[s]
    const chave = new Array<string>(ne)
    for (let e = 0; e < ne; e++) {
      const p = Math.floor(resto / mult[e])
      resto -= p * mult[e]
      chave[e] = eixos[e].rotulos[p]
    }
    const valores: Record<string, number> = {}
    for (let m = 0; m < nmed; m++) valores[meds[m].nome] = acum[m][s]
    out[s] = { chave, valores }
  }
  return out
}

/**
 * Agrupa as linhas filtradas por uma ou mais dimensões e soma as medidas (todas, se omitidas).
 * Medidas `estoque` usam a última fotografia do período (ou a própria data, se `data`/`mes` estiver em `dims`).
 * A ordem do resultado segue a primeira aparição; ordene com `ordenarPor` se precisar.
 */
export function agrupar(cubo: Cubo, linhas: LinhasFiltradas, dims: string[], medidas?: string[]): LinhaAgrupada[] {
  return agregar(cubo, linhas, dims, medidas)
}

/** Totais das medidas na seleção (sem agrupar). Sempre devolve todas as medidas pedidas (0 se vazio). */
export function totais(cubo: Cubo, linhas: LinhasFiltradas, medidas?: string[]): Record<string, number> {
  const nomes = medidas ?? cubo.medidas.map((m) => m.nome)
  const r = agregar(cubo, linhas, [], nomes)[0]?.valores ?? {}
  const out: Record<string, number> = {}
  for (const nm of nomes) out[nm] = r[nm] ?? 0
  return out
}

export function ordenarPor(linhas: LinhaAgrupada[], medidaNome: string, direcao: 'asc' | 'desc' = 'desc'): LinhaAgrupada[] {
  const s = direcao === 'desc' ? -1 : 1
  return [...linhas].sort((a, b) => s * ((a.valores[medidaNome] ?? 0) - (b.valores[medidaNome] ?? 0)))
}

/**
 * Série temporal por granularidade (semanas começam na segunda). Buckets sem dados entram com 0.
 * Passe { inicio, fim } para forçar o eixo a cobrir todo o período filtrado.
 * Cubos mensais (dimensão `mes`) sempre saem em granularidade mensal.
 */
export function serieTemporal(
  cubo: Cubo,
  linhas: LinhasFiltradas,
  granularidade: Granularidade,
  medidas?: string[],
  periodo?: { inicio?: string | null; fim?: string | null },
): SerieTemporal {
  const nomes = medidas ?? cubo.medidas.map((m) => m.nome)
  const tempo = dimTempo(cubo)
  const vazio: SerieTemporal = { buckets: [], rotulos: [], valores: Object.fromEntries(nomes.map((m) => [m, []])) }
  if (!tempo) return vazio
  const g: Granularidade = tempo.nome === 'mes' ? 'mes' : granularidade
  const grupos = agregar(cubo, linhas, [tempo.nome], nomes, { granularidade: g })
  const buckets = eixoDeBuckets(cubo, grupos.map((x) => x.chave[0]), g, periodo)
  const pos = new Map(buckets.map((b, i) => [b, i]))
  const valores: Record<string, number[]> = {}
  for (const nm of nomes) valores[nm] = new Array<number>(buckets.length).fill(0)
  for (const gr of grupos) {
    const p = pos.get(gr.chave[0])
    if (p === undefined) continue
    for (const nm of nomes) valores[nm][p] = gr.valores[nm] ?? 0
  }
  return { buckets, rotulos: buckets.map(rotuloBucket), valores }
}

/** Série temporal de UMA medida quebrada por uma dimensão (ex.: vendas por segmento ao longo do tempo). */
export function serieTemporalPor(
  cubo: Cubo,
  linhas: LinhasFiltradas,
  granularidade: Granularidade,
  dim: string,
  medidaNome: string,
  periodo?: { inicio?: string | null; fim?: string | null },
): SeriePorDimensao {
  const tempo = dimTempo(cubo)
  if (!tempo) return { buckets: [], rotulos: [], series: [] }
  const g: Granularidade = tempo.nome === 'mes' ? 'mes' : granularidade
  const grupos = agregar(cubo, linhas, [tempo.nome, dim], [medidaNome], { granularidade: g })
  const buckets = eixoDeBuckets(cubo, grupos.map((x) => x.chave[0]), g, periodo)
  const pos = new Map(buckets.map((b, i) => [b, i]))
  const porNome = new Map<string, number[]>()
  for (const gr of grupos) {
    const p = pos.get(gr.chave[0])
    if (p === undefined) continue
    let arr = porNome.get(gr.chave[1])
    if (!arr) {
      arr = new Array<number>(buckets.length).fill(0)
      porNome.set(gr.chave[1], arr)
    }
    arr[p] = gr.valores[medidaNome] ?? 0
  }
  // ordem estável: a do dicionário da dimensão (a cor segue a entidade, não o ranking)
  const ordemDim = dimensao(cubo, dim)?.valores ?? []
  const series = ordemDim
    .filter((nome) => porNome.has(nome))
    .map((nome) => {
      const valores = porNome.get(nome) as number[]
      let total = 0
      for (const v of valores) total += v
      return { nome, valores, total }
    })
  return { buckets, rotulos: buckets.map(rotuloBucket), series }
}

function eixoDeBuckets(
  cubo: Cubo,
  presentes: string[],
  g: Granularidade,
  periodo?: { inicio?: string | null; fim?: string | null },
): string[] {
  const lim = intervaloDoCubo(cubo)
  let ini = periodo?.inicio ?? null
  let fim = periodo?.fim ?? null
  if (presentes.length) {
    let a = presentes[0]
    let b = presentes[0]
    for (const p of presentes) {
      if (p < a) a = p
      if (p > b) b = p
    }
    if (!ini) ini = a
    if (!fim) fim = b
  }
  if (!ini || !fim) return []
  // nunca estende o eixo além do que o cubo cobre
  if (lim) {
    const li = lim.inicio.length === 7 ? `${lim.inicio}-01` : lim.inicio
    const lf = lim.fim.length === 7 ? `${lim.fim}-28` : lim.fim
    if (ini.length === 10 && ini < li) ini = li
    if (fim.length === 10 && fim > lf) fim = lf
  }
  const norm = (d: string) => (d.length === 7 ? `${d}-01` : d)
  return gerarBuckets(norm(ini), norm(fim), g)
}

// ----------------------------------------------------------------------------------------------
// comparação com o período anterior
// ----------------------------------------------------------------------------------------------

export interface Comparacao {
  atual: Record<string, number>
  anterior: Record<string, number>
  /** (atual − anterior) / |anterior|, ou null quando não há base de comparação */
  variacao: Record<string, number | null>
  periodoAnterior: { inicio: string; fim: string } | null
}

/**
 * Totais do período filtrado e do período imediatamente anterior de mesmo tamanho (mesmos demais filtros).
 * Sem `inicio`/`fim` nos filtros não há comparação (anterior = 0, variacao = null).
 * Para razões, calcule a razão em `atual` e em `anterior` e compare com `variacao()` de formato.ts.
 */
export function compararPeriodos(cubo: Cubo, filtros: FiltrosCubo, meta?: MetaCubo | null, medidas?: string[]): Comparacao {
  const nomes = medidas ?? cubo.medidas.map((m) => m.nome)
  const atual = totais(cubo, filtrar(cubo, filtros, meta), nomes)
  const zero = Object.fromEntries(nomes.map((m) => [m, 0]))
  if (!filtros.inicio || !filtros.fim) {
    return { atual, anterior: zero, variacao: Object.fromEntries(nomes.map((m) => [m, null])), periodoAnterior: null }
  }
  const ant = periodoAnterior(filtros.inicio, filtros.fim)
  const lim = intervaloDoCubo(cubo)
  const semBase = !!lim && ant.fim < (lim.inicio.length === 7 ? `${lim.inicio}-01` : lim.inicio)
  const anterior = semBase ? zero : totais(cubo, filtrar(cubo, { ...filtros, ...ant }, meta), nomes)
  const variacao: Record<string, number | null> = {}
  for (const m of nomes) {
    const b = anterior[m]
    variacao[m] = semBase || !b ? null : (atual[m] - b) / Math.abs(b)
  }
  return { atual, anterior, variacao, periodoAnterior: ant }
}

/** Divisão segura para razões (ticket médio, % inadimplência...). */
export function razao(numerador: number | null | undefined, denominador: number | null | undefined): number | null {
  if (numerador == null || !denominador || !Number.isFinite(numerador / denominador)) return null
  return numerador / denominador
}
