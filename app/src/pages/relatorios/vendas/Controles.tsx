import { ArrowLeft, ChevronRight, MousePointerClick } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { NOME_GRANULARIDADE, type Drill } from './comum'

/** Trilha do drill-down: "Todos › nov/2026 › semana de 09/11" com botão de voltar. */
export function TrilhaDrill({ drill, className }: { drill: Drill; className?: string }) {
  const fundo = drill.trilha.length > 1
  return (
    <div className={cn('mb-2 flex min-h-8 flex-wrap items-center gap-x-3 gap-y-1.5 text-xs', className)}>
      {fundo && (
        <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={drill.voltar}>
          <ArrowLeft /> Voltar
        </Button>
      )}
      <nav aria-label="Nível do detalhamento" className="flex flex-wrap items-center gap-1">
        {drill.trilha.map((rotulo, i) => {
          const ultimo = i === drill.trilha.length - 1
          return (
            <span key={`${rotulo}-${i}`} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3.5 text-muted-foreground/60" aria-hidden />}
              {ultimo ? (
                <span className="rounded-md bg-accent px-1.5 py-0.5 font-semibold text-accent-foreground">{rotulo}</span>
              ) : (
                <button type="button" onClick={() => drill.irPara(i)} className="rounded-md px-1.5 py-0.5 font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                  {rotulo}
                </button>
              )}
            </span>
          )
        })}
      </nav>
      <span className="ml-auto flex items-center gap-1.5 text-muted-foreground">
        {drill.proximo ? (
          <>
            <MousePointerClick className="size-3.5" aria-hidden />
            Clique em um{drill.granularidade === 'semana' ? 'a' : ''} {NOME_GRANULARIDADE[drill.granularidade]} para abrir por {NOME_GRANULARIDADE[drill.proximo]}
          </>
        ) : (
          'Menor nível de detalhe: dia'
        )}
      </span>
    </div>
  )
}

/** Seletor segmentado compacto (ex.: Crédito | Cotas). */
export function Segmentado<T extends string>({ opcoes, valor, aoMudar, rotulo }: { opcoes: { id: T; rotulo: string }[]; valor: T; aoMudar: (v: T) => void; rotulo: string }) {
  return (
    <div role="group" aria-label={rotulo} className="mr-1 inline-flex rounded-lg border border-border bg-muted/60 p-0.5">
      {opcoes.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={o.id === valor}
          onClick={() => aoMudar(o.id)}
          className={cn(
            'rounded-md px-2 py-1 text-xs font-medium transition-colors',
            o.id === valor ? 'bg-card text-foreground shadow-card' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  )
}

/** Dica discreta de interação (cross-filter) usada no rodapé dos cards. */
export function DicaFiltro({ texto, ativos, aoLimpar }: { texto: string; ativos?: string[]; aoLimpar?: () => void }) {
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <MousePointerClick className="size-3.5 shrink-0" aria-hidden />
      <span>{texto}</span>
      {ativos && ativos.length > 0 && (
        <>
          <span className="rounded-md bg-accent px-1.5 py-0.5 font-medium text-accent-foreground">Filtro ativo: {ativos.join(', ')}</span>
          {aoLimpar && (
            <button type="button" onClick={aoLimpar} className="font-medium text-primary underline-offset-2 hover:underline">
              Limpar
            </button>
          )}
        </>
      )}
    </span>
  )
}
