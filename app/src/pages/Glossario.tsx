import { BookOpen, FileBarChart, Search, Sigma, Table2, UserRound, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EmptyState, SkeletonKpi, STATUS_INFO } from '@/components/dados'
import { Pagina } from '@/components/layout/Pagina'
import { useCatalogo, useGlossario } from '@/lib/dados'
import { fmtNumero } from '@/lib/formato'
import { relatorioPorId } from '@/lib/relatorios'
import { cn } from '@/lib/utils'
import type { TabelaResumo, TermoGlossario } from '@/types/governanca'

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const idDoTermo = (termo: string) => `termo-${semAcento(termo).replace(/[^a-z0-9]+/g, '-')}`

function CartaoTermo({ t, tabelas, foco, refFoco }: { t: TermoGlossario; tabelas: Map<string, TabelaResumo>; foco: boolean; refFoco?: React.Ref<HTMLElement> }) {
  return (
    <article
      id={idDoTermo(t.termo)}
      ref={refFoco}
      className={cn(
        'flex scroll-mt-24 flex-col rounded-2xl border bg-card p-5 shadow-card transition-[box-shadow,border-color] duration-300',
        foco ? 'border-primary shadow-elevada ring-2 ring-ring/40' : 'border-border',
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
        <h2 className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-base font-semibold leading-snug tracking-tight">
          {t.termo}
          {t.sigla && <span className="rounded-md bg-accent px-1.5 py-0.5 font-mono text-[11.5px] font-semibold text-accent-foreground">{t.sigla}</span>}
        </h2>
        <span className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-[11.5px] font-medium text-muted-foreground">{t.dominio}</span>
      </header>
      <p className="mt-2 text-[13.5px] leading-relaxed text-foreground/90">{t.definicao}</p>

      {t.formula && (
        <div className="mt-3 rounded-xl border border-border bg-background/70 px-3.5 py-2.5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Sigma className="size-3.5" aria-hidden />
            Fórmula
          </p>
          <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-[12.5px] leading-relaxed">{t.formula}</pre>
        </div>
      )}

      <dl className="mt-auto space-y-2.5 pt-4 text-[13px]">
        <div className="flex items-center gap-2">
          <dt className="flex w-24 shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
            <UserRound className="size-3.5" aria-hidden />
            Dono
          </dt>
          <dd className="font-medium">{t.dono}</dd>
        </div>
        {t.tabelas.length > 0 && (
          <div className="flex items-start gap-2">
            <dt className="mt-1 flex w-24 shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
              <Table2 className="size-3.5" aria-hidden />
              Tabelas-fonte
            </dt>
            <dd className="flex min-w-0 flex-wrap gap-1.5">
              {t.tabelas.map((nome) => {
                const tab = tabelas.get(nome)
                const s = tab ? STATUS_INFO[tab.status] : null
                const Icone = s?.icone
                return (
                  <Link
                    key={nome}
                    to={`/farol/${encodeURIComponent(nome)}`}
                    title={tab ? `${s?.rotulo}: ${tab.motivo_status.replace(/`/g, '')}` : 'Abrir no Farol'}
                    className="inline-flex items-center gap-1.5 rounded-md bg-foreground/[0.06] px-2 py-1 font-mono text-[12px] font-medium transition-colors hover:bg-foreground/[0.12] hover:text-primary"
                  >
                    {Icone && s && <Icone className={cn('size-3.5 shrink-0', s.texto)} aria-hidden />}
                    {nome}
                    {s && <span className="sr-only"> ({s.rotulo})</span>}
                  </Link>
                )
              })}
            </dd>
          </div>
        )}
        {t.relatorios.length > 0 && (
          <div className="flex items-start gap-2">
            <dt className="mt-0.5 flex w-24 shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
              <FileBarChart className="size-3.5" aria-hidden />
              Relatórios
            </dt>
            <dd className="flex min-w-0 flex-wrap gap-1.5">
              {t.relatorios.map((id) => {
                const r = relatorioPorId(id)
                return (
                  <Link
                    key={id}
                    to={r?.rota ?? `/relatorios/${id}`}
                    className="inline-flex items-center rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    {r?.titulo ?? id}
                  </Link>
                )
              })}
            </dd>
          </div>
        )}
      </dl>
    </article>
  )
}

/** Glossário de métricas: definição oficial, fórmula, dono, tabelas de origem e relatórios de cada termo. */
export default function Glossario() {
  const { dados: termos, carregando } = useGlossario()
  const { dados: catalogo } = useCatalogo()
  const [params, setParams] = useSearchParams()
  const [busca, setBusca] = useState('')
  const [dominio, setDominio] = useState<string | null>(null)
  const refFoco = useRef<HTMLElement>(null)

  const todos = useMemo(() => termos ?? [], [termos])
  const tabelas = useMemo(() => new Map<string, TabelaResumo>((catalogo?.tabelas ?? []).map((t) => [t.nome, t])), [catalogo])
  const dominios = useMemo(() => {
    const cont = new Map<string, number>()
    for (const t of todos) cont.set(t.dominio, (cont.get(t.dominio) ?? 0) + 1)
    return [...cont.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
  }, [todos])

  // ?termo=<termo>: abre o glossário focado nesse termo (aceita também a sigla)
  const pedido = params.get('termo')
  const focado = useMemo(() => {
    if (!pedido) return null
    const q = semAcento(pedido.trim())
    return todos.find((t) => semAcento(t.termo) === q) ?? todos.find((t) => t.sigla && semAcento(t.sigla) === q) ?? todos.find((t) => semAcento(t.termo).includes(q)) ?? null
  }, [pedido, todos])

  useEffect(() => {
    if (!focado) return
    const t = setTimeout(() => refFoco.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200)
    return () => clearTimeout(t)
  }, [focado])

  const limparFoco = () =>
    setParams(
      (atual) => {
        const p = new URLSearchParams(atual)
        p.delete('termo')
        return p
      },
      { replace: true },
    )

  const filtrados = useMemo(() => {
    const q = semAcento(busca.trim())
    return todos
      .filter((t) => {
        if (dominio && t.dominio !== dominio) return false
        if (!q) return true
        return semAcento([t.termo, t.sigla ?? '', t.definicao, t.formula ?? '', t.dono, t.dominio, ...t.tabelas].join(' ')).includes(q)
      })
      .sort((a, b) => a.termo.localeCompare(b.termo, 'pt-BR'))
  }, [todos, busca, dominio])

  // com um termo em foco e sem filtros, ele vem primeiro
  const lista = useMemo(() => (focado && filtrados.includes(focado) ? [focado, ...filtrados.filter((t) => t !== focado)] : filtrados), [filtrados, focado])

  const chip = (ativo: boolean) =>
    cn(
      'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors',
      ativo ? 'border-primary bg-accent text-accent-foreground' : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
    )

  return (
    <Pagina titulo="Glossário de métricas" subtitulo="Definições oficiais, fórmulas e tabelas de origem de cada indicador." icone={BookOpen}>
      {carregando ? (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonKpi key={i} className="h-48" />
          ))}
        </div>
      ) : !termos ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60">
          <EmptyState titulo="Glossário ainda não disponível" descricao="Os termos aparecem aqui assim que o motor de governança gerar os arquivos de dados." />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <label className="relative block w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar termo, sigla, fórmula ou tabela"
                aria-label="Buscar no glossário"
                className="h-10 w-full rounded-xl border border-input bg-card pl-9 pr-9 text-sm shadow-card outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-search-cancel-button]:hidden"
              />
              {busca && (
                <button type="button" onClick={() => setBusca('')} aria-label="Limpar busca" className="absolute right-2.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground">
                  <X className="size-3.5" />
                </button>
              )}
            </label>
            <span className="text-[13px] text-muted-foreground">
              {fmtNumero(lista.length)} de {fmtNumero(todos.length)} termos
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por domínio">
            <button type="button" aria-pressed={dominio === null} onClick={() => setDominio(null)} className={chip(dominio === null)}>
              Todos os domínios
              <span className="tabular text-xs opacity-75">{fmtNumero(todos.length)}</span>
            </button>
            {dominios.map(([d, n]) => (
              <button key={d} type="button" aria-pressed={dominio === d} onClick={() => setDominio(dominio === d ? null : d)} className={chip(dominio === d)}>
                {d}
                <span className="tabular text-xs opacity-75">{fmtNumero(n)}</span>
              </button>
            ))}
          </div>

          {pedido && (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border bg-accent/60 px-4 py-2.5 text-[13px] text-accent-foreground" role="status">
              {focado ? (
                <span>
                  Em destaque: <strong className="font-semibold">{focado.termo}</strong>
                </span>
              ) : (
                <span>
                  O termo <strong className="font-semibold">{pedido}</strong> não está no glossário.
                </span>
              )}
              <button type="button" onClick={limparFoco} className="font-semibold underline underline-offset-2 hover:no-underline">
                Remover destaque
              </button>
            </p>
          )}

          {lista.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/60">
              <EmptyState titulo="Nenhum termo encontrado" descricao="Tente outra palavra ou remova o filtro de domínio." icone={Search} />
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {lista.map((t) => (
                <CartaoTermo key={t.termo} t={t} tabelas={tabelas} foco={t === focado} refFoco={t === focado ? refFoco : undefined} />
              ))}
            </div>
          )}
        </>
      )}
    </Pagina>
  )
}
