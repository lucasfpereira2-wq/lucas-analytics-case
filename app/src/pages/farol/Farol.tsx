import { Grid3x3, KeyRound, LayoutGrid, List, Radar, Search, SearchX, UserRoundX, X, type LucideIcon } from 'lucide-react'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EmptyState, STATUS_INFO } from '@/components/dados'
import { Pagina } from '@/components/layout/Pagina'
import { MultiSelecao, type OpcaoSelecao } from '@/components/relatorio/MultiSelecao'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCatalogo, useMeta } from '@/lib/dados'
import { fmtDataHora, fmtNumero, fmtPct } from '@/lib/formato'
import { cn } from '@/lib/utils'
import type { Camada, Criticidade, Status, TabelaResumo } from '@/types/governanca'
import { ROTULO_CAMADA, ROTULO_CRITICIDADE, SEM_DONO, ordemPadrao, semCrases } from './componentes/comum'
import { Grade } from './componentes/Grade'
import { Heatmap } from './componentes/Heatmap'
import { Lista } from './componentes/Lista'

type Visao = 'grade' | 'lista' | 'heatmap'
const VISOES: { id: Visao; rotulo: string; icone: LucideIcon }[] = [
  { id: 'grade', rotulo: 'Grade', icone: LayoutGrid },
  { id: 'lista', rotulo: 'Lista', icone: List },
  { id: 'heatmap', rotulo: 'Heatmap', icone: Grid3x3 },
]
const STATUS: Status[] = ['vermelho', 'amarelo', 'verde']
const CAMADAS: Camada[] = ['staging', 'core', 'mart']
const CRITICIDADES: Criticidade[] = ['alta', 'media', 'baixa']

/** Dimensões filtráveis (chave na URL → valor da tabela). */
const DIMENSOES = {
  status: (t: TabelaResumo) => t.status as string,
  dominio: (t: TabelaResumo) => t.dominio,
  camada: (t: TabelaResumo) => t.camada as string,
  dono: (t: TabelaResumo) => t.dono ?? SEM_DONO,
  criticidade: (t: TabelaResumo) => t.criticidade as string,
}
type Dimensao = keyof typeof DIMENSOES
const CHAVES = Object.keys(DIMENSOES) as Dimensao[]

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Cartão do resumo: número grande, rótulo e (quando clicável) estado de filtro ativo. */
function CartaoResumo({
  rotulo,
  valor,
  detalhe,
  icone,
  status,
  ativo,
  onClick,
}: {
  rotulo: string
  valor: number
  detalhe?: ReactNode
  icone?: ReactNode
  status?: Status
  ativo?: boolean
  onClick?: () => void
}) {
  const s = status ? STATUS_INFO[status] : null
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={onClick ? !!ativo : undefined}
      className={cn(
        'relative flex min-w-0 flex-col gap-1 overflow-hidden rounded-2xl border bg-card p-4 text-left shadow-card transition-[border-color,box-shadow,background-color] duration-150',
        onClick && 'hover:border-primary/60 hover:shadow-elevada',
        ativo ? 'border-primary bg-accent/50 ring-1 ring-primary' : 'border-border',
      )}
    >
      {s && <span className={cn('absolute inset-y-0 left-0 w-1', s.ponto)} aria-hidden />}
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icone}
        {rotulo}
      </span>
      <span className="tabular text-[28px] font-semibold leading-none tracking-tight">{fmtNumero(valor)}</span>
      <span className="min-h-4 truncate text-xs text-muted-foreground">{detalhe}</span>
    </Tag>
  )
}

function IconeStatus({ s }: { s: Status }) {
  const I = STATUS_INFO[s].icone
  return <I className={cn('size-3.5', STATUS_INFO[s].texto)} aria-hidden />
}

export default function Farol() {
  const { dados: catalogo, carregando } = useCatalogo()
  const { dados: meta } = useMeta()
  const [params, setParams] = useSearchParams()

  // ---- estado na URL -------------------------------------------------------
  const lista = useCallback((chave: string) => (params.get(chave) ?? '').split(',').map((v) => v.trim()).filter(Boolean), [params])
  const alterar = useCallback(
    (mudancas: Record<string, string | string[] | null>) => {
      setParams(
        (atual) => {
          const p = new URLSearchParams(atual)
          for (const [k, v] of Object.entries(mudancas)) {
            const valor = Array.isArray(v) ? v.join(',') : v
            if (valor) p.set(k, valor)
            else p.delete(k)
          }
          return p
        },
        { replace: true },
      )
    },
    [setParams],
  )
  // a busca tem estado local (digitação fluida) e é espelhada na URL
  const [busca, setBusca] = useState(() => params.get('q') ?? '')
  const semPk = params.get('pk') === 'sem'
  const visaoUrl = params.get('visao') as Visao | null
  const visao: Visao = visaoUrl && VISOES.some((v) => v.id === visaoUrl) ? visaoUrl : 'grade'
  const agrupar = params.get('grupo') === 'dominio'
  const sel = useMemo(() => Object.fromEntries(CHAVES.map((k) => [k, lista(k)])) as Record<Dimensao, string[]>, [lista])
  const alternar = (chave: Dimensao, valor: string) => {
    const atual = sel[chave]
    alterar({ [chave]: atual.includes(valor) ? atual.filter((v) => v !== valor) : [...atual, valor] })
  }

  // ---- filtragem -----------------------------------------------------------
  const todas = useMemo(() => catalogo?.tabelas ?? [], [catalogo])
  const passa = useCallback(
    (t: TabelaResumo, ignorar?: Dimensao) => {
      if (semPk && t.tem_pk) return false
      if (busca) {
        const alvo = normalizar(`${t.nome} ${t.descricao} ${semCrases(t.motivo_status)} ${t.pipeline} ${t.fonte ?? ''}`)
        if (!normalizar(busca).split(/\s+/).every((termo) => alvo.includes(termo))) return false
      }
      for (const k of CHAVES) {
        if (k === ignorar || sel[k].length === 0) continue
        if (!sel[k].includes(DIMENSOES[k](t))) return false
      }
      return true
    },
    [busca, semPk, sel],
  )
  const filtradas = useMemo(() => todas.filter((t) => passa(t)).sort(ordemPadrao), [todas, passa])

  /** Opções com contagem facetada (considera os demais filtros ativos). */
  const opcoes = useCallback(
    (chave: Dimensao, valores: string[], rotulo?: (v: string) => string): OpcaoSelecao[] => {
      const base = todas.filter((t) => passa(t, chave))
      const cont = new Map<string, number>()
      for (const t of base) cont.set(DIMENSOES[chave](t), (cont.get(DIMENSOES[chave](t)) ?? 0) + 1)
      return valores.map((v) => ({ valor: v, rotulo: rotulo?.(v), detalhe: fmtNumero(cont.get(v) ?? 0) }))
    },
    [todas, passa],
  )
  const dominios = useMemo(() => [...new Set(todas.map((t) => t.dominio))], [todas])
  const donos = useMemo(() => {
    const nomes = [...new Set(todas.map((t) => t.dono).filter((d): d is string => !!d))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
    return todas.some((t) => !t.dono) ? [SEM_DONO, ...nomes] : nomes
  }, [todas])

  const cont = useMemo(() => {
    const c = { verde: 0, amarelo: 0, vermelho: 0, semPk: 0, semDono: 0 }
    for (const t of todas) {
      c[t.status]++
      if (!t.tem_pk) c.semPk++
      if (!t.dono) c.semDono++
    }
    return c
  }, [todas])

  const filtrosAtivos = CHAVES.reduce((n, k) => n + sel[k].length, 0) + (busca ? 1 : 0) + (semPk ? 1 : 0)
  const limpar = () => {
    setBusca('')
    alterar({ q: null, pk: null, ...Object.fromEntries(CHAVES.map((k) => [k, null])) })
  }
  const total = todas.length

  const subtitulo = (
    <>
      Catálogo e monitoramento das {total || 80} tabelas do ambiente analítico: frescor, testes de qualidade, dono e SLA.
      {meta && <> Posição de {fmtDataHora(meta.data_referencia)}.</>}
    </>
  )

  if (carregando) {
    return (
      <Pagina titulo="Farol de Dados" subtitulo={subtitulo} icone={Radar}>
        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-[104px] rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-12 rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      </Pagina>
    )
  }
  if (!catalogo) {
    return (
      <Pagina titulo="Farol de Dados" subtitulo={subtitulo} icone={Radar}>
        <div className="rounded-2xl border border-dashed border-border bg-card/60">
          <EmptyState titulo="Catálogo ainda não disponível" descricao="Os dados de governança (catalogo.json) ainda não foram gerados neste ambiente." />
        </div>
      </Pagina>
    )
  }

  return (
    <Pagina titulo="Farol de Dados" subtitulo={subtitulo} icone={Radar}>
      {/* resumo: os cartões de status, sem PK e sem dono funcionam como filtro rápido */}
      <section className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6" aria-label="Resumo do catálogo">
        <div className="relative flex min-w-0 flex-col gap-1 rounded-2xl border border-border bg-card p-4 shadow-card">
          <span className="text-xs font-medium text-muted-foreground">Tabelas monitoradas</span>
          <span className="tabular text-[28px] font-semibold leading-none tracking-tight">{fmtNumero(total)}</span>
          <span className="mt-1.5 flex h-2 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={`${cont.verde} saudáveis, ${cont.amarelo} em atenção, ${cont.vermelho} críticas`}>
            {(['verde', 'amarelo', 'vermelho'] as Status[]).map((s) => (
              <span key={s} className={cn('h-full first:rounded-l-full last:rounded-r-full', STATUS_INFO[s].ponto)} style={{ width: `${(cont[s] / Math.max(1, total)) * 100}%` }} />
            ))}
          </span>
        </div>
        <CartaoResumo rotulo="Críticas" valor={cont.vermelho} status="vermelho" icone={<IconeStatus s="vermelho" />} detalhe={`${fmtPct(cont.vermelho / Math.max(1, total), 0)} do catálogo`} ativo={sel.status.includes('vermelho')} onClick={() => alternar('status', 'vermelho')} />
        <CartaoResumo rotulo="Em atenção" valor={cont.amarelo} status="amarelo" icone={<IconeStatus s="amarelo" />} detalhe={`${fmtPct(cont.amarelo / Math.max(1, total), 0)} do catálogo`} ativo={sel.status.includes('amarelo')} onClick={() => alternar('status', 'amarelo')} />
        <CartaoResumo rotulo="Saudáveis" valor={cont.verde} status="verde" icone={<IconeStatus s="verde" />} detalhe={`${fmtPct(cont.verde / Math.max(1, total), 0)} do catálogo`} ativo={sel.status.includes('verde')} onClick={() => alternar('status', 'verde')} />
        <CartaoResumo rotulo="Sem chave primária" valor={cont.semPk} icone={<KeyRound className="size-3.5" aria-hidden />} detalhe="unicidade não garantida" ativo={semPk} onClick={() => alterar({ pk: semPk ? null : 'sem' })} />
        <CartaoResumo rotulo="Sem dono definido" valor={cont.semDono} icone={<UserRoundX className="size-3.5" aria-hidden />} detalhe="sem responsável formal" ativo={sel.dono.includes(SEM_DONO)} onClick={() => alternar('dono', SEM_DONO)} />
      </section>

      {/* busca + filtros + visão */}
      <section className="rounded-2xl border border-border bg-card p-3 shadow-card" aria-label="Filtros do catálogo">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-52 flex-1 basis-64">
            <span className="sr-only">Buscar tabela por nome ou descrição</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              type="search"
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value)
                alterar({ q: e.target.value || null })
              }}
              placeholder="Buscar por nome ou descrição (ex.: parcelas, telefonia, boleto)"
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-[13px] outline-none transition-colors placeholder:text-muted-foreground/80 focus:border-primary [&::-webkit-search-cancel-button]:hidden"
            />
          </label>
          <MultiSelecao rotulo="Status" opcoes={opcoes('status', STATUS, (v) => STATUS_INFO[v as Status].rotulo)} selecionados={sel.status} onChange={(v) => alterar({ status: v })} />
          <MultiSelecao rotulo="Domínio" opcoes={opcoes('dominio', dominios)} selecionados={sel.dominio} onChange={(v) => alterar({ dominio: v })} />
          <MultiSelecao rotulo="Camada" opcoes={opcoes('camada', CAMADAS, (v) => ROTULO_CAMADA[v as Camada])} selecionados={sel.camada} onChange={(v) => alterar({ camada: v })} />
          <MultiSelecao rotulo="Dono" opcoes={opcoes('dono', donos)} selecionados={sel.dono} onChange={(v) => alterar({ dono: v })} />
          <MultiSelecao rotulo="Criticidade" todos="Todas" opcoes={opcoes('criticidade', CRITICIDADES, (v) => ROTULO_CRITICIDADE[v as Criticidade])} selecionados={sel.criticidade} onChange={(v) => alterar({ criticidade: v })} />
          {filtrosAtivos > 0 && (
            <Button variant="ghost" size="sm" onClick={limpar}>
              <X aria-hidden />
              Limpar ({filtrosAtivos})
            </Button>
          )}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted-foreground" role="status">
          <strong className="tabular font-semibold text-foreground">{fmtNumero(filtradas.length)}</strong>
          {filtradas.length === total ? ' tabelas' : ` de ${fmtNumero(total)} tabelas`}
          {visao === 'grade' && ' · críticas primeiro'}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {visao === 'grade' && (
            <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-muted-foreground">
              <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={agrupar} onChange={(e) => alterar({ grupo: e.target.checked ? 'dominio' : null })} />
              Agrupar por domínio
            </label>
          )}
          <div className="inline-flex rounded-lg border border-border bg-card p-0.5 shadow-card" role="tablist" aria-label="Visão do catálogo">
            {VISOES.map((v) => (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={visao === v.id}
                onClick={() => alterar({ visao: v.id === 'grade' ? null : v.id })}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors',
                  visao === v.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <v.icone className="size-3.5" aria-hidden />
                {v.rotulo}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtradas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60">
          <EmptyState
            icone={SearchX}
            titulo="Nenhuma tabela com esses filtros"
            descricao="Ajuste a busca ou remova algum filtro para ver as tabelas do catálogo."
            acao={
              <Button variant="outline" size="sm" onClick={limpar}>
                Limpar filtros
              </Button>
            }
          />
        </div>
      ) : visao === 'grade' ? (
        <Grade tabelas={filtradas} dias={catalogo.dias} agrupar={agrupar} dominios={dominios} />
      ) : visao === 'lista' ? (
        <Lista tabelas={filtradas} />
      ) : (
        <Heatmap tabelas={filtradas} dias={catalogo.dias} dominios={dominios} />
      )}
    </Pagina>
  )
}
