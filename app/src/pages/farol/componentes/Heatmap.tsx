import { useMemo, useRef, useState, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { STATUS_INFO, StatusDot } from '@/components/dados'
import { fmtData, fmtDiaMes } from '@/lib/formato'
import { cn } from '@/lib/utils'
import type { TabelaResumo } from '@/types/governanca'
import { EXEC_INFO, LegendaExecucoes, SeloSemPK, estiloExec, rotaTabela } from './comum'

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const diaSemana = (iso: string) => new Date(`${iso}T12:00:00`).getDay()

interface Dica {
  x: number
  y: number
  tabela: TabelaResumo
  dia: number
}

/** Tabelas × últimos 30 dias: cada célula é o status da execução do dia. Agrupado por domínio. */
export function Heatmap({ tabelas, dias, dominios }: { tabelas: TabelaResumo[]; dias: string[]; dominios: string[] }) {
  const navegar = useNavigate()
  const caixa = useRef<HTMLDivElement>(null)
  const [dica, setDica] = useState<Dica | null>(null)

  const grupos = useMemo(() => {
    const m = new Map<string, TabelaResumo[]>()
    for (const t of tabelas) m.set(t.dominio, [...(m.get(t.dominio) ?? []), t])
    return [...m.entries()].sort((a, b) => dominios.indexOf(a[0]) - dominios.indexOf(b[0]))
  }, [tabelas, dominios])
  const porNome = useMemo(() => new Map(tabelas.map((t) => [t.nome, t])), [tabelas])

  const aoMover = (e: MouseEvent<HTMLDivElement>) => {
    const alvo = (e.target as HTMLElement).closest<HTMLElement>('[data-d]')
    const base = caixa.current?.getBoundingClientRect()
    if (!alvo || !base) return setDica(null)
    const t = porNome.get(alvo.dataset.t ?? '')
    if (!t) return setDica(null)
    const r = alvo.getBoundingClientRect()
    setDica({ x: r.left + r.width / 2 - base.left, y: r.top - base.top, tabela: t, dia: Number(alvo.dataset.d) })
  }

  const colunas = { gridTemplateColumns: `repeat(${dias.length}, minmax(14px, 1fr))` }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Execuções por tabela nos últimos {dias.length} dias</h2>
          <p className="text-xs text-muted-foreground">
            {fmtData(dias[0])} a {fmtData(dias[dias.length - 1])} · cada célula é a carga do dia · clique na linha para abrir a tabela
          </p>
        </div>
        <LegendaExecucoes />
      </div>

      <div className="scroll-fino overflow-x-auto">
        <div ref={caixa} className="relative min-w-[860px] px-5 pb-5 pt-3" onMouseMove={aoMover} onMouseLeave={() => setDica(null)}>
          {/* cabeçalho de datas */}
          <div className="grid grid-cols-[minmax(190px,250px)_1fr_28px] items-end gap-3 bg-card pb-1.5 pt-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Tabela</span>
            <div className="grid gap-[2px]" style={colunas} aria-hidden>
              {dias.map((d, i) => {
                const ds = diaSemana(d)
                const marca = (ds === 1 && i < dias.length - 3) || i === dias.length - 1
                return (
                  <span key={d} className={cn('relative h-7 text-center text-[10px] leading-none text-muted-foreground', (ds === 0 || ds === 6) && 'opacity-55')}>
                    {marca && <span className={cn('tabular absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap', i === dias.length - 1 && 'font-semibold text-foreground')}>{fmtDiaMes(d)}</span>}
                    <span className="absolute inset-x-0 bottom-0">{DIAS_SEMANA[ds][0].toUpperCase()}</span>
                  </span>
                )
              })}
            </div>
            <span className="sr-only">Status atual</span>
          </div>

          {grupos.map(([dominio, lista]) => (
            <section key={dominio} className="mt-3 first:mt-1" aria-label={dominio}>
              <h3 className="mb-1 flex items-baseline gap-2 text-xs font-semibold text-foreground">
                {dominio}
                <span className="font-normal text-muted-foreground">{lista.length}</span>
              </h3>
              <div className="space-y-[2px]">
                {lista.map((t) => (
                  <div
                    key={t.nome}
                    role="link"
                    tabIndex={0}
                    onClick={() => navegar(rotaTabela(t.nome))}
                    onKeyDown={(e) => e.key === 'Enter' && navegar(rotaTabela(t.nome))}
                    className="group grid cursor-pointer grid-cols-[minmax(190px,250px)_1fr_28px] items-center gap-3 rounded-md hover:bg-secondary/70"
                    aria-label={`${t.nome}: ${STATUS_INFO[t.status].rotulo}`}
                  >
                    <span className="flex min-w-0 items-center gap-1.5 pl-1">
                      <span className="truncate font-mono text-[11.5px] text-foreground/90 group-hover:text-primary" title={t.nome}>
                        {t.nome}
                      </span>
                      {!t.tem_pk && <SeloSemPK className="scale-90" />}
                    </span>
                    <div className="grid gap-[2px]" style={colunas}>
                      {t.execucoes_30d.slice(0, dias.length).map((e, i) => (
                        <span key={i} data-t={t.nome} data-d={i} className="h-[17px] rounded-[3px] transition-transform hover:scale-125 hover:ring-2 hover:ring-foreground/60" style={estiloExec(e)} />
                      ))}
                    </div>
                    <span className="grid place-items-center">
                      <StatusDot status={t.status} tamanho={9} titulo={`Status atual: ${STATUS_INFO[t.status].rotulo}`} />
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {dica && (
            <div
              className="pointer-events-none absolute z-20 w-max max-w-xs -translate-x-1/2 -translate-y-full rounded-lg bg-marinho-900 px-3 py-2 text-xs text-white shadow-elevada dark:border dark:border-border dark:bg-popover dark:text-popover-foreground"
              style={{ left: dica.x, top: dica.y - 8 }}
              role="tooltip"
            >
              <p className="font-mono font-semibold">{dica.tabela.nome}</p>
              <p className="mt-0.5 flex items-center gap-1.5 opacity-90">
                <span className="size-2.5 rounded-[2px]" style={estiloExec(dica.tabela.execucoes_30d[dica.dia])} aria-hidden />
                {DIAS_SEMANA[diaSemana(dias[dica.dia])]}, {fmtData(dias[dica.dia])} · <strong className="font-semibold">{EXEC_INFO[dica.tabela.execucoes_30d[dica.dia]]?.rotulo}</strong>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
