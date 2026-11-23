import { useMemo } from 'react'
import { ChartCard } from '@/components/dados'
import { agrupar, filtrar, razao } from '@/lib/cubo'
import type { FiltrosResolvidos } from '@/lib/filtros'
import { fmtBRL, fmtCompacto, fmtNumero, fmtPct } from '@/lib/formato'
import type { Cubo } from '@/types/cubo'
import { mesesNoPeriodo } from './comum'
import { TabelaDados, type ColunaTabela } from './TabelaDados'

export interface Vendedor {
  id: string
  nome: string
  equipe: string
  regional: string
  uf: string
  canal: string
  meta_mensal_credito: number
}

interface Linha extends Vendedor {
  posicao: number
  cotas: number
  credito: number
  ticket: number | null
  meta: number
  ating: number | null
}

/** Barrinha de atingimento: escala até 150%, com marcador em 100%. */
function BarraMeta({ fracao }: { fracao: number | null }) {
  if (fracao === null) return <span className="text-muted-foreground">–</span>
  const largura = Math.min(1.5, Math.max(0, fracao)) / 1.5
  return (
    <span className="inline-flex items-center justify-end gap-2">
      <span className="relative h-1.5 w-20 overflow-hidden rounded-full bg-muted" aria-hidden>
        <span className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${largura * 100}%` }} />
        <span className="absolute inset-y-0 w-px bg-foreground/60" style={{ left: `${(1 / 1.5) * 100}%` }} />
      </span>
      <span className="tabular w-14 text-right font-medium">{fmtPct(fracao, 0)}</span>
    </span>
  )
}

export function RankingVendedores({ f, cubo, vendedores }: { f: FiltrosResolvidos; cubo: Cubo; vendedores: Vendedor[] }) {
  const linhas = useMemo<Linha[]>(() => {
    const cad = new Map(vendedores.map((v) => [v.id, v]))
    const meses = mesesNoPeriodo(f.periodo.inicio, f.periodo.fim)
    const grupos = agrupar(cubo, filtrar(cubo, f.filtrosCubo, f.meta), ['vendedor'], ['cotas_vendidas', 'credito_vendido'])
    const out: Linha[] = []
    for (const g of grupos) {
      const v = cad.get(g.chave[0])
      if (!v || g.valores.credito_vendido <= 0) continue
      const meta = v.meta_mensal_credito * meses
      out.push({
        ...v,
        posicao: 0,
        cotas: g.valores.cotas_vendidas,
        credito: g.valores.credito_vendido,
        ticket: razao(g.valores.credito_vendido, g.valores.cotas_vendidas),
        meta,
        ating: razao(g.valores.credito_vendido, meta),
      })
    }
    out.sort((a, b) => b.credito - a.credito)
    out.forEach((l, i) => (l.posicao = i + 1))
    return out
  }, [cubo, vendedores, f.filtrosCubo, f.meta, f.periodo])

  const colunas = useMemo<ColunaTabela<Linha>[]>(
    () => [
      {
        id: 'posicao',
        titulo: '#',
        valor: (l) => l.posicao,
        alinhar: 'direita',
        celula: (l) => <span className={l.posicao <= 3 ? 'inline-grid size-6 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground' : 'pr-1.5 text-muted-foreground'}>{l.posicao}</span>,
      },
      { id: 'nome', titulo: 'Vendedor', valor: (l) => l.nome, celula: (l) => <span className="font-medium">{l.nome}</span> },
      { id: 'equipe', titulo: 'Equipe', valor: (l) => l.equipe, celula: (l) => <span className="text-muted-foreground">{l.equipe}</span> },
      { id: 'regional', titulo: 'Regional', valor: (l) => l.regional },
      { id: 'canal', titulo: 'Canal', valor: (l) => l.canal },
      { id: 'cotas', titulo: 'Cotas', valor: (l) => l.cotas, alinhar: 'direita', celula: (l) => fmtNumero(l.cotas) },
      { id: 'credito', titulo: 'Crédito', valor: (l) => l.credito, alinhar: 'direita', celula: (l) => <span className="font-medium">{fmtCompacto(l.credito, { moeda: true })}</span> },
      { id: 'ticket', titulo: 'Ticket médio', valor: (l) => l.ticket, alinhar: 'direita', celula: (l) => fmtBRL(l.ticket, 0) },
      { id: 'ating', titulo: '% da meta', valor: (l) => l.ating, alinhar: 'direita', celula: (l) => <BarraMeta fracao={l.ating} /> },
    ],
    [],
  )

  const acima = linhas.filter((l) => (l.ating ?? 0) >= 1).length

  return (
    <ChartCard
      titulo="Quem são os vendedores que mais produzem?"
      subtitulo={
        f.segmentos.length
          ? `${fmtNumero(linhas.length)} vendedores com vendas no recorte`
          : `${fmtNumero(linhas.length)} vendedores com vendas no recorte · ${fmtNumero(acima)} (${fmtPct(razao(acima, linhas.length), 0)}) atingiram a meta proporcional do período`
      }
      csv={() => ({
        nome: 'vendas-ranking-vendedores',
        colunas: ['Posição', 'Id', 'Vendedor', 'Equipe', 'Regional', 'UF', 'Canal', 'Cotas', 'Crédito (R$)', 'Ticket médio (R$)', 'Meta do período (R$)', '% da meta'],
        linhas: linhas.map((l) => [l.posicao, l.id, l.nome, l.equipe, l.regional, l.uf, l.canal, Math.round(l.cotas), Math.round(l.credito), l.ticket === null ? null : Math.round(l.ticket), Math.round(l.meta), l.ating === null ? null : Math.round(l.ating * 1000) / 10]),
      })}
      rodape={`Meta do vendedor = meta mensal de crédito × meses do período (proporcional aos dias). A posição considera o crédito comercializado no recorte.${
        f.segmentos.length ? ' Com filtro de segmento, o % compara a venda do segmento com a meta total do vendedor (a meta não é aberta por segmento).' : ''
      }`}
    >
      <TabelaDados
        linhas={linhas}
        colunas={colunas}
        chave={(l) => l.id}
        textoBusca={(l) => `${l.nome} ${l.equipe} ${l.regional} ${l.canal} ${l.uf} ${l.id}`}
        placeholderBusca="Buscar vendedor ou equipe"
        ordenacaoInicial={{ id: 'credito', desc: true }}
        nomeItens="vendedores"
        porPagina={10}
      />
    </ChartCard>
  )
}
