import { Check, ChevronDown } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface OpcaoSelecao {
  valor: string
  rotulo?: string
  /** texto auxiliar à direita (ex.: nome da UF) */
  detalhe?: string
}

export interface MultiSelecaoProps {
  rotulo: string
  opcoes: (string | OpcaoSelecao)[]
  selecionados: string[]
  onChange: (valores: string[]) => void
  /** texto quando nada está selecionado (padrão: "Todos") */
  todos?: string
  desabilitado?: boolean
  className?: string
}

/** Multisseleção compacta em popover (padrão dos filtros do Hub). Lista vazia = todos. */
export function MultiSelecao({ rotulo, opcoes, selecionados, onChange, todos = 'Todos', desabilitado, className }: MultiSelecaoProps) {
  const ops: OpcaoSelecao[] = opcoes.map((o) => (typeof o === 'string' ? { valor: o } : o))
  const sel = new Set(selecionados)
  const ativo = selecionados.length > 0
  const resumo = !ativo
    ? todos
    : selecionados.length === 1
      ? (ops.find((o) => o.valor === selecionados[0])?.rotulo ?? selecionados[0])
      : `${selecionados.length} selecionados`
  const alternar = (v: string) => onChange(sel.has(v) ? selecionados.filter((x) => x !== v) : [...selecionados, v])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={desabilitado || ops.length === 0}
          className={cn(
            'inline-flex h-9 max-w-56 items-center gap-1.5 rounded-lg border bg-card px-3 text-[13px] transition-colors hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50',
            ativo ? 'border-primary/60 bg-accent/60' : 'border-border',
            className,
          )}
        >
          <span className="text-muted-foreground">{rotulo}</span>
          <span className={cn('truncate font-medium', ativo && 'text-accent-foreground')}>{resumo}</span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-1.5">
        <div className="scroll-fino max-h-72 overflow-y-auto" role="listbox" aria-multiselectable aria-label={rotulo}>
          {ops.map((o) => {
            const marcado = sel.has(o.valor)
            return (
              <button
                key={o.valor}
                type="button"
                role="option"
                aria-selected={marcado}
                onClick={() => alternar(o.valor)}
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-secondary"
              >
                <span className={cn('grid size-4 shrink-0 place-items-center rounded border transition-colors', marcado ? 'border-primary bg-primary text-primary-foreground' : 'border-input')}>
                  {marcado && <Check className="size-3" strokeWidth={3} aria-hidden />}
                </span>
                <span className="flex-1 truncate">{o.rotulo ?? o.valor}</span>
                {o.detalhe && <span className="truncate text-xs text-muted-foreground">{o.detalhe}</span>}
              </button>
            )
          })}
        </div>
        {ativo && (
          <button type="button" onClick={() => onChange([])} className="mt-1 w-full rounded-md border-t border-border px-2 py-1.5 text-left text-xs font-medium text-muted-foreground hover:text-foreground">
            Limpar seleção
          </button>
        )}
      </PopoverContent>
    </Popover>
  )
}
