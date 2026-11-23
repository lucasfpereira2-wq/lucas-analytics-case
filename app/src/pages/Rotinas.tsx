import { createSortedRowModel, rowSortingFeature, tableFeatures, useTable, type ColumnDef, type Row, type SortingState } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronRight, ChevronsUpDown, CircleCheck, OctagonAlert, Search, Timer, UserRoundX, Workflow, X } from 'lucide-react'
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EmptyState, KpiCard, SkeletonKpi, SkeletonTabela } from '@/components/dados'
import { Pagina } from '@/components/layout/Pagina'
import { useCatalogo, usePipelines } from '@/lib/dados'
import { fmtDuracao, fmtNumero, fmtPct } from '@/lib/formato'
import { cn } from '@/lib/utils'
import type { Pipeline, StatusExecucao, TabelaResumo } from '@/types/governanca'
import { EXECUCAO, FaixaExecucoes, LegendaExecucoes, StatusExec, fmtInicio } from './rotinas/comum'
import { DetalheRotina } from './rotinas/Detalhe'

const features = tableFeatures({ rowSortingFeature, sortedRowModel: createSortedRowModel() })
type F = typeof features
type Linha = Row<F, Pipeline>

function comparar(a: Linha, b: Linha, coluna: string): number {
  const x = a.getValue(coluna) as string | number | null
  const y = b.getValue(coluna) as string | number | null
  if (x === null || x === undefined) return y === null || y === undefined ? 0 : 1
  if (y === null || y === undefined) return -1
  if (typeof x === 'number' && typeof y === 'number') return x - y
  return String(x).localeCompare(String(y), 'pt-BR')
}

interface Definicao {
  id: string
  titulo: string
  /** valor usado na ordenação; ausente = coluna não ordenável */
  valor?: (p: Pipeline) => string | number | null
  alinhar?: 'direita'
  classe?: string
  celula: (p: Pipeline) => ReactNode
}

const DEFINICOES: Definicao[] = [
  {
    id: 'rotina',
    titulo: 'Rotina',
    valor: (p) => p.nome,
    celula: (p) => (
      <span className="block min-w-0">
        <span className="line-clamp-2 text-[13px] font-semibold leading-snug text-foreground group-hover:text-primary">{p.nome}</span>
        <span className="block truncate font-mono text-[11.5px] text-muted-foreground">{p.id}</span>
      </span>
    ),
  },
  {
    id: 'agenda',
    titulo: 'Agenda',
    valor: (p) => p.agenda_cron.split(' ').slice(0, 2).reverse().map((v) => v.padStart(2, '0')).join(':') + p.agenda,
    celula: (p) => (
      <span className="block leading-snug">
        {p.agenda}
        <span className="block text-xs text-muted-foreground">{p.orquestrador}</span>
      </span>
    ),
  },
  {
    id: 'ultima',
    titulo: 'Última execução',
    valor: (p) => EXECUCAO[p.ultima_execucao.status].ordem * 1000 - p.falhas_30d,
    celula: (p) => (
      <span className="block" title={p.ultima_execucao.mensagem?.replace(/`/g, '')}>
        <StatusExec status={p.ultima_execucao.status} className="text-[12.5px]" />
        <span className="tabular block whitespace-nowrap text-xs text-muted-foreground">
          {fmtInicio(p.ultima_execucao.inicio)}
          {p.ultima_execucao.duracao_seg != null && <> · {fmtDuracao(p.ultima_execucao.duracao_seg)}</>}
        </span>
      </span>
    ),
  },
  {
    id: 'sucesso',
    titulo: 'Sucesso 30d',
    valor: (p) => p.taxa_sucesso_30d,
    celula: (p) => (
      <span className="flex items-center gap-2">
        <span className="h-1.5 w-10 shrink-0 overflow-hidden rounded-full bg-muted" aria-hidden>
          <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, p.taxa_sucesso_30d))}%` }} />
        </span>
        <span className="tabular font-medium">{fmtPct(p.taxa_sucesso_30d, 1, { fracao: false })}</span>
      </span>
    ),
  },
  { id: 'faixa', titulo: 'Últimos 30 dias', celula: (p) => <FaixaExecucoes execucoes={p.execucoes_30d} /> },
  {
    id: 'falhas',
    titulo: 'Falhas',
    valor: (p) => p.falhas_30d,
    alinhar: 'direita',
    celula: (p) => <span className={cn('tabular font-semibold', p.falhas_30d > 0 ? 'text-status-vermelho-texto' : 'font-normal text-muted-foreground')}>{fmtNumero(p.falhas_30d)}</span>,
  },
  {
    id: 'dono',
    titulo: 'Dono',
    valor: (p) => p.dono,
    celula: (p) =>
      p.dono ? (
        <span className="whitespace-nowrap">{p.dono}</span>
      ) : (
        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-status-amarelo-fundo px-1.5 py-0.5 text-xs font-semibold text-status-amarelo-texto">
          <UserRoundX className="size-3" aria-hidden />
          Sem dono
        </span>
      ),
  },
  { id: 'tabelas', titulo: 'Tabelas', valor: (p) => p.tabelas.length, alinhar: 'direita', celula: (p) => <span className="tabular">{fmtNumero(p.tabelas.length)}</span> },
]

const COLUNAS: ColumnDef<F, Pipeline>[] = DEFINICOES.map((d) => ({ id: d.id, accessorFn: d.valor ?? (() => null), header: d.titulo, sortFn: comparar, enableSorting: !!d.valor }))
const EXTRA = new Map(DEFINICOES.map((d) => [d.id, d]))

type Filtro = 'todas' | StatusExecucao
const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: 'todas', rotulo: 'Todas' },
  { id: 'falha', rotulo: 'Falharam hoje' },
  { id: 'atrasada', rotulo: 'Atrasadas' },
  { id: 'alerta', rotulo: 'Com alerta' },
  { id: 'sucesso', rotulo: 'Sucesso' },
]

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Rotinas / Pipelines: o que rodou, o que falhou hoje e os erros que se repetem. */
export default function Rotinas() {
  const { dados: pipelines, carregando } = usePipelines()
  const { dados: catalogo } = useCatalogo()
  const [params, setParams] = useSearchParams()
  const [busca, setBusca] = useState('')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'ultima', desc: false }])
  const [abertas, setAbertas] = useState<Set<string>>(() => new Set(params.get('pipeline') ? [params.get('pipeline') as string] : []))
  const alvo = params.get('pipeline')
  const refAlvo = useRef<HTMLTableRowElement>(null)

  const statusUrl = params.get('status') as Filtro | null
  const filtro: Filtro = statusUrl && FILTROS.some((f) => f.id === statusUrl) ? statusUrl : 'todas'
  const definirFiltro = (f: Filtro) =>
    setParams(
      (atual) => {
        const p = new URLSearchParams(atual)
        if (f === 'todas') p.delete('status')
        else p.set('status', f)
        return p
      },
      { replace: true },
    )

  const todas = useMemo(() => pipelines ?? [], [pipelines])
  const tabelas = useMemo(() => new Map<string, TabelaResumo>((catalogo?.tabelas ?? []).map((t) => [t.nome, t])), [catalogo])

  // ?pipeline=<id>: abre a rotina expandida e rola até ela
  useEffect(() => {
    if (!alvo || !todas.length) return
    setAbertas((s) => (s.has(alvo) ? s : new Set(s).add(alvo)))
    const t = setTimeout(() => refAlvo.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 250)
    return () => clearTimeout(t)
  }, [alvo, todas.length])

  const resumo = useMemo(() => {
    let agendadas = 0
    let concluidas = 0
    let somaDur = 0
    let nDur = 0
    for (const p of todas)
      for (const e of p.execucoes_30d) {
        if (e.status !== 'sem_agenda') agendadas++
        if (e.status === 'sucesso' || e.status === 'alerta') concluidas++
        if (e.duracao_seg != null) {
          somaDur += e.duracao_seg
          nDur++
        }
      }
    const contagem = (s: StatusExecucao) => todas.filter((p) => p.ultima_execucao.status === s).length
    const maisLonga = todas.reduce<Pipeline | null>((a, p) => (!a || p.duracao_media_seg > a.duracao_media_seg ? p : a), null)
    return {
      total: todas.length,
      orquestradores: new Set(todas.map((p) => p.orquestrador)).size,
      falha: contagem('falha'),
      atrasada: contagem('atrasada'),
      alerta: contagem('alerta'),
      sucesso: contagem('sucesso'),
      agendadas,
      concluidas,
      taxa: agendadas ? concluidas / agendadas : null,
      duracao: nDur ? somaDur / nDur : null,
      maisLonga,
    }
  }, [todas])

  const filtradas = useMemo(() => {
    const q = semAcento(busca.trim())
    return todas.filter((p) => {
      // o alvo do link (?pipeline=) aparece sempre, mesmo com outro filtro ativo
      if (filtro !== 'todas' && p.ultima_execucao.status !== filtro && p.id !== alvo) return false
      if (!q) return true
      return semAcento([p.nome, p.id, p.orquestrador, p.dono ?? 'sem dono', p.agenda, ...p.tabelas].join(' ')).includes(q)
    })
  }, [todas, filtro, busca, alvo])

  const table = useTable({
    features,
    columns: COLUNAS,
    data: filtradas,
    state: { sorting },
    onSortingChange: setSorting,
    getRowId: (p) => p.id,
    enableSortingRemoval: false,
  })
  const linhas = table.getRowModel().rows

  const alternar = (id: string) =>
    setAbertas((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  const contagemFiltro = (f: Filtro) => (f === 'todas' ? resumo.total : f === 'falha' ? resumo.falha : f === 'atrasada' ? resumo.atrasada : f === 'alerta' ? resumo.alerta : resumo.sucesso)

  return (
    <Pagina titulo="Rotinas" subtitulo="Pipelines de carga: agenda, execuções dos últimos 30 dias e falhas recorrentes." icone={Workflow}>
      {carregando ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <SkeletonKpi key={i} />
            ))}
          </div>
          <SkeletonTabela linhas={10} />
        </>
      ) : !pipelines ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60">
          <EmptyState titulo="Rotinas ainda não disponíveis" descricao="A lista de pipelines aparece aqui assim que o motor de governança gerar os arquivos de dados." />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              rotulo="Rotinas monitoradas"
              valor={fmtNumero(resumo.total)}
              icone={Workflow}
              detalhe={`Em ${resumo.orquestradores} ${resumo.orquestradores === 1 ? 'orquestrador' : 'orquestradores'} · ${fmtNumero(resumo.sucesso)} com sucesso na última execução`}
            />
            <KpiCard
              rotulo="Falharam hoje"
              valor={
                <span className="inline-flex items-baseline gap-1.5">
                  {fmtNumero(resumo.falha)}
                  <span className="text-[13px] font-normal tracking-normal text-muted-foreground">de {fmtNumero(resumo.total)}</span>
                </span>
              }
              icone={OctagonAlert}
              detalhe={`${fmtNumero(resumo.atrasada)} atrasadas · ${fmtNumero(resumo.alerta)} com alerta`}
              onClick={() => definirFiltro(filtro === 'falha' ? 'todas' : 'falha')}
            />
            <KpiCard
              rotulo="Taxa de sucesso em 30 dias"
              valor={resumo.taxa === null ? '–' : fmtPct(resumo.taxa, 1)}
              icone={CircleCheck}
              detalhe={`${fmtNumero(resumo.concluidas)} de ${fmtNumero(resumo.agendadas)} execuções agendadas`}
              definicao="Execuções concluídas (com sucesso ou com alerta) divididas pelas execuções agendadas nos últimos 30 dias, somando todas as rotinas."
            />
            <KpiCard
              rotulo="Duração média"
              valor={resumo.duracao === null ? '–' : fmtDuracao(resumo.duracao)}
              icone={Timer}
              detalhe={resumo.maisLonga ? `Mais longa: ${resumo.maisLonga.nome} (${fmtDuracao(resumo.maisLonga.duracao_media_seg)})` : undefined}
              definicao="Média da duração de todas as execuções concluídas nos últimos 30 dias."
            />
          </div>

          <section aria-label="Lista de rotinas" className="rounded-2xl border border-border bg-card shadow-card">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-border px-5 py-3">
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar pela última execução">
                {FILTROS.map((f) => {
                  const ativo = filtro === f.id
                  return (
                    <button
                      key={f.id}
                      type="button"
                      aria-pressed={ativo}
                      onClick={() => definirFiltro(f.id)}
                      className={cn(
                        'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors',
                        ativo ? 'border-primary bg-accent text-accent-foreground' : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
                      )}
                    >
                      {f.rotulo}
                      <span className="tabular text-xs opacity-75">{fmtNumero(contagemFiltro(f.id))}</span>
                    </button>
                  )
                })}
              </div>
              <label className="relative ml-auto block w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <input
                  type="search"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar rotina, tabela ou dono"
                  aria-label="Buscar rotina"
                  className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-8 text-[13px] outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-search-cancel-button]:hidden"
                />
                {busca && (
                  <button type="button" onClick={() => setBusca('')} aria-label="Limpar busca" className="absolute right-2 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground">
                    <X className="size-3.5" />
                  </button>
                )}
              </label>
            </div>

            {linhas.length === 0 ? (
              <EmptyState compacto titulo="Nenhuma rotina encontrada" descricao="Ajuste a busca ou o filtro de status." className="py-12" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px] border-collapse text-[12.5px]">
                  <thead>
                    {table.getHeaderGroups().map((hg) => (
                      <tr key={hg.id} className="border-b border-border bg-secondary/50">
                        <th scope="col" className="w-9 pl-3">
                          <span className="sr-only">Expandir</span>
                        </th>
                        {hg.headers.map((h) => {
                          const ordem = h.column.getIsSorted()
                          const extra = EXTRA.get(h.column.id)
                          const ordenavel = !!extra?.valor
                          const Seta = ordem === 'asc' ? ArrowUp : ordem === 'desc' ? ArrowDown : ChevronsUpDown
                          const classeTitulo = 'inline-flex h-10 items-center gap-1 whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide'
                          return (
                            <th key={h.id} scope="col" aria-sort={ordem === 'asc' ? 'ascending' : ordem === 'desc' ? 'descending' : undefined} className={cn('px-2.5 py-0 last:pr-5', extra?.alinhar === 'direita' ? 'text-right' : 'text-left')}>
                              {ordenavel ? (
                                <button type="button" onClick={h.column.getToggleSortingHandler()} className={cn(classeTitulo, 'transition-colors hover:text-foreground', ordem ? 'text-foreground' : 'text-muted-foreground')}>
                                  {extra?.titulo}
                                  <Seta className={cn('size-3.5', !ordem && 'opacity-50')} aria-hidden />
                                </button>
                              ) : (
                                <span className={cn(classeTitulo, 'text-muted-foreground')}>{extra?.titulo}</span>
                              )}
                            </th>
                          )
                        })}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {linhas.map((r) => {
                      const p = r.original
                      const aberta = abertas.has(p.id)
                      return (
                        <Fragment key={r.id}>
                          <tr
                            ref={p.id === alvo ? refAlvo : undefined}
                            onClick={() => alternar(p.id)}
                            className={cn('group cursor-pointer border-b border-border/70 transition-colors hover:bg-accent/40', aberta && 'bg-accent/30', p.id === alvo && 'bg-accent/50')}
                          >
                            <td className="py-2.5 pl-3">
                              <button
                                type="button"
                                aria-expanded={aberta}
                                aria-label={`${aberta ? 'Recolher' : 'Expandir'} ${p.nome}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  alternar(p.id)
                                }}
                                className="grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                              >
                                <ChevronRight className={cn('size-4 transition-transform duration-200', aberta && 'rotate-90')} aria-hidden />
                              </button>
                            </td>
                            {r.getAllCells().map((c) => {
                              const extra = EXTRA.get(c.column.id)
                              return (
                                <td key={c.id} className={cn('px-2.5 py-2.5 align-middle last:pr-5', extra?.alinhar === 'direita' && 'text-right', c.column.id === 'rotina' && 'w-[15rem] max-w-[15rem]', c.column.id === 'agenda' && 'min-w-[8.5rem] max-w-[11rem]')}>
                                  {extra?.celula(p)}
                                </td>
                              )
                            })}
                          </tr>
                          {aberta && (
                            <tr className="border-b border-border/70">
                              <td colSpan={DEFINICOES.length + 1} className="p-0">
                                <DetalheRotina p={p} tabelas={tabelas} />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-border px-5 py-3">
              <span className="text-xs text-muted-foreground">
                {fmtNumero(linhas.length)} de {fmtNumero(resumo.total)} rotinas · clique na linha para ver falhas recorrentes, duração e tabelas
              </span>
              <LegendaExecucoes />
            </footer>
          </section>
        </>
      )}
    </Pagina>
  )
}
