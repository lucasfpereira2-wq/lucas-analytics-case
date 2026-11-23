import { describe, expect, it } from 'vitest'
import type { Cubo } from '@/types/cubo'
import {
  agrupar,
  compararPeriodos,
  filtrar,
  gerarBuckets,
  inicioDaSemana,
  periodoAnterior,
  serieTemporal,
  totais,
  type MetaCubo,
} from './cubo'

const meta: MetaCubo = {
  ufs: [
    { sigla: 'PR', nome: 'Paraná', regional: 'Sul' },
    { sigla: 'SC', nome: 'Santa Catarina', regional: 'Sul' },
    { sigla: 'SP', nome: 'São Paulo', regional: 'Sudeste' },
  ],
  pesos_uf: { PR: 0.6, SC: 0.4, SP: 1 },
  pesos_regional: { Sul: 0.25, Sudeste: 0.75 },
}

// 4 datas x 2 segmentos x 2 regionais; fluxo = 10 por linha; estoque = dia do mês
const datas = ['2026-11-01', '2026-11-02', '2026-11-08', '2026-11-09'] // dom, seg, dom, seg
function cuboRegional(): Cubo {
  const c: Cubo = {
    id: 't',
    descricao: '',
    dims: [
      { nome: 'data', rotulo: 'Data', valores: datas },
      { nome: 'segmento', rotulo: 'Segmento', valores: ['Imóveis', 'Autos'] },
      { nome: 'regional', rotulo: 'Regional', valores: ['Sul', 'Sudeste'] },
    ],
    medidas: [
      { nome: 'qtd', rotulo: 'Qtd', formato: 'int', tipo: 'fluxo' },
      { nome: 'saldo', rotulo: 'Saldo', formato: 'brl', tipo: 'estoque' },
    ],
    n: 0,
    colunas: { data: [], segmento: [], regional: [], qtd: [], saldo: [] },
  }
  for (let d = 0; d < 4; d++)
    for (let s = 0; s < 2; s++)
      for (let r = 0; r < 2; r++) {
        c.colunas.data.push(d)
        c.colunas.segmento.push(s)
        c.colunas.regional.push(r)
        c.colunas.qtd.push(10)
        c.colunas.saldo.push(Number(datas[d].slice(8)))
        c.n++
      }
  return c
}

describe('cubo', () => {
  it('filtra dimensões nativas e totaliza; estoque usa a última fotografia', () => {
    const c = cuboRegional()
    const l = filtrar(c, { inicio: '2026-11-01', fim: '2026-11-08', segmentos: ['Autos'] }, meta)
    expect(l.idx.length).toBe(6)
    const t = totais(c, l)
    expect(t.qtd).toBe(60)
    expect(t.saldo).toBe(16) // só 08/11: 2 regionais x 8, sem somar as datas anteriores
    const g = agrupar(c, l, ['regional'], ['qtd', 'saldo'])
    expect(g).toHaveLength(2)
    expect(g.find((x) => x.chave[0] === 'Sul')?.valores).toEqual({ qtd: 30, saldo: 8 })
  })

  it('aloca UF em cubo só com regional (pesos_uf) e pondera cubo sem geografia (pesos_regional)', () => {
    const c = cuboRegional()
    const l = filtrar(c, { ufs: ['PR'] }, meta)
    expect(l.idx.length).toBe(8) // só linhas da regional Sul
    expect(totais(c, l, ['qtd']).qtd).toBeCloseTo(80 * 0.6)
    expect(totais(c, filtrar(c, { ufs: ['PR', 'SC'] }, meta), ['qtd']).qtd).toBeCloseTo(80)

    const semGeo: Cubo = {
      ...c,
      dims: c.dims.filter((d) => d.nome !== 'regional'),
    }
    expect(totais(semGeo, filtrar(semGeo, { regionais: ['Sul'] }, meta), ['qtd']).qtd).toBeCloseTo(160 * 0.25)
    expect(totais(semGeo, filtrar(semGeo, { ufs: ['PR'] }, meta), ['qtd']).qtd).toBeCloseTo(160 * 0.25 * 0.6)

    const soUf: Cubo = {
      ...c,
      dims: [c.dims[0], c.dims[1], { nome: 'uf', rotulo: 'UF', valores: ['PR', 'SP'] }],
      colunas: { ...c.colunas, uf: c.colunas.regional },
    }
    expect(filtrar(soUf, { regionais: ['Sudeste'] }, meta).idx.length).toBe(8)
  })

  it('monta série semanal começando na segunda, com estoque por bucket e buracos preenchidos', () => {
    expect(inicioDaSemana('2026-11-01')).toBe('2026-10-26')
    expect(inicioDaSemana('2026-11-02')).toBe('2026-11-02')
    expect(gerarBuckets('2026-11-01', '2026-11-09', 'semana')).toEqual(['2026-10-26', '2026-11-02', '2026-11-09'])
    const c = cuboRegional()
    const s = serieTemporal(c, filtrar(c, {}, meta), 'semana')
    expect(s.buckets).toEqual(['2026-10-26', '2026-11-02', '2026-11-09'])
    expect(s.valores.qtd).toEqual([40, 80, 40])
    expect(s.valores.saldo).toEqual([4, 32, 36]) // última data de cada semana x 4 combinações
    const m = serieTemporal(c, filtrar(c, {}, meta), 'mes', ['qtd', 'saldo'])
    expect(m.buckets).toEqual(['2026-11'])
    expect(m.valores.saldo).toEqual([36])
    const d = serieTemporal(c, filtrar(c, {}, meta), 'dia', ['qtd'])
    expect(d.buckets).toHaveLength(9)
    expect(d.valores.qtd[2]).toBe(0)
  })

  it('compara com o período anterior de mesmo tamanho', () => {
    expect(periodoAnterior('2026-11-08', '2026-11-09')).toEqual({ inicio: '2026-11-06', fim: '2026-11-07' })
    const c = cuboRegional()
    const r = compararPeriodos(c, { inicio: '2026-11-08', fim: '2026-11-09' }, meta, ['qtd'])
    expect(r.atual.qtd).toBe(80)
    expect(r.anterior.qtd).toBe(0)
    expect(r.variacao.qtd).toBeNull()
    const r2 = compararPeriodos(c, { inicio: '2026-11-05', fim: '2026-11-09' }, meta, ['qtd'])
    expect(r2.anterior.qtd).toBe(80) // 31/10 a 04/11 -> 01 e 02/11
    expect(r2.variacao.qtd).toBe(0)
  })
})
