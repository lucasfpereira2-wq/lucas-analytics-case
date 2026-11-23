import { ArrowRight, ChevronDown, Lightbulb, SearchCode, Table2, Wrench } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { StatusBadge, TextoComTabelas } from '@/components/dados'
import { fmtRelativo } from '@/lib/formato'
import { relatorioPorId } from '@/lib/relatorios'
import { cn } from '@/lib/utils'
import type { Incidente, Status } from '@/types/governanca'

export const SEVERIDADE: Record<Incidente['severidade'], { status: Status; rotulo: string }> = {
  critico: { status: 'vermelho', rotulo: 'Crítico' },
  alto: { status: 'amarelo', rotulo: 'Alto' },
  medio: { status: 'amarelo', rotulo: 'Médio' },
}
const SITUACAO: Record<Incidente['situacao'], string> = { aberto: 'Aberto', em_analise: 'Em análise', mitigado: 'Mitigado' }

function Problema({ inc, posicao }: { inc: Incidente; posicao: number }) {
  const [aberto, setAberto] = useState(false)
  const navegar = useNavigate()
  const sev = SEVERIDADE[inc.severidade]
  const destino = `/farol/${encodeURIComponent(inc.tabela)}`
  const idPainel = `problema-${inc.id}`

  return (
    <li
      className="group relative cursor-pointer px-5 py-4 transition-colors hover:bg-secondary/50"
      onClick={(e) => {
        // o item inteiro leva à tabela no Farol; links e botões internos mantêm o próprio destino
        if ((e.target as HTMLElement).closest('a,button')) return
        navegar(destino)
      }}
    >
      <div className="flex gap-4">
        <span className="tabular mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-[13px] font-semibold text-secondary-foreground" aria-label={`Prioridade ${posicao}`}>
          {posicao}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <StatusBadge status={sev.status} rotulo={sev.rotulo} tamanho="sm" discreto={inc.severidade === 'medio'} />
            <span className="text-xs text-muted-foreground">
              {SITUACAO[inc.situacao]} · detectado {fmtRelativo(inc.detectado_em)} · <span className="font-mono text-[11px]">{inc.id}</span>
            </span>
          </div>
          <h3 className="mt-1.5 text-[15px] font-semibold leading-snug tracking-tight">
            <Link to={destino} className="hover:text-primary">
              {inc.titulo}
            </Link>
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-foreground/90">{inc.impacto_negocio}</p>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
            <Link
              to={destino}
              className="inline-flex items-center gap-1.5 rounded-md bg-foreground/[0.06] px-2 py-1 font-mono text-[12px] font-medium transition-colors hover:bg-foreground/[0.12]"
              title="Abrir a tabela no Farol"
            >
              <Table2 className="size-3.5 text-muted-foreground" aria-hidden />
              {inc.tabela}
            </Link>
            {inc.relatorios_afetados.length > 0 ? (
              <>
                <span className="text-muted-foreground">afeta</span>
                {inc.relatorios_afetados.map((r) => {
                  const item = relatorioPorId(r.id)
                  return (
                    <Link
                      key={r.id}
                      to={item?.rota ?? `/relatorios/${r.id}`}
                      title={r.efeito}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-0.5 font-medium text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                    >
                      {item?.titulo ?? r.titulo}
                    </Link>
                  )
                })}
              </>
            ) : (
              <span className="text-muted-foreground">sem relatório executivo afetado até agora</span>
            )}
            <button
              type="button"
              onClick={() => setAberto((v) => !v)}
              aria-expanded={aberto}
              aria-controls={idPainel}
              className="ml-auto inline-flex h-7 items-center gap-1 rounded-lg px-2 font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {aberto ? 'Ocultar detalhes' : 'Causa e ação recomendada'}
              <ChevronDown className={cn('size-3.5 transition-transform duration-200', aberto && 'rotate-180')} aria-hidden />
            </button>
          </div>

          <div id={idPainel} className={cn('grid transition-[grid-template-rows] duration-300 ease-out', aberto ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
            <div className="overflow-hidden">
              <div className="mt-3 cursor-default rounded-xl border border-border bg-background/60 p-4" onClick={(e) => e.stopPropagation()}>
                <dl className="grid gap-x-6 gap-y-4 text-[13px] leading-relaxed lg:grid-cols-3">
                  {(
                    [
                      ['Resumo técnico', SearchCode, inc.resumo_tecnico],
                      ['Causa raiz', Lightbulb, inc.causa_raiz],
                      ['Ação recomendada', Wrench, inc.acao_recomendada],
                    ] as const
                  ).map(([rotulo, Icone, texto]) => (
                    <div key={rotulo}>
                      <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <Icone className="size-3.5" aria-hidden />
                        {rotulo}
                      </dt>
                      <dd className="mt-1">
                        <TextoComTabelas texto={texto} />
                      </dd>
                    </div>
                  ))}
                </dl>
                {inc.metricas.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
                    {inc.metricas.map((m) => (
                      <li key={m.rotulo} className="rounded-lg bg-secondary px-2.5 py-1.5 text-xs">
                        <span className="text-muted-foreground">{m.rotulo}: </span>
                        <span className="tabular font-semibold">{m.valor}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {inc.relatorios_afetados.length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {inc.relatorios_afetados.map((r) => (
                      <li key={r.id}>
                        <span className="font-semibold text-foreground">{r.titulo}:</span> {r.efeito}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </li>
  )
}

/** Peça central da Visão Executiva: os problemas de maior prioridade, em linguagem de negócio. */
export function TopProblemas({ incidentes, limite = 5 }: { incidentes: Incidente[]; limite?: number }) {
  const lista = [...incidentes].sort((a, b) => a.prioridade - b.prioridade).slice(0, limite)
  const restantes = incidentes.length - lista.length
  return (
    <section aria-label="Problemas críticos agora" className="flex min-w-0 flex-col rounded-2xl border border-border bg-card shadow-card">
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 px-5 pb-3 pt-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Top {lista.length} problemas críticos agora</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Ordenados pelo impacto no negócio. Clique para ver a tabela no Farol.</p>
        </div>
        <Link to="/farol?status=vermelho" className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary hover:underline">
          Ver todas as tabelas críticas
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </header>
      <ol className="divide-y divide-border border-t border-border">
        {lista.map((inc, i) => (
          <Problema key={inc.id} inc={inc} posicao={i + 1} />
        ))}
      </ol>
      {restantes > 0 && (
        <footer className="border-t border-border px-5 py-2.5 text-xs text-muted-foreground">
          Mais {restantes} {restantes === 1 ? 'incidente aberto' : 'incidentes abertos'} de menor prioridade no Farol de Dados.
        </footer>
      )}
    </section>
  )
}
