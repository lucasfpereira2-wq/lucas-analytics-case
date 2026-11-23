import { ChevronDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EChart, type EChartsOption } from '@/components/dados/EChart'
import { fmtCompacto, fmtData, fmtDiaMes, fmtDuracao, fmtNumero, fmtPct } from '@/lib/formato'
import { useTema } from '@/lib/tema'
import { tokensGrafico } from '@/lib/tema-echarts'
import { cn } from '@/lib/utils'
import type { Execucao } from '@/types/governanca'
import { EXEC_INFO, FaixaExecucoes, LegendaExecucoes, TextoCodigo, estiloExec } from '../comum'

const hora = (iso: string | null) => (iso && iso.length >= 16 ? iso.slice(11, 16) : '–')
const GRADE = { esquerda: 56, direita: 12 }

/** Volume carregado por dia vs. esperado, com anomalias marcadas, faixa de status e tabela de execuções. */
export function Execucoes({ execucoes }: { execucoes: Execucao[] }) {
  const tema = useTema((s) => s.tema)
  const [todas, setTodas] = useState(false)

  const resumo = useMemo(() => {
    const agendadas = execucoes.filter((e) => e.status !== 'sem_agenda')
    const ok = agendadas.filter((e) => e.status === 'sucesso').length
    return {
      agendadas: agendadas.length,
      ok,
      falhas: agendadas.filter((e) => e.status === 'falha' || e.status === 'nao_executou').length,
      anomalias: execucoes.filter((e) => e.anomalia_volume).length,
    }
  }, [execucoes])

  const option = useMemo<EChartsOption>(() => {
    const t = tokensGrafico(tema)
    const semCarga = (e: Execucao) => e.status === 'falha' || e.status === 'nao_executou'
    return {
      grid: { left: GRADE.esquerda, right: GRADE.direita, top: 34, bottom: 26, containLabel: false },
      legend: { top: 0, right: 0, itemWidth: 14, itemHeight: 8, selectedMode: false },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const i = (params as { dataIndex: number }[])[0]?.dataIndex ?? 0
          const e = execucoes[i]
          if (!e) return ''
          const dif = e.linhas !== null && e.linhas_esperadas > 0 ? e.linhas / e.linhas_esperadas - 1 : null
          const linha = (r: string, v: string) =>
            `<div style="display:flex;justify-content:space-between;gap:20px;line-height:1.7"><span style="opacity:.8">${r}</span><strong style="font-weight:600;font-variant-numeric:tabular-nums">${v}</strong></div>`
          return `<div style="min-width:190px;max-width:300px;white-space:normal"><div style="font-weight:600;margin-bottom:4px">${fmtData(e.data)} · ${EXEC_INFO[e.status]?.rotulo ?? e.status}</div>
            ${linha('Linhas carregadas', e.linhas === null ? '–' : fmtNumero(e.linhas))}
            ${e.status === 'sem_agenda' ? '' : linha('Esperado', fmtNumero(e.linhas_esperadas))}
            ${dif === null ? '' : linha('Diferença', fmtPct(dif, 1, { sinal: true }))}
            ${e.anomalia_volume ? `<div style="margin-top:4px;font-weight:600;color:${t.status.vermelho}">Anomalia de volume</div>` : ''}
            ${e.mensagem ? `<div style="margin-top:4px;opacity:.85">${e.mensagem.replace(/`/g, '')}</div>` : ''}</div>`
        },
      },
      xAxis: {
        type: 'category',
        data: execucoes.map((e) => fmtDiaMes(e.data)),
        axisTick: { show: false },
        axisLabel: { interval: (i: number) => i % 3 === (execucoes.length - 1) % 3 },
      },
      yAxis: { type: 'value', axisLabel: { formatter: (v: number) => fmtCompacto(v) }, splitNumber: 4 },
      series: [
        {
          type: 'bar',
          name: 'Linhas carregadas',
          barMaxWidth: 22,
          itemStyle: { borderRadius: [3, 3, 0, 0] },
          data: execucoes.map((e) => (e.anomalia_volume ? { value: e.linhas, itemStyle: { color: t.status.vermelho } } : e.linhas)),
          markPoint: {
            symbol: 'pin',
            symbolSize: 34,
            itemStyle: { color: t.status.vermelho },
            label: { formatter: '!', color: '#fff', fontWeight: 700, fontSize: 13 },
            data: execucoes.flatMap((e, i) => (e.anomalia_volume ? [{ coord: [i, Math.max(e.linhas ?? 0, 0)], name: 'Anomalia de volume' }] : [])),
          },
        },
        {
          type: 'line',
          name: 'Esperado',
          step: 'middle',
          symbol: 'none',
          lineStyle: { type: [5, 4], width: 1.5, color: t.textoSecundario },
          itemStyle: { color: t.textoSecundario },
          data: execucoes.map((e) => (e.status === 'sem_agenda' ? null : e.linhas_esperadas)),
          connectNulls: false,
          z: 3,
        },
        {
          type: 'scatter',
          name: 'Falha ou não executou',
          symbol: 'path://M2 0 L8 6 L14 0 L16 2 L10 8 L16 14 L14 16 L8 10 L2 16 L0 14 L6 8 L0 2 Z',
          symbolSize: 13,
          itemStyle: { color: t.status.vermelho, opacity: 1 },
          emphasis: { scale: false },
          data: execucoes.map((e) => (semCarga(e) ? e.linhas_esperadas : null)),
          z: 4,
        },
      ],
    }
  }, [execucoes, tema])

  const recentes = useMemo(() => [...execucoes].reverse(), [execucoes])
  const visiveis = todas ? recentes : recentes.slice(0, 8)

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted-foreground">
        <strong className="font-semibold text-foreground">{resumo.ok}</strong> de {resumo.agendadas} execuções agendadas concluídas com sucesso
        {resumo.falhas > 0 && (
          <>
            {' '}
            · <strong className="font-semibold text-status-vermelho-texto">{resumo.falhas}</strong> {resumo.falhas === 1 ? 'falha' : 'falhas'}
          </>
        )}
        {resumo.anomalias > 0 && (
          <>
            {' '}
            · <strong className="font-semibold text-status-vermelho-texto">{resumo.anomalias}</strong> {resumo.anomalias === 1 ? 'anomalia de volume' : 'anomalias de volume'}
          </>
        )}
      </p>
      <div>
        <EChart option={option} altura={250} descricao="Linhas carregadas por dia comparadas ao volume esperado, com anomalias marcadas" />
        <div style={{ paddingLeft: GRADE.esquerda, paddingRight: GRADE.direita }} className="relative mt-1">
          <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[10.5px] text-muted-foreground">Status</span>
          <FaixaExecucoes execucoes={execucoes.map((e) => e.status)} dias={execucoes.map((e) => e.data)} altura={12} className="gap-[2px]" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <LegendaExecucoes />
          {resumo.anomalias > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-3 rounded-[3px] bg-status-vermelho" aria-hidden />
              Barra marcada com "!" = anomalia de volume
            </span>
          )}
        </div>
      </div>

      <div className="scroll-fino overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[720px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border bg-secondary/50 text-left text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="px-4 py-2.5">Data</th>
              <th scope="col" className="px-3 py-2.5">Início</th>
              <th scope="col" className="px-3 py-2.5 text-right">Duração</th>
              <th scope="col" className="px-3 py-2.5 text-right">Linhas</th>
              <th scope="col" className="px-3 py-2.5 text-right">Esperado</th>
              <th scope="col" className="px-3 py-2.5">Status</th>
              <th scope="col" className="px-4 py-2.5">Mensagem</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((e) => {
              const info = EXEC_INFO[e.status] ?? EXEC_INFO.sem_agenda
              const ruim = e.status === 'falha' || e.status === 'nao_executou' || e.anomalia_volume
              return (
                <tr key={e.data} className={cn('border-b border-border/70 last:border-0', ruim && 'bg-status-vermelho-fundo/50', e.status === 'sem_agenda' && 'text-muted-foreground')}>
                  <td className="tabular whitespace-nowrap px-4 py-2 font-medium">{fmtData(e.data)}</td>
                  <td className="tabular px-3 py-2">{hora(e.inicio)}</td>
                  <td className="tabular whitespace-nowrap px-3 py-2 text-right">{e.duracao_seg === null ? '–' : fmtDuracao(e.duracao_seg)}</td>
                  <td className={cn('tabular px-3 py-2 text-right', e.anomalia_volume && 'font-semibold text-status-vermelho-texto')}>{e.linhas === null ? '–' : fmtNumero(e.linhas)}</td>
                  <td className="tabular px-3 py-2 text-right text-muted-foreground">{e.status === 'sem_agenda' ? '–' : fmtNumero(e.linhas_esperadas)}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <span className={cn('inline-flex items-center gap-1.5 font-medium', info.texto)}>
                      <span className="size-2.5 rounded-[2px]" style={estiloExec(e.status)} aria-hidden />
                      <info.icone className="size-3.5" aria-hidden />
                      {info.rotulo}
                    </span>
                  </td>
                  <td className="min-w-56 px-4 py-2 text-[12.5px] leading-snug text-foreground/85">
                    {e.mensagem ? <TextoCodigo texto={e.mensagem} /> : e.anomalia_volume ? 'Volume fora da faixa esperada' : <span className="text-muted-foreground">–</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {recentes.length > 8 && (
        <button type="button" onClick={() => setTodas((v) => !v)} aria-expanded={todas} className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary hover:underline">
          {todas ? 'Mostrar só as 8 mais recentes' : `Ver as ${recentes.length} execuções`}
          <ChevronDown className={cn('size-4 transition-transform', todas && 'rotate-180')} aria-hidden />
        </button>
      )}
    </div>
  )
}
