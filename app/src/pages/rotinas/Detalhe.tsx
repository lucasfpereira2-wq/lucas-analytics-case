import { Repeat2, Table2 } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { STATUS_INFO, TextoComTabelas } from '@/components/dados'
import { EChart, type EChartsOption } from '@/components/dados/EChart'
import { fmtData, fmtDiaMes, fmtDuracao, fmtNumero } from '@/lib/formato'
import { useTema } from '@/lib/tema'
import { tokensGrafico } from '@/lib/tema-echarts'
import { cn } from '@/lib/utils'
import type { Pipeline, StatusExecucao, TabelaResumo } from '@/types/governanca'
import { EXECUCAO, StatusExec, fmtInicio } from './comum'

const CAIXA_MENSAGEM: Partial<Record<StatusExecucao, string>> = {
  falha: 'border-status-vermelho/35 bg-status-vermelho-fundo',
  nao_executou: 'border-status-vermelho/35 bg-status-vermelho-fundo',
  atrasada: 'border-status-amarelo/40 bg-status-amarelo-fundo',
  alerta: 'border-status-amarelo/40 bg-status-amarelo-fundo',
}

function Rotulo({ children }: { children: string }) {
  return <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</h4>
}

/** Duração de cada execução nos últimos 30 dias. A cor da barra indica o resultado (status), com a média como referência. */
function GraficoDuracao({ p }: { p: Pipeline }) {
  const tema = useTema((s) => s.tema)
  const option = useMemo<EChartsOption>(() => {
    const t = tokensGrafico(tema)
    const cor = (s: StatusExecucao) => (s === 'falha' || s === 'nao_executou' ? t.status.vermelho : s === 'alerta' || s === 'atrasada' ? t.status.amarelo : t.series[0])
    const execs = p.execucoes_30d
    return {
      grid: { left: 0, right: 74, top: 12, bottom: 0, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const item = (Array.isArray(params) ? params[0] : params) as { dataIndex: number }
          const e = execs[item.dataIndex]
          if (!e) return ''
          return `<div style="min-width:150px"><div style="font-weight:600;margin-bottom:4px">${fmtData(e.data)}</div>
            <div style="display:flex;justify-content:space-between;gap:20px;line-height:1.7"><span style="opacity:.8">Resultado</span><strong style="font-weight:600">${EXECUCAO[e.status].rotulo}</strong></div>
            <div style="display:flex;justify-content:space-between;gap:20px;line-height:1.7"><span style="opacity:.8">Duração</span><strong style="font-weight:600">${e.duracao_seg != null ? fmtDuracao(e.duracao_seg) : '–'}</strong></div></div>`
        },
      },
      xAxis: { type: 'category', data: execs.map((e) => e.data), axisLabel: { formatter: (d: string) => fmtDiaMes(d), interval: (i: number) => (execs.length - 1 - i) % 7 === 0 } },
      yAxis: { type: 'value', splitNumber: 3, axisLabel: { formatter: (v: number) => fmtDuracao(v) } },
      series: [
        {
          type: 'bar',
          name: 'Duração',
          barMaxWidth: 12,
          barCategoryGap: '25%',
          data: execs.map((e) => ({ value: e.duracao_seg ?? '-', itemStyle: { color: cor(e.status), borderRadius: [3, 3, 0, 0] } })),
          markLine:
            p.duracao_media_seg > 0
              ? {
                  silent: true,
                  symbol: 'none',
                  lineStyle: { color: t.textoSecundario, type: 'dashed', width: 1 },
                  label: { position: 'end', color: t.textoSecundario, fontSize: 11, formatter: () => `média ${fmtDuracao(p.duracao_media_seg)}` },
                  data: [{ name: 'Média', yAxis: p.duracao_media_seg }],
                }
              : undefined,
        },
      ],
    }
  }, [p, tema])
  return <EChart option={option} altura={170} descricao={`Duração por execução da rotina ${p.nome} nos últimos 30 dias`} />
}

/** Painel da linha expandida: descrição, cron, falhas recorrentes, duração por execução e tabelas com farol. */
export function DetalheRotina({ p, tabelas }: { p: Pipeline; tabelas: Map<string, TabelaResumo> }) {
  const u = p.ultima_execucao
  const temDuracao = p.execucoes_30d.some((e) => e.duracao_seg != null)
  return (
    <div className="grid gap-x-8 gap-y-5 border-t border-border bg-background/50 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)_minmax(0,1.25fr)]">
      <div className="min-w-0 space-y-3">
        <div>
          <Rotulo>O que esta rotina faz</Rotulo>
          <p className="mt-1 text-[13px] leading-relaxed">
            <TextoComTabelas texto={p.descricao} />
          </p>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
          <dt className="text-muted-foreground">Agenda</dt>
          <dd>
            {p.agenda} <code className="ml-1 rounded-md bg-foreground/[0.07] px-1.5 py-px font-mono text-[12px]">{p.agenda_cron}</code>
          </dd>
          <dt className="text-muted-foreground">Orquestrador</dt>
          <dd>{p.orquestrador}</dd>
          <dt className="text-muted-foreground">Responsável</dt>
          <dd>{p.dono ?? 'Sem dono definido'}</dd>
          <dt className="text-muted-foreground">Identificador</dt>
          <dd className="font-mono text-[12px]">{p.id}</dd>
        </dl>
        {u.mensagem && (
          <div className={cn('rounded-xl border px-3.5 py-2.5 text-[13px] leading-relaxed', CAIXA_MENSAGEM[u.status] ?? 'border-border bg-card')}>
            <p className="flex flex-wrap items-center gap-x-2 text-xs">
              <StatusExec status={u.status} />
              <span className="text-foreground/70">
                última execução{u.inicio ? ` · ${fmtInicio(u.inicio)}` : ''}
                {u.duracao_seg != null ? ` · ${fmtDuracao(u.duracao_seg)}` : ''}
              </span>
            </p>
            <p className="mt-1">
              <TextoComTabelas texto={u.mensagem} />
            </p>
          </div>
        )}
      </div>

      <div className="min-w-0">
        <Rotulo>Falhas recorrentes em 30 dias</Rotulo>
        {p.falhas_recorrentes.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {p.falhas_recorrentes.map((f) => (
              <li key={f.erro} className="rounded-xl border border-border bg-card px-3.5 py-2.5">
                <p className="text-[13px] leading-relaxed">
                  <TextoComTabelas texto={f.erro} />
                </p>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                    <Repeat2 className="size-3.5" aria-hidden />
                    {fmtNumero(f.ocorrencias)} {f.ocorrencias === 1 ? 'ocorrência' : 'ocorrências'}
                  </span>
                  <span>última em {fmtData(f.ultima)}</span>
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[13px] text-muted-foreground">Nenhuma falha registrada nos últimos 30 dias.</p>
        )}

        <div className="mt-4">
          <Rotulo>{`Tabelas carregadas (${p.tabelas.length})`}</Rotulo>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {p.tabelas.map((nome) => {
              const t = tabelas.get(nome)
              const s = t ? STATUS_INFO[t.status] : null
              const Icone = s?.icone ?? Table2
              return (
                <li key={nome}>
                  <Link
                    to={`/farol/${encodeURIComponent(nome)}`}
                    title={t ? `${s?.rotulo}: ${t.motivo_status.replace(/`/g, '')}` : 'Abrir no Farol'}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 font-mono text-[12px] font-medium transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    <Icone className={cn('size-3.5 shrink-0', s ? s.texto : 'text-muted-foreground')} aria-hidden />
                    {nome}
                    {s && <span className="sr-only"> ({s.rotulo})</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      <div className="min-w-0 lg:col-span-2 xl:col-span-1">
        <Rotulo>Duração por execução (30 dias)</Rotulo>
        {temDuracao ? (
          <>
            <GraficoDuracao p={p} />
            <p className="mt-1 text-xs text-muted-foreground">A cor da barra indica o resultado da execução; dias sem barra não tiveram execução concluída.</p>
          </>
        ) : (
          <p className="mt-2 text-[13px] text-muted-foreground">Sem execuções concluídas nos últimos 30 dias.</p>
        )}
      </div>
    </div>
  )
}
