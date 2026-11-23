import { Inbox, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface EmptyStateProps {
  titulo?: string
  descricao?: ReactNode
  icone?: LucideIcon
  acao?: ReactNode
  compacto?: boolean
  className?: string
}

/** Estado vazio elegante: sem dados para o filtro, arquivo ainda não gerado, etc. */
export function EmptyState({ titulo = 'Nada para mostrar', descricao, icone: Icone = Inbox, acao, compacto, className }: EmptyStateProps) {
  return (
    <div className={cn('flex h-full min-h-32 flex-col items-center justify-center text-center', compacto ? 'gap-2 p-4' : 'gap-3 p-10', className)}>
      <span className={cn('grid place-items-center rounded-full bg-accent text-accent-foreground', compacto ? 'size-9' : 'size-12')}>
        <Icone className={compacto ? 'size-4' : 'size-5'} aria-hidden />
      </span>
      <div className="space-y-1">
        <p className={cn('font-semibold', compacto ? 'text-[13px]' : 'text-sm')}>{titulo}</p>
        {descricao && <p className="mx-auto max-w-md text-[13px] leading-relaxed text-muted-foreground">{descricao}</p>}
      </div>
      {acao}
    </div>
  )
}
