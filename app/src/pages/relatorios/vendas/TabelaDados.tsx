/**
 * Tabela de dados local (TanStack Table): ordenável, com busca sem acento e paginação.
 * Usada no ranking de vendedores (Vendas) e na lista de grupos (Assembleias).
 */
import { flexRender } from '@tanstack/react-table'
import { getCoreRowModel, getPaginationRowModel, getSortedRowModel, useLegacyTable, type LegacyColumnDef } from '@tanstack/react-table/legacy'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { fmtNumero } from '@/lib/formato'
import { cn } from '@/lib/utils'
import { normalizar } from './comum'

export interface ColunaTabela<L extends object> {
  id: string
  titulo: string
  /** valor usado na ordenação (e na célula, quando `celula` não é informada) */
  valor: (linha: L) => string | number | null
  celula?: (linha: L) => ReactNode
  alinhar?: 'esquerda' | 'direita'
  ordenavel?: boolean
  /** classes extras da célula (largura mínima, quebra...) */
  classe?: string
}

export interface TabelaDadosProps<L extends object> {
  linhas: L[]
  colunas: ColunaTabela<L>[]
  /** texto pesquisável de cada linha */
  textoBusca: (linha: L) => string
  placeholderBusca?: string
  ordenacaoInicial?: { id: string; desc: boolean }
  porPagina?: number
  /** nome do item no plural, para o rodapé ("vendedores", "grupos") */
  nomeItens?: string
  /** busca controlada de fora (ex.: clique em um ponto do gráfico) */
  busca?: string
  aoBuscar?: (v: string) => void
  chave: (linha: L) => string
  /** linha em destaque */
  destacar?: (linha: L) => boolean
  extras?: ReactNode
}

export function TabelaDados<L extends object>({
  linhas,
  colunas,
  textoBusca,
  placeholderBusca = 'Buscar...',
  ordenacaoInicial,
  porPagina = 10,
  nomeItens = 'linhas',
  busca: buscaExterna,
  aoBuscar,
  chave,
  destacar,
  extras,
}: TabelaDadosProps<L>) {
  const [buscaInterna, setBuscaInterna] = useState('')
  const busca = buscaExterna ?? buscaInterna
  const definirBusca = aoBuscar ?? setBuscaInterna
  const [ordenacao, setOrdenacao] = useState(ordenacaoInicial ? [ordenacaoInicial] : [])
  const [pagina, setPagina] = useState({ pageIndex: 0, pageSize: porPagina })

  const filtradas = useMemo(() => {
    const termos = normalizar(busca.trim()).split(/\s+/).filter(Boolean)
    if (!termos.length) return linhas
    return linhas.filter((l) => {
      const t = normalizar(textoBusca(l))
      return termos.every((x) => t.includes(x))
    })
  }, [linhas, busca, textoBusca])

  // qualquer mudança no conjunto volta para a primeira página
  useEffect(() => {
    setPagina((p) => (p.pageIndex === 0 ? p : { ...p, pageIndex: 0 }))
  }, [filtradas])

  const defs = useMemo<LegacyColumnDef<L>[]>(
    () =>
      colunas.map((c) => ({
        id: c.id,
        accessorFn: (l: L) => c.valor(l),
        header: c.titulo,
        enableSorting: c.ordenavel !== false,
        sortUndefined: 'last' as const,
        cell: (ctx) => (c.celula ? c.celula(ctx.row.original) : (ctx.getValue() as ReactNode)),
      })),
    [colunas],
  )
  const porId = useMemo(() => new Map(colunas.map((c) => [c.id, c])), [colunas])

  const tabela = useLegacyTable<L>({
    data: filtradas,
    columns: defs,
    state: { sorting: ordenacao, pagination: pagina },
    onSortingChange: setOrdenacao,
    onPaginationChange: setPagina,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: false,
    enableSortingRemoval: false,
  })

  const total = filtradas.length
  const paginas = Math.max(1, Math.ceil(total / pagina.pageSize))
  const indice = Math.min(pagina.pageIndex, paginas - 1)
  const de = total ? indice * pagina.pageSize + 1 : 0
  const ate = Math.min(total, (indice + 1) * pagina.pageSize)

  return (
    <div className="flex min-h-0 flex-col">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="relative block w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={busca}
            onChange={(e) => definirBusca(e.target.value)}
            placeholder={placeholderBusca}
            aria-label={placeholderBusca}
            className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-8 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-ring/30 [&::-webkit-search-cancel-button]:hidden"
          />
          {busca && (
            <button type="button" onClick={() => definirBusca('')} aria-label="Limpar busca" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground">
              <X className="size-3.5" />
            </button>
          )}
        </label>
        {extras}
        <span className="tabular ml-auto text-xs text-muted-foreground">
          {fmtNumero(total)} {nomeItens}
          {total !== linhas.length && ` de ${fmtNumero(linhas.length)}`}
        </span>
      </div>

      <div className="-mx-5 overflow-x-auto border-y border-border">
        <table className="w-full min-w-max border-collapse text-[13px]">
          <thead>
            {tabela.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="bg-muted/50">
                {hg.headers.map((h) => {
                  const col = porId.get(h.column.id)
                  const dir = h.column.getIsSorted()
                  const pode = h.column.getCanSort()
                  const Icone = dir === 'asc' ? ArrowUp : dir === 'desc' ? ArrowDown : ChevronsUpDown
                  return (
                    <th
                      key={h.id}
                      scope="col"
                      aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none'}
                      className={cn('whitespace-nowrap px-3 py-2 text-xs font-semibold text-muted-foreground first:pl-5 last:pr-5', col?.alinhar === 'direita' ? 'text-right' : 'text-left')}
                    >
                      {pode ? (
                        <button
                          type="button"
                          onClick={h.column.getToggleSortingHandler()}
                          className={cn('inline-flex items-center gap-1 rounded transition-colors hover:text-foreground', col?.alinhar === 'direita' && 'flex-row-reverse', dir && 'text-foreground')}
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          <Icone className={cn('size-3.5', !dir && 'opacity-50')} aria-hidden />
                        </button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {tabela.getRowModel().rows.map((r) => (
              <tr key={chave(r.original)} className={cn('border-t border-border/70 transition-colors hover:bg-accent/40', destacar?.(r.original) && 'bg-accent/60')}>
                {r.getVisibleCells().map((c) => {
                  const col = porId.get(c.column.id)
                  return (
                    <td key={c.id} className={cn('px-3 py-2 first:pl-5 last:pr-5', col?.alinhar === 'direita' && 'tabular text-right', col?.classe)}>
                      {flexRender(c.column.columnDef.cell, c.getContext())}
                    </td>
                  )
                })}
              </tr>
            ))}
            {total === 0 && (
              <tr>
                <td colSpan={colunas.length} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  Nenhum resultado para a busca e os filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="tabular">
          {total ? `${fmtNumero(de)}–${fmtNumero(ate)} de ${fmtNumero(total)}` : 'Sem resultados'}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" disabled={indice === 0} onClick={() => setPagina((p) => ({ ...p, pageIndex: Math.max(0, indice - 1) }))}>
            <ChevronLeft /> Anterior
          </Button>
          <span className="tabular px-2">
            Página {fmtNumero(indice + 1)} de {fmtNumero(paginas)}
          </span>
          <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" disabled={indice >= paginas - 1} onClick={() => setPagina((p) => ({ ...p, pageIndex: Math.min(paginas - 1, indice + 1) }))}>
            Próxima <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  )
}
