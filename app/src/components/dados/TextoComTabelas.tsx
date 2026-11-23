import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { useCatalogo } from '@/lib/dados'
import { cn } from '@/lib/utils'

/**
 * Renderiza um texto em que nomes de tabela entre crases (`fato_parcelas`) viram links para o Farol.
 * Só vira link o que existe no catálogo de governança; os demais trechos entre crases (colunas como
 * `id_parcela`, ids de rotina como `core_financeiro_parcelas`) ficam apenas em fonte de código.
 * `tabelas` restringe ainda mais a lista de nomes aceitos (opcional).
 */
export function TextoComTabelas({ texto, tabelas, className }: { texto: string; tabelas?: string[]; className?: string }) {
  const partes = texto.split(/`([^`]+)`/g)
  const { dados: catalogo } = useCatalogo()
  const noCatalogo = useMemo(() => new Set(catalogo?.tabelas.map((t) => t.nome) ?? []), [catalogo])
  const conhecidas = tabelas ? new Set(tabelas) : null
  return (
    <span className={className}>
      {partes.map((p, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{p}</Fragment>
        const ehTabela = noCatalogo.has(p) && (!conhecidas || conhecidas.has(p))
        const estilo = 'rounded-md bg-foreground/[0.07] px-1.5 py-px font-mono text-[0.86em] font-medium'
        return ehTabela ? (
          <Link key={i} to={`/farol/${encodeURIComponent(p)}`} className={cn(estilo, 'underline decoration-current/40 underline-offset-2 transition-colors hover:bg-foreground/[0.14]')}>
            {p}
          </Link>
        ) : (
          <code key={i} className={estilo}>
            {p}
          </code>
        )
      })}
    </span>
  )
}
