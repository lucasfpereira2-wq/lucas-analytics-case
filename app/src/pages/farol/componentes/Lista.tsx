import {
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
  type Row,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronsUpDown, Download, UserRoundX } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { STATUS_INFO, StatusBadge } from '@/components/dados'
import { Button } from '@/components/ui/button'
import { exportarCSV } from '@/lib/exportar'
import { fmtDataHora, fmtNumero, fmtRelativo } from '@/lib/formato'
import { cn } from '@/lib/utils'
import type { TabelaResumo } from '@/types/governanca'
import { ORDEM_CAMADA, ORDEM_CRITICIDADE, ORDEM_STATUS, ROTULO_CAMADA, ROTULO_CRITICIDADE, SeloSemPK, rotaTabela, semCrases } from './comum'

const features = tableFeatures({ rowSortingFeature, sortedRowModel: createSortedRowModel() })
type F = typeof features
type Linha = Row<F, TabelaResumo>

/** Comparador único (números, textos em pt-BR e nulos por último). */
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
  accessorFn: (t: TabelaResumo) => string | number | null
  alinhar?: 'direita'
  celula: (t: TabelaResumo) => ReactNode
}

function BarraSaude({ t }: { t: TabelaResumo }) {
  return (
    <span className="inline-flex items-center justify-end gap-2">
      <span className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-secondary lg:block" aria-hidden>
        <span className={cn('block h-full rounded-full', STATUS_INFO[t.status].ponto)} style={{ width: `${Math.max(4, Math.min(100, t.saude))}%` }} />
      </span>
      <span className="tabular w-9 text-right font-medium">{fmtNumero(t.saude, 0)}</span>
    </span>
  )
}

const DEFINICOES: Definicao[] = [
  {
    id: 'tabela',
    titulo: 'Tabela',
    accessorFn: (t) => t.nome,
    celula: (t) => (
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate font-mono text-[12.5px] font-semibold text-foreground group-hover:text-primary">{t.nome}</span>
        {!t.tem_pk && <SeloSemPK />}
      </span>
    ),
  },
  { id: 'dominio', titulo: 'Domínio', accessorFn: (t) => t.dominio, celula: (t) => t.dominio },
  { id: 'camada', titulo: 'Camada', accessorFn: (t) => ORDEM_CAMADA[t.camada], celula: (t) => ROTULO_CAMADA[t.camada] },
  {
    id: 'status',
    titulo: 'Status',
    accessorFn: (t) => ORDEM_STATUS[t.status] * 1000 + t.saude,
    celula: (t) => (
      <span title={semCrases(t.motivo_status)}>
        <StatusBadge status={t.status} tamanho="sm" />
      </span>
    ),
  },
  { id: 'saude', titulo: 'Saúde', accessorFn: (t) => t.saude, alinhar: 'direita', celula: (t) => <BarraSaude t={t} /> },
  {
    id: 'ultima_carga',
    titulo: 'Última carga',
    accessorFn: (t) => t.ultima_carga,
    celula: (t) =>
      t.ultima_carga ? (
        <span className="tabular whitespace-nowrap">
          {fmtDataHora(t.ultima_carga)} <span className="text-muted-foreground">· {fmtRelativo(t.ultima_carga)}</span>
        </span>
      ) : (
        '–'
      ),
  },
  {
    id: 'atraso',
    titulo: 'Atraso',
    accessorFn: (t) => t.atraso_horas,
    alinhar: 'direita',
    celula: (t) =>
      t.atraso_horas > 0 ? <span className="tabular font-semibold text-status-vermelho-texto">{fmtNumero(t.atraso_horas)}h</span> : <span className="text-muted-foreground">no SLA</span>,
  },
  { id: 'linhas', titulo: 'Linhas', accessorFn: (t) => t.linhas, alinhar: 'direita', celula: (t) => <span className="tabular">{fmtNumero(t.linhas)}</span> },
  {
    id: 'testes',
    titulo: 'Testes falhando',
    accessorFn: (t) => t.testes_falhando * 100 + t.testes_alerta,
    alinhar: 'direita',
    celula: (t) => (
      <span className="tabular whitespace-nowrap">
        <span className={cn('font-semibold', t.testes_falhando > 0 ? 'text-status-vermelho-texto' : 'text-foreground')}>{t.testes_falhando}</span>
        <span className="text-muted-foreground"> de {t.testes_total}</span>
        {t.testes_alerta > 0 && <span className="text-status-amarelo-texto"> · {t.testes_alerta} alerta</span>}
      </span>
    ),
  },
  {
    id: 'dono',
    titulo: 'Dono',
    accessorFn: (t) => t.dono,
    celula: (t) =>
      t.dono ? (
        <span className="whitespace-nowrap" title={t.dono_area ?? undefined}>
          {t.dono}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-status-amarelo-fundo px-1.5 py-0.5 text-xs font-semibold text-status-amarelo-texto">
          <UserRoundX className="size-3" aria-hidden />
          Sem dono
        </span>
      ),
  },
  { id: 'criticidade', titulo: 'Criticidade', accessorFn: (t) => ORDEM_CRITICIDADE[t.criticidade], celula: (t) => ROTULO_CRITICIDADE[t.criticidade] },
]

const COLUNAS: ColumnDef<F, TabelaResumo>[] = DEFINICOES.map((d) => ({ id: d.id, accessorFn: d.accessorFn, header: d.titulo, sortFn: comparar }))
const EXTRA = new Map(DEFINICOES.map((d) => [d.id, d]))

/** Visão em lista: tabela ordenável (TanStack Table) com exportação em CSV. */
export function Lista({ tabelas }: { tabelas: TabelaResumo[] }) {
  const navegar = useNavigate()
  const [sorting, setSorting] = useState<SortingState>([{ id: 'status', desc: false }])
  const table = useTable({
    features,
    columns: COLUNAS,
    data: tabelas,
    state: { sorting },
    onSortingChange: setSorting,
    getRowId: (t) => t.nome,
    enableSortingRemoval: false,
  })
  const linhas = table.getRowModel().rows

  const baixar = useMemo(
    () => () =>
      exportarCSV(
        'farol-de-dados',
        ['Tabela', 'Domínio', 'Camada', 'Status', 'Motivo', 'Saúde', 'Última carga', 'Atraso (h)', 'Linhas', 'Testes falhando', 'Testes em alerta', 'Testes', 'Dono', 'Área', 'Criticidade', 'Tem PK', 'Pipeline'],
        linhas.map((r) => {
          const t = r.original
          return [
            t.nome, t.dominio, ROTULO_CAMADA[t.camada], STATUS_INFO[t.status].rotulo, semCrases(t.motivo_status), t.saude,
            t.ultima_carga ? fmtDataHora(t.ultima_carga) : '', t.atraso_horas, t.linhas, t.testes_falhando, t.testes_alerta, t.testes_total,
            t.dono ?? 'Sem dono', t.dono_area ?? '', ROTULO_CRITICIDADE[t.criticidade], t.tem_pk ? 'Sim' : 'Não', t.pipeline,
          ]
        }),
      ),
    [linhas],
  )

  return (
    <div className="rounded-2xl border border-border bg-card shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <p className="text-xs text-muted-foreground">Clique no cabeçalho para ordenar · clique na linha para abrir a tabela</p>
        <Button variant="outline" size="sm" onClick={baixar}>
          <Download aria-hidden />
          Exportar CSV
        </Button>
      </div>
      <div className="scroll-fino overflow-x-auto">
        <table className="w-full min-w-[1180px] border-collapse text-[13px]">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border bg-secondary/50">
                {hg.headers.map((h) => {
                  const ordem = h.column.getIsSorted()
                  const extra = EXTRA.get(h.column.id)
                  const Seta = ordem === 'asc' ? ArrowUp : ordem === 'desc' ? ArrowDown : ChevronsUpDown
                  return (
                    <th key={h.id} scope="col" aria-sort={ordem === 'asc' ? 'ascending' : ordem === 'desc' ? 'descending' : 'none'} className={cn('px-3 py-0 first:pl-5 last:pr-5', extra?.alinhar === 'direita' ? 'text-right' : 'text-left')}>
                      <button
                        type="button"
                        onClick={h.column.getToggleSortingHandler()}
                        className={cn(
                          'inline-flex h-10 items-center gap-1 whitespace-nowrap text-[11.5px] font-semibold uppercase tracking-wide transition-colors hover:text-foreground',
                          ordem ? 'text-foreground' : 'text-muted-foreground',
                        )}
                      >
                        {extra?.titulo}
                        <Seta className={cn('size-3.5', !ordem && 'opacity-50')} aria-hidden />
                      </button>
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {linhas.map((r) => (
              <tr
                key={r.id}
                onClick={() => navegar(rotaTabela(r.original.nome))}
                onKeyDown={(e) => e.key === 'Enter' && navegar(rotaTabela(r.original.nome))}
                tabIndex={0}
                role="link"
                className="group cursor-pointer border-b border-border/70 transition-colors last:border-0 hover:bg-accent/50"
              >
                {r.getAllCells().map((c) => {
                  const extra = EXTRA.get(c.column.id)
                  return (
                    <td key={c.id} className={cn('max-w-[280px] px-3 py-2.5 first:pl-5 last:pr-5', extra?.alinhar === 'direita' && 'text-right')}>
                      {extra?.celula(r.original)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
