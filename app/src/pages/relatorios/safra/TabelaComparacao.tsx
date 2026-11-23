import { Fragment } from 'react'
import { ChartCard } from '@/components/dados'
import { fmtMes, fmtNumero, fmtPct } from '@/lib/formato'
import { cn } from '@/lib/utils'
import { parcial, taxa, taxaAgregada, type Indicador, type ModeloSafras } from './dados'

const MOBS = [3, 6, 9, 12, 18]
const GRUPOS: { ind: Indicador; rotulo: string }[] = [
  { ind: 'over30', rotulo: 'Over 30' },
  { ind: 'over90', rotulo: 'Over 90' },
  { ind: 'cancel', rotulo: 'Cancelamento acumulado' },
]

/** Diferença em p.p. em relação à média (positivo = pior, pois os três indicadores são "quanto menor, melhor"). */
function Delta({ v, media }: { v: number | null; media: number | null }) {
  if (v == null || media == null) return null
  const d = (v - media) * 100
  const neutro = Math.abs(d) < 0.05
  return (
    <span className={cn('tabular block text-[10.5px] leading-tight', neutro ? 'text-muted-foreground' : d > 0 ? 'text-status-vermelho-texto' : 'text-status-verde-texto')}>
      {neutro ? '=' : d > 0 ? '▲ +' : '▼ −'}
      {neutro ? '' : fmtNumero(Math.abs(d), 1)}
    </span>
  )
}

/** Safras lado a lado nos MOBs de referência, com a diferença em p.p. para a média de todas as safras do filtro. */
export function TabelaComparacao({ modelo, safras }: { modelo: ModeloSafras; safras: string[] }) {
  const medias = Object.fromEntries(GRUPOS.map((g) => [g.ind, MOBS.map((m) => taxaAgregada(modelo, m, g.ind).taxa)])) as Record<Indicador, (number | null)[]>
  const celula = 'border-b border-border/60 px-2 py-1.5 text-right'
  return (
    <ChartCard
      titulo="Quais safras fogem da média?"
      subtitulo="Safras em comparação nos MOBs 3, 6, 9, 12 e 18 (% das cotas da safra). Abaixo de cada valor, a diferença em p.p. para a média de todas as safras do filtro."
      vazio={!safras.length}
      csv={() => ({
        nome: 'safra-comparacao',
        colunas: ['Safra', 'Cotas da safra', ...GRUPOS.flatMap((g) => MOBS.map((m) => `${g.rotulo} MOB ${m} (%)`))],
        linhas: [
          ...safras.map((s) => [s, Math.round(modelo.celula(s, 0)?.base ?? modelo.celula(s, modelo.maxMob[s])?.base ?? 0), ...GRUPOS.flatMap((g) => MOBS.map((m) => { const v = taxa(modelo.celula(s, m), g.ind); return v == null ? '' : +(v * 100).toFixed(2) }))]),
          ['Média', '', ...GRUPOS.flatMap((g) => medias[g.ind].map((v) => (v == null ? '' : +(v * 100).toFixed(2))))],
        ],
      })}
      rodape="▲ acima da média (pior) · ▼ abaixo da média (melhor) · valores em itálico são MOBs parciais · – MOB ainda não observado."
    >
      <div className="scroll-fino -mx-1 max-h-[560px] overflow-auto">
        <table className="w-full min-w-[980px] border-separate border-spacing-0 text-[13px]">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="text-xs text-muted-foreground">
              <th rowSpan={2} className="border-b border-border px-2 pb-2 text-left align-bottom font-medium">Safra</th>
              <th rowSpan={2} className="border-b border-border px-2 pb-2 text-right align-bottom font-medium">Cotas</th>
              {GRUPOS.map((g) => (
                <th key={g.ind} colSpan={MOBS.length} className="border-l border-border/70 px-2 pb-1 pt-1 text-center font-semibold text-foreground">
                  {g.rotulo}
                </th>
              ))}
            </tr>
            <tr className="text-[11px] text-muted-foreground">
              {GRUPOS.map((g) => MOBS.map((m, i) => (
                <th key={`${g.ind}-${m}`} className={cn('border-b border-border px-2 pb-1.5 text-right font-medium', i === 0 && 'border-l border-l-border/70')}>
                  MOB {m}
                </th>
              )))}
            </tr>
          </thead>
          <tbody>
            {safras.map((s) => (
              <tr key={s} className="transition-colors hover:bg-muted/50">
                <td className="border-b border-border/60 px-2 py-1.5 font-medium">{fmtMes(s)}</td>
                <td className={cn(celula, 'tabular text-muted-foreground')}>{fmtNumero(modelo.celula(s, 0)?.base ?? modelo.celula(s, modelo.maxMob[s])?.base)}</td>
                {GRUPOS.map((g) => (
                  <Fragment key={g.ind}>
                    {MOBS.map((m, i) => {
                      const v = taxa(modelo.celula(s, m), g.ind)
                      return (
                        <td key={m} className={cn(celula, i === 0 && 'border-l border-l-border/70')}>
                          <span className={cn('tabular font-medium', v == null && 'text-muted-foreground', parcial(modelo, s, m) && 'italic')}>{fmtPct(v)}</span>
                          <Delta v={v} media={medias[g.ind][i]} />
                        </td>
                      )
                    })}
                  </Fragment>
                ))}
              </tr>
            ))}
            <tr className="bg-muted/40 font-semibold">
              <td className="px-2 py-2">Média do filtro</td>
              <td className="tabular px-2 py-2 text-right text-muted-foreground">{modelo.safras.length} safras</td>
              {GRUPOS.map((g) => medias[g.ind].map((v, i) => (
                <td key={`${g.ind}-${i}`} className={cn('tabular px-2 py-2 text-right', i === 0 && 'border-l border-l-border/70')}>
                  {fmtPct(v)}
                </td>
              )))}
            </tr>
          </tbody>
        </table>
      </div>
    </ChartCard>
  )
}
