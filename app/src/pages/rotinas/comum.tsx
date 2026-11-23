import { CircleCheck, CircleSlash, Clock, Minus, OctagonAlert, TriangleAlert, type LucideIcon } from 'lucide-react'
import { fmtData, fmtDiaMes, fmtDuracao } from '@/lib/formato'
import { cn } from '@/lib/utils'
import type { Pipeline, StatusExecucao } from '@/types/governanca'

/** Aparência de cada resultado de execução: ícone + rótulo, nunca só a cor. `ordem` põe as falhas primeiro. */
export const EXECUCAO: Record<StatusExecucao, { rotulo: string; icone: LucideIcon; texto: string; ponto: string; altura: string; ordem: number }> = {
  falha: { rotulo: 'Falhou', icone: OctagonAlert, texto: 'text-status-vermelho-texto', ponto: 'bg-status-vermelho', altura: 'h-full', ordem: 0 },
  nao_executou: { rotulo: 'Não executou', icone: CircleSlash, texto: 'text-status-vermelho-texto', ponto: 'bg-status-vermelho', altura: 'h-full', ordem: 1 },
  atrasada: { rotulo: 'Atrasada', icone: Clock, texto: 'text-status-amarelo-texto', ponto: 'bg-status-amarelo', altura: 'h-[78%]', ordem: 2 },
  alerta: { rotulo: 'Com alerta', icone: TriangleAlert, texto: 'text-status-amarelo-texto', ponto: 'bg-status-amarelo', altura: 'h-[78%]', ordem: 3 },
  sucesso: { rotulo: 'Sucesso', icone: CircleCheck, texto: 'text-status-verde-texto', ponto: 'bg-status-verde', altura: 'h-[56%]', ordem: 4 },
  sem_agenda: { rotulo: 'Sem execução agendada', icone: Minus, texto: 'text-muted-foreground', ponto: 'bg-border', altura: 'h-[3px]', ordem: 5 },
}

/** "17/11 02:11" a partir do ISO com fuso (usa a hora local gravada no dado, não a do navegador). */
export function fmtInicio(iso: string | null): string {
  if (!iso || iso.length < 16) return 'Não iniciou'
  return `${fmtDiaMes(iso)} ${iso.slice(11, 16)}`
}

export function StatusExec({ status, className }: { status: StatusExecucao; className?: string }) {
  const s = EXECUCAO[status]
  const Icone = s.icone
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap font-semibold', s.texto, className)}>
      <Icone className="size-3.5 shrink-0" aria-hidden />
      {s.rotulo}
    </span>
  )
}

/** Faixa das execuções dos últimos 30 dias: uma barra por dia; a altura reforça o status (falha é a mais alta). */
export function FaixaExecucoes({ execucoes, className }: { execucoes: Pipeline['execucoes_30d']; className?: string }) {
  const agendadas = execucoes.filter((e) => e.status !== 'sem_agenda').length
  const ok = execucoes.filter((e) => e.status === 'sucesso' || e.status === 'alerta').length
  return (
    <span className={cn('flex h-[22px] items-end gap-px', className)} role="img" aria-label={`${ok} de ${agendadas} execuções agendadas concluídas nos últimos 30 dias`}>
      {execucoes.map((e) => {
        const s = EXECUCAO[e.status]
        return (
          <span
            key={e.data}
            title={`${fmtData(e.data)}: ${s.rotulo}${e.duracao_seg != null ? ` · ${fmtDuracao(e.duracao_seg)}` : ''}`}
            className={cn('w-[3px] shrink-0 rounded-[1px] transition-opacity hover:opacity-70', s.ponto, s.altura)}
          />
        )
      })}
    </span>
  )
}

export function LegendaExecucoes() {
  const itens: StatusExecucao[] = ['sucesso', 'alerta', 'atrasada', 'falha', 'sem_agenda']
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {itens.map((k) => (
        <li key={k} className="inline-flex items-center gap-1.5">
          <span className="flex h-3.5 items-end" aria-hidden>
            <span className={cn('w-1 rounded-[1.5px]', EXECUCAO[k].ponto, EXECUCAO[k].altura)} />
          </span>
          {EXECUCAO[k].rotulo}
        </li>
      ))}
    </ul>
  )
}
