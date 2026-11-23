/** Componentes locais dos relatórios de cobrança (alternador segmentado, cabeçalho de seção, legenda de escala). */
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface OpcaoAlternador<T extends string> {
  id: T
  rotulo: string
  desabilitado?: boolean
}

/** Controle segmentado compacto (mesmo desenho da granularidade na barra de filtros). */
export function Alternador<T extends string>({
  opcoes,
  valor,
  onChange,
  rotulo,
  className,
}: {
  opcoes: OpcaoAlternador<T>[]
  valor: T
  onChange: (v: T) => void
  rotulo: string
  className?: string
}) {
  return (
    <div className={cn('inline-flex h-8 shrink-0 items-center rounded-lg border border-border bg-card p-0.5', className)} role="radiogroup" aria-label={rotulo}>
      {opcoes.map((o) => {
        const ativo = o.id === valor
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={ativo}
            disabled={o.desabilitado}
            onClick={() => onChange(o.id)}
            className={cn(
              'h-full whitespace-nowrap rounded-md px-2.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
              ativo ? 'bg-marinho-900 text-white shadow-card dark:bg-primary dark:text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {o.rotulo}
          </button>
        )
      })}
    </div>
  )
}

/** Título de seção dentro do relatório (KPI → tendência → detalhamento). */
export function Secao({ titulo, descricao, acoes, children }: { titulo: string; descricao?: ReactNode; acoes?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3 pt-2">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight">{titulo}</h2>
          {descricao && <p className="mt-0.5 text-[13px] text-muted-foreground">{descricao}</p>}
        </div>
        {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
      </div>
      {children}
    </section>
  )
}

/** Legenda de escala sequencial (menor → maior). */
export function LegendaEscala({ cores, minimo, maximo, className }: { cores: string[]; minimo: string; maximo: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-xs text-muted-foreground', className)}>
      <span className="tabular">{minimo}</span>
      <span className="h-2 w-28 rounded-full" style={{ background: `linear-gradient(90deg, ${cores.join(',')})` }} aria-hidden />
      <span className="tabular">{maximo}</span>
    </span>
  )
}
