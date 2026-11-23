import { MultiSelecao } from '@/components/relatorio/MultiSelecao'
import { fmtMes } from '@/lib/formato'
import { cn } from '@/lib/utils'

const iguais = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x))

/** Seleção de safras para comparar: atalhos + multisseleção. Lista vazia = todas. */
export function SeletorSafras({ safras, selecionadas, onChange }: { safras: string[]; selecionadas: string[]; onChange: (v: string[]) => void }) {
  const s1 = safras.filter((s) => s >= '2025-01' && s <= '2025-06')
  const atalhos: { rotulo: string; valor: string[] }[] = [
    { rotulo: 'Todas', valor: [] },
    ...(safras.length > 6 ? [{ rotulo: 'Últimas 6', valor: safras.slice(-6) }] : []),
    ...(safras.length > 12 ? [{ rotulo: 'Últimas 12', valor: safras.slice(-12) }] : []),
    ...(s1.length ? [{ rotulo: '1º semestre de 2025', valor: s1 }] : []),
  ]
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-0.5 text-xs text-muted-foreground">Comparar</span>
      {atalhos.map((a) => {
        const ativo = iguais(a.valor, selecionadas)
        return (
          <button
            key={a.rotulo}
            type="button"
            aria-pressed={ativo}
            onClick={() => onChange(a.valor)}
            className={cn(
              'h-8 rounded-full border px-3 text-xs font-medium transition-colors',
              ativo ? 'border-primary/60 bg-accent text-accent-foreground' : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground',
            )}
          >
            {a.rotulo}
          </button>
        )
      })}
      <MultiSelecao
        className="h-8 rounded-full text-xs"
        rotulo="Safras"
        todos="Escolher"
        opcoes={[...safras].reverse().map((s) => ({ valor: s, rotulo: fmtMes(s) }))}
        selecionados={selecionadas}
        onChange={(v) => onChange([...v].sort())}
      />
    </div>
  )
}
