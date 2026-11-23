import { CalendarDays, ChevronDown, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dica } from '@/components/ui/tooltip'
import {
  GRANULARIDADES,
  PRESETS_PERIODO,
  rotuloPreset,
  useFiltros,
  useFiltrosResolvidos,
  useSincronizarFiltrosURL,
  type Periodo,
} from '@/lib/filtros'
import { fmtData } from '@/lib/formato'
import { cn } from '@/lib/utils'
import { MultiSelecao } from './MultiSelecao'

export type FiltroDisponivel = 'periodo' | 'granularidade' | 'segmento' | 'regional' | 'uf' | 'canal'

export interface BarraFiltrosProps {
  /** quais filtros o relatório usa (padrão: todos; o de canal só aparece se `canal` for informado) */
  filtros?: FiltroDisponivel[]
  /** rótulo e opções do filtro de canal deste relatório (ex.: { rotulo: 'Canal de venda', opcoes: meta.canais_venda }) */
  canal?: { rotulo?: string; opcoes: string[] }
  /** restringe as opções de segmento (padrão: meta.segmentos) */
  segmentos?: string[]
  /** controles extras do relatório, à direita */
  extras?: React.ReactNode
  className?: string
}

const TODOS: FiltroDisponivel[] = ['periodo', 'granularidade', 'segmento', 'regional', 'uf', 'canal']

const paraDate = (d: string) => new Date(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)))
const paraISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function FiltroPeriodo({ periodo, limites }: { periodo: Periodo; limites: Periodo }) {
  const preset = useFiltros((s) => s.preset)
  const definirPreset = useFiltros((s) => s.definirPreset)
  const definirPersonalizado = useFiltros((s) => s.definirPersonalizado)
  const [aberto, setAberto] = useState(false)
  const [faixa, setFaixa] = useState<{ from?: Date; to?: Date }>({})

  useEffect(() => {
    if (aberto) setFaixa({ from: paraDate(periodo.inicio), to: paraDate(periodo.fim) })
  }, [aberto, periodo.inicio, periodo.fim])

  const completo = !!faixa.from && !!faixa.to
  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-[13px] transition-colors hover:border-primary/50"
        >
          <CalendarDays className="size-4 text-primary" aria-hidden />
          <span className="font-medium">{rotuloPreset(preset)}</span>
          <span className="tabular hidden text-muted-foreground sm:inline">
            {fmtData(periodo.inicio)} a {fmtData(periodo.fim)}
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent className="flex w-auto max-w-[calc(100vw-1.5rem)] flex-col gap-3 p-3 sm:flex-row">
        <div className="flex min-w-40 flex-row flex-wrap gap-1 sm:flex-col sm:flex-nowrap">
          <p className="hidden px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:block">Período</p>
          {PRESETS_PERIODO.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                definirPreset(p.id)
                setAberto(false)
              }}
              className={cn(
                'rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors hover:bg-secondary',
                preset === p.id && 'bg-accent font-semibold text-accent-foreground hover:bg-accent',
              )}
            >
              {p.rotulo}
            </button>
          ))}
          <p className={cn('rounded-md px-2.5 py-1.5 text-[13px] text-muted-foreground', preset === 'personalizado' && 'bg-accent font-semibold text-accent-foreground')}>
            Personalizado
          </p>
        </div>
        <div className="border-t border-border pt-2 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0">
          <Calendar
            mode="range"
            selected={faixa.from ? { from: faixa.from, to: faixa.to } : undefined}
            onSelect={(r) => setFaixa({ from: r?.from, to: r?.to })}
            defaultMonth={paraDate(periodo.fim)}
            today={paraDate(limites.fim)}
            startMonth={paraDate(limites.inicio)}
            endMonth={paraDate(limites.fim)}
            disabled={{ before: paraDate(limites.inicio), after: paraDate(limites.fim) }}
          />
          <div className="flex items-center justify-between gap-3 border-t border-border pt-2.5">
            <span className="tabular text-xs text-muted-foreground">
              {faixa.from ? fmtData(paraISO(faixa.from)) : '–'} a {faixa.to ? fmtData(paraISO(faixa.to)) : '–'}
            </span>
            <Button
              size="sm"
              disabled={!completo}
              onClick={() => {
                if (!faixa.from || !faixa.to) return
                definirPersonalizado({ inicio: paraISO(faixa.from), fim: paraISO(faixa.to) })
                setAberto(false)
              }}
            >
              Aplicar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Barra de filtros global dos relatórios. Lê e grava no store `useFiltros` e sincroniza com a URL.
 * O relatório declara quais filtros se aplicam; os dados filtrados vêm de `useFiltrosResolvidos()`.
 */
export function BarraFiltros({ filtros = TODOS, canal, segmentos, extras, className }: BarraFiltrosProps) {
  useSincronizarFiltrosURL()
  const f = useFiltrosResolvidos()
  const s = useFiltros()
  const tem = (x: FiltroDisponivel) => filtros.includes(x)
  const meta = f.meta

  const opSegmentos = segmentos ?? meta?.segmentos ?? []
  const opRegionais = useMemo(() => meta?.regionais.map((r) => r.nome) ?? [], [meta])
  const opUfs = useMemo(
    () =>
      (meta?.ufs ?? [])
        .filter((u) => !s.regionais.length || s.regionais.includes(u.regional))
        .map((u) => ({ valor: u.sigla, rotulo: u.sigla, detalhe: u.nome })),
    [meta, s.regionais],
  )

  // canais selecionados em outro relatório que não existem neste são descartados
  const opcoesCanal = canal?.opcoes
  useEffect(() => {
    const atuais = useFiltros.getState().canais
    if (!atuais.length) return
    const validos = opcoesCanal ? atuais.filter((c) => opcoesCanal.includes(c)) : []
    if (validos.length !== atuais.length && (opcoesCanal?.length || !tem('canal'))) useFiltros.getState().definirCanais(validos)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opcoesCanal])

  const alterado = f.ativos > 0 || s.preset !== '12m' || s.granularidade !== 'mes'

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)} role="toolbar" aria-label="Filtros do relatório">
      {tem('periodo') && <FiltroPeriodo periodo={f.periodo} limites={f.limites} />}

      {tem('granularidade') && (
        <div className="inline-flex h-9 items-center rounded-lg border border-border bg-card p-0.5" role="radiogroup" aria-label="Granularidade">
          {GRANULARIDADES.map((g) => {
            const desabilitado = g.id === 'dia' && f.diaDesabilitado
            const ativo = f.granularidade === g.id
            const botao = (
              <button
                key={g.id}
                type="button"
                role="radio"
                aria-checked={ativo}
                disabled={desabilitado}
                onClick={() => s.definirGranularidade(g.id)}
                className={cn(
                  'h-full rounded-md px-3 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                  ativo ? 'bg-marinho-900 text-white shadow-card dark:bg-primary dark:text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {g.rotulo}
              </button>
            )
            return desabilitado ? (
              <Dica key={g.id} texto="Disponível para períodos de até 120 dias">
                <span className="h-full">{botao}</span>
              </Dica>
            ) : (
              botao
            )
          })}
        </div>
      )}

      {(tem('segmento') || tem('regional') || tem('uf') || (tem('canal') && canal)) && <span className="mx-1 hidden h-5 w-px bg-border md:block" aria-hidden />}

      {tem('segmento') && <MultiSelecao rotulo="Segmento" opcoes={opSegmentos} selecionados={s.segmentos} onChange={s.definirSegmentos} />}
      {tem('regional') && <MultiSelecao rotulo="Regional" todos="Todas" opcoes={opRegionais} selecionados={s.regionais} onChange={(v) => s.definirRegionais(v, meta)} />}
      {tem('uf') && <MultiSelecao rotulo="UF" todos="Todas" opcoes={opUfs} selecionados={s.ufs} onChange={s.definirUfs} />}
      {tem('canal') && canal && <MultiSelecao rotulo={canal.rotulo ?? 'Canal'} opcoes={canal.opcoes} selecionados={s.canais} onChange={s.definirCanais} />}

      {alterado && (
        <Button variant="ghost" size="sm" onClick={s.limpar} className="h-9">
          <RotateCcw />
          Limpar
        </Button>
      )}
      {extras && <div className="ml-auto flex items-center gap-2">{extras}</div>}
    </div>
  )
}
