import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { EmptyState } from '@/components/dados/EmptyState'
import { cn } from '@/lib/utils'

export interface CabecalhoPaginaProps {
  titulo: string
  subtitulo?: ReactNode
  icone?: LucideIcon
  acoes?: ReactNode
  className?: string
}

/** Cabeçalho padrão das páginas internas do Hub. */
export function CabecalhoPagina({ titulo, subtitulo, icone: Icone, acoes, className }: CabecalhoPaginaProps) {
  return (
    <header className={cn('flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="flex min-w-0 items-start gap-3.5">
        {Icone && (
          <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
            <Icone className="size-5" aria-hidden />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold leading-tight tracking-tight">{titulo}</h1>
          {subtitulo && <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">{subtitulo}</p>}
        </div>
      </div>
      {acoes && <div className="flex shrink-0 items-center gap-2">{acoes}</div>}
    </header>
  )
}

/** Casca das páginas que não são relatório (Farol, Rotinas, Glossário, Visão Executiva...). */
export function Pagina({ children, className, ...cabecalho }: CabecalhoPaginaProps & { children?: ReactNode }) {
  return (
    <div className={cn('mx-auto w-full max-w-[1600px]', className)}>
      <CabecalhoPagina {...cabecalho} />
      <div className="mt-6 animate-entrar space-y-5">{children}</div>
    </div>
  )
}

/** Marcador de página que será implementada em uma próxima etapa. */
export function EmConstrucao({ descricao }: { descricao?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/60">
      <EmptyState titulo="Tela em preparação" descricao={descricao ?? 'O conteúdo desta página é publicado na próxima etapa do projeto.'} />
    </div>
  )
}
