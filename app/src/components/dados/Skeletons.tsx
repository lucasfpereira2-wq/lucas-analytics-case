import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function SkeletonKpi({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-border bg-card p-5 shadow-card', className)}>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-8 w-32" />
      <Skeleton className="mt-4 h-3 w-40" />
    </div>
  )
}

export function SkeletonGrafico({ altura = 280, className }: { altura?: number; className?: string }) {
  const barras = [42, 58, 50, 72, 64, 80, 68, 88, 76, 92, 84, 70]
  return (
    <div className={cn('flex items-end gap-2 px-2', className)} style={{ height: altura }} aria-hidden>
      {barras.map((h, i) => (
        <Skeleton key={i} className="flex-1 rounded-t-md rounded-b-none" style={{ height: `${h}%`, animationDelay: `${i * 60}ms` }} />
      ))}
    </div>
  )
}

export function SkeletonTabela({ linhas = 6, className }: { linhas?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)} aria-hidden>
      <Skeleton className="h-4 w-full opacity-70" />
      {Array.from({ length: linhas }, (_, i) => (
        <Skeleton key={i} className="h-8 w-full" style={{ animationDelay: `${i * 70}ms` }} />
      ))}
    </div>
  )
}

/** Esqueleto de página de relatório: linha de KPIs + dois gráficos. */
export function SkeletonRelatorio() {
  return (
    <div className="space-y-5" role="status" aria-label="Carregando dados">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonKpi key={i} />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card xl:col-span-2">
          <Skeleton className="mb-6 h-4 w-48" />
          <SkeletonGrafico />
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <Skeleton className="mb-6 h-4 w-36" />
          <SkeletonTabela />
        </div>
      </div>
    </div>
  )
}
