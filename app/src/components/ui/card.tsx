import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/** Superfície padrão do Hub: fundo card, borda sutil, canto 2xl e sombra leve. */
function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl border border-border bg-card text-card-foreground shadow-card', className)} {...props} />
}
const CardHeader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-1 p-5 pb-0', className)} {...props} />
)
const CardTitle = ({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('text-sm font-semibold leading-snug tracking-tight', className)} {...props} />
)
const CardDescription = ({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-[13px] text-muted-foreground', className)} {...props} />
)
const CardContent = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => <div className={cn('p-5', className)} {...props} />

export { Card, CardContent, CardDescription, CardHeader, CardTitle }
