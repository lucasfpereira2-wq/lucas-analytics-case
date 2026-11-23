/**
 * Filtros globais dos relatórios (zustand). O "hoje" é meta.fim_historico, nunca o relógio.
 *
 *   const f = useFiltrosResolvidos({ dimCanal: 'canal' })
 *   const linhas = useMemo(() => filtrar(cubo, f.filtrosCubo, f.meta), [cubo, f.filtrosCubo, f.meta])
 *   serieTemporal(cubo, linhas, f.granularidade, ['valor'], f.periodo)
 */
import { useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { create } from 'zustand'
import type { Meta } from '@/types/governanca'
import { diasEntre, somarDias, type FiltrosCubo, type Granularidade } from './cubo'
import { useMeta } from './dados'
import { FIM_HISTORICO_PADRAO, INICIO_HISTORICO_PADRAO } from './referencia'

export type PresetPeriodo = '30d' | '90d' | 'mes_atual' | 'mes_anterior' | 'ano_atual' | '12m' | 'tudo' | 'personalizado'

export const PRESETS_PERIODO: { id: PresetPeriodo; rotulo: string }[] = [
  { id: '30d', rotulo: 'Últimos 30 dias' },
  { id: '90d', rotulo: 'Últimos 90 dias' },
  { id: 'mes_atual', rotulo: 'Mês atual' },
  { id: 'mes_anterior', rotulo: 'Mês anterior' },
  { id: 'ano_atual', rotulo: 'Ano atual' },
  { id: '12m', rotulo: 'Últimos 12 meses' },
  { id: 'tudo', rotulo: 'Todo o histórico' },
]

export const GRANULARIDADES: { id: Granularidade; rotulo: string }[] = [
  { id: 'dia', rotulo: 'Dia' },
  { id: 'semana', rotulo: 'Semana' },
  { id: 'mes', rotulo: 'Mês' },
]

/** Acima deste tamanho de período a granularidade "dia" é desabilitada. */
export const LIMITE_DIAS_GRANULARIDADE_DIA = 120

export interface Periodo {
  inicio: string
  fim: string
}

interface EstadoFiltros {
  preset: PresetPeriodo
  /** usado quando preset = 'personalizado' */
  personalizado: Periodo | null
  granularidade: Granularidade
  segmentos: string[]
  regionais: string[]
  ufs: string[]
  canais: string[]
  definirPreset: (p: PresetPeriodo) => void
  definirPersonalizado: (p: Periodo) => void
  definirGranularidade: (g: Granularidade) => void
  definirSegmentos: (v: string[]) => void
  /** ao mudar a regional, as UFs fora dela são descartadas (precisa do meta para saber a regional de cada UF) */
  definirRegionais: (v: string[], meta?: Pick<Meta, 'ufs'> | null) => void
  definirUfs: (v: string[]) => void
  definirCanais: (v: string[]) => void
  aplicar: (parcial: Partial<Pick<EstadoFiltros, 'preset' | 'personalizado' | 'granularidade' | 'segmentos' | 'regionais' | 'ufs' | 'canais'>>) => void
  limpar: () => void
}

export const FILTROS_PADRAO = {
  preset: '12m' as PresetPeriodo,
  personalizado: null as Periodo | null,
  granularidade: 'mes' as Granularidade,
  segmentos: [] as string[],
  regionais: [] as string[],
  ufs: [] as string[],
  canais: [] as string[],
}

export const useFiltros = create<EstadoFiltros>((set) => ({
  ...FILTROS_PADRAO,
  definirPreset: (preset) => set({ preset }),
  definirPersonalizado: (personalizado) => set({ preset: 'personalizado', personalizado }),
  definirGranularidade: (granularidade) => set({ granularidade }),
  definirSegmentos: (segmentos) => set({ segmentos }),
  definirRegionais: (regionais, meta) =>
    set((s) => {
      if (!regionais.length || !meta) return { regionais, ufs: regionais.length ? [] : s.ufs }
      const reg = new Map(meta.ufs.map((u) => [u.sigla, u.regional]))
      return { regionais, ufs: s.ufs.filter((u) => regionais.includes(reg.get(u) ?? '')) }
    }),
  definirUfs: (ufs) => set({ ufs }),
  definirCanais: (canais) => set({ canais }),
  aplicar: (parcial) => set(parcial),
  limpar: () => set({ ...FILTROS_PADRAO }),
}))

/** Converte preset em datas concretas, ancorado no fim do histórico (D-1 da data de referência). */
export function resolverPeriodo(
  preset: PresetPeriodo,
  personalizado: Periodo | null,
  limites: { inicio: string; fim: string },
): Periodo {
  const hoje = limites.fim
  const ano = Number(hoje.slice(0, 4))
  const mes = Number(hoje.slice(5, 7))
  const primeiroDoMes = (a: number, m: number) => {
    const d = new Date(Date.UTC(a, m - 1, 1))
    return d.toISOString().slice(0, 10)
  }
  let p: Periodo
  switch (preset) {
    case '30d':
      p = { inicio: somarDias(hoje, -29), fim: hoje }
      break
    case '90d':
      p = { inicio: somarDias(hoje, -89), fim: hoje }
      break
    case 'mes_atual':
      p = { inicio: primeiroDoMes(ano, mes), fim: hoje }
      break
    case 'mes_anterior':
      p = { inicio: primeiroDoMes(ano, mes - 1), fim: somarDias(primeiroDoMes(ano, mes), -1) }
      break
    case 'ano_atual':
      p = { inicio: `${ano}-01-01`, fim: hoje }
      break
    case '12m':
      p = { inicio: primeiroDoMes(ano, mes - 11), fim: hoje } // 12 meses-calendário, incluindo o atual
      break
    case 'personalizado':
      p = personalizado ?? { inicio: limites.inicio, fim: hoje }
      break
    default:
      p = { inicio: limites.inicio, fim: hoje }
  }
  // nunca sai do histórico disponível
  const inicio = p.inicio < limites.inicio ? limites.inicio : p.inicio > limites.fim ? limites.fim : p.inicio
  const fim = p.fim > limites.fim ? limites.fim : p.fim < inicio ? inicio : p.fim
  return { inicio, fim }
}

export function rotuloPreset(preset: PresetPeriodo): string {
  return PRESETS_PERIODO.find((p) => p.id === preset)?.rotulo ?? 'Personalizado'
}

/** Granularidade efetiva: "dia" cai para "semana" quando o período passa do limite. */
export function granularidadeEfetiva(g: Granularidade, periodo: Periodo): Granularidade {
  return g === 'dia' && diasEntre(periodo.inicio, periodo.fim) > LIMITE_DIAS_GRANULARIDADE_DIA ? 'semana' : g
}

export interface FiltrosResolvidos {
  meta: Meta | null
  /** limites do histórico disponível */
  limites: Periodo
  periodo: Periodo
  dias: number
  preset: PresetPeriodo
  /** granularidade já ajustada ao tamanho do período */
  granularidade: Granularidade
  diaDesabilitado: boolean
  segmentos: string[]
  regionais: string[]
  ufs: string[]
  canais: string[]
  /** pronto para `filtrar(cubo, filtrosCubo, meta)`; referência estável enquanto os filtros não mudam */
  filtrosCubo: FiltrosCubo
  /** quantos filtros (fora período/granularidade) estão ativos */
  ativos: number
}

/**
 * Filtros prontos para consumo pelos relatórios.
 * `dimCanal`: nome da dimensão do cubo que o filtro "canal" controla (padrão: 'canal').
 */
export function useFiltrosResolvidos(opcoes: { dimCanal?: string } = {}): FiltrosResolvidos {
  const { dados: meta } = useMeta()
  const s = useFiltros()
  const dimCanal = opcoes.dimCanal ?? 'canal'
  const ini = meta?.inicio_historico ?? INICIO_HISTORICO_PADRAO
  const fim = meta?.fim_historico ?? FIM_HISTORICO_PADRAO
  return useMemo(() => {
    const limites = { inicio: ini, fim }
    const periodo = resolverPeriodo(s.preset, s.personalizado, limites)
    const dias = diasEntre(periodo.inicio, periodo.fim)
    return {
      meta,
      limites,
      periodo,
      dias,
      preset: s.preset,
      granularidade: granularidadeEfetiva(s.granularidade, periodo),
      diaDesabilitado: dias > LIMITE_DIAS_GRANULARIDADE_DIA,
      segmentos: s.segmentos,
      regionais: s.regionais,
      ufs: s.ufs,
      canais: s.canais,
      filtrosCubo: {
        inicio: periodo.inicio,
        fim: periodo.fim,
        segmentos: s.segmentos,
        regionais: s.regionais,
        ufs: s.ufs,
        dims: { [dimCanal]: s.canais },
      },
      ativos: s.segmentos.length + s.regionais.length + s.ufs.length + s.canais.length,
    }
  }, [meta, ini, fim, dimCanal, s.preset, s.personalizado, s.granularidade, s.segmentos, s.regionais, s.ufs, s.canais])
}

// ----------------------------------------------------------------------------------------------
// Sincronização com a URL (query string do hash): #/relatorios/vendas?p=90d&g=semana&seg=Imóveis,Autos
// ----------------------------------------------------------------------------------------------

const lista = (v: string | null) => (v ? v.split(',').map((x) => x.trim()).filter(Boolean) : [])
const ehData = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v)

/** Lê os filtros da URL ao montar e mantém a URL atualizada. Já é chamado pela BarraFiltros. */
export function useSincronizarFiltrosURL() {
  const [params, setParams] = useSearchParams()
  const lido = useRef(false)

  useEffect(() => {
    if (lido.current) return
    lido.current = true
    if ([...params.keys()].length === 0) return
    const p = params.get('p') as PresetPeriodo | null
    const g = params.get('g') as Granularidade | null
    const de = params.get('de')
    const ate = params.get('ate')
    const parcial: Parameters<EstadoFiltros['aplicar']>[0] = {
      segmentos: lista(params.get('seg')),
      regionais: lista(params.get('reg')),
      ufs: lista(params.get('uf')),
      canais: lista(params.get('canal')),
    }
    if (ehData(de) && ehData(ate) && de <= ate) {
      parcial.preset = 'personalizado'
      parcial.personalizado = { inicio: de, fim: ate }
    } else if (p && PRESETS_PERIODO.some((x) => x.id === p)) {
      parcial.preset = p
    }
    if (g && GRANULARIDADES.some((x) => x.id === g)) parcial.granularidade = g
    useFiltros.getState().aplicar(parcial)
  }, [params])

  const s = useFiltros()
  useEffect(() => {
    if (!lido.current) return
    const q = new URLSearchParams()
    if (s.preset === 'personalizado' && s.personalizado) {
      q.set('de', s.personalizado.inicio)
      q.set('ate', s.personalizado.fim)
    } else if (s.preset !== FILTROS_PADRAO.preset) q.set('p', s.preset)
    if (s.granularidade !== FILTROS_PADRAO.granularidade) q.set('g', s.granularidade)
    if (s.segmentos.length) q.set('seg', s.segmentos.join(','))
    if (s.regionais.length) q.set('reg', s.regionais.join(','))
    if (s.ufs.length) q.set('uf', s.ufs.join(','))
    if (s.canais.length) q.set('canal', s.canais.join(','))
    const atual = new URLSearchParams(window.location.hash.split('?')[1] ?? '')
    if (q.toString() !== atual.toString()) setParams(q, { replace: true })
  }, [s.preset, s.personalizado, s.granularidade, s.segmentos, s.regionais, s.ufs, s.canais, setParams])
}
