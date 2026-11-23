import { ArrowRight, CircleAlert, Flag, Milestone, Target, TriangleAlert, Users } from 'lucide-react'
import { useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChartCard } from '@/components/dados/ChartCard'
import { EChart, type EChartHandle, type EChartsOption } from '@/components/dados/EChart'
import { StatusBadge } from '@/components/dados/StatusBadge'
import { Pagina } from '@/components/layout/Pagina'
import plano from '@/content/plano90.json'
import { useIncidentes, useSaude } from '@/lib/dados'
import { fmtNumero } from '@/lib/formato'
import { useTema } from '@/lib/tema'
import { tokensGrafico } from '@/lib/tema-echarts'
import type { Status } from '@/types/governanca'

interface PontoProjecao {
  dia: number
  indice: number
  marco?: string
}

const SEVERIDADE: Record<string, { status: Status; rotulo: string }> = {
  critico: { status: 'vermelho', rotulo: 'Crítico' },
  alto: { status: 'amarelo', rotulo: 'Alto' },
  medio: { status: 'amarelo', rotulo: 'Médio' },
}

function GraficoProjecao({ pontos, chartRef }: { pontos: PontoProjecao[]; chartRef: React.RefObject<EChartHandle | null> }) {
  const tema = useTema((s) => s.tema)
  const option = useMemo<EChartsOption>(() => {
    const t = tokensGrafico(tema)
    const marcos = pontos.filter((p) => p.marco)
    const min = Math.floor((Math.min(...pontos.map((p) => p.indice)) - 4) / 5) * 5
    return {
      grid: { left: 8, right: 28, top: 28, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        formatter: (ps: unknown) => {
          const p = (ps as { data: [number, number] }[])[0]
          const marco = pontos.find((x) => x.dia === p.data[0])?.marco
          return `<div style="font-weight:600;margin-bottom:2px">Dia ${p.data[0]}</div>
            <div>Índice de Saúde: <strong>${fmtNumero(p.data[1], 1)}%</strong></div>
            ${marco ? `<div style="opacity:.75;margin-top:2px;max-width:220px;white-space:normal">${marco}</div>` : ''}`
        },
      },
      xAxis: {
        type: 'value',
        min: 0,
        max: 90,
        interval: 30,
        axisLabel: { formatter: (v: number) => (v === 0 ? 'Hoje' : `Dia ${v}`) },
        splitLine: { show: false },
        axisLine: { show: true, lineStyle: { color: t.eixo } },
      },
      yAxis: { type: 'value', min, max: 100, interval: 5, axisLabel: { formatter: (v: number) => `${v}%` } },
      series: [
        {
          name: 'Índice de Saúde projetado',
          type: 'line',
          smooth: 0.25,
          showSymbol: false,
          data: pontos.map((p) => [p.dia, p.indice]),
          lineStyle: { width: 2.5, color: t.series[1] },
          itemStyle: { color: t.series[1] },
          areaStyle: {
            color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: `${t.series[1]}40` }, { offset: 1, color: `${t.series[1]}00` }] },
          },
          markLine: {
            silent: true,
            symbol: 'none',
            data: [
              { yAxis: 90, lineStyle: { color: t.textoSecundario, type: 'dashed', width: 1 }, label: { formatter: 'Meta 90%', position: 'insideStartTop', color: t.textoSecundario, fontSize: 11 } },
              { xAxis: 30, lineStyle: { color: t.eixo, type: 'solid', width: 1 }, label: { show: false } },
              { xAxis: 60, lineStyle: { color: t.eixo, type: 'solid', width: 1 }, label: { show: false } },
            ],
          },
          markArea: {
            silent: true,
            itemStyle: { color: 'transparent' },
            label: { color: t.textoSecundario, fontSize: 11, fontWeight: 600, position: 'insideTop' },
            data: [
              [{ name: 'Diagnóstico', xAxis: 0 }, { xAxis: 30 }],
              [{ name: 'Padronização', xAxis: 30 }, { xAxis: 60 }],
              [{ name: 'Monitoramento', xAxis: 60 }, { xAxis: 90 }],
            ],
          },
        },
        {
          name: 'Marcos',
          type: 'scatter',
          data: marcos.map((p) => (p.dia === 0 ? { value: [p.dia, p.indice], label: { position: 'right', distance: 10 } } : [p.dia, p.indice])),
          symbolSize: 11,
          itemStyle: { color: t.superficie, borderColor: t.series[1], borderWidth: 2.5 },
          label: {
            show: true,
            formatter: (p: unknown) => `${fmtNumero((p as { value: [number, number] }).value[1], 0)}%`,
            position: 'top',
            distance: 8,
            color: t.texto,
            fontSize: 11,
            fontWeight: 600,
          },
          tooltip: { show: false },
          z: 5,
        },
      ],
    }
  }, [pontos, tema])
  return <EChart ref={chartRef} option={option} altura={320} descricao="Projeção do Índice de Saúde dos Dados em 90 dias" />
}

export default function Plano90() {
  const { dados: saude } = useSaude()
  const { dados: incidentes } = useIncidentes()
  const chartRef = useRef<EChartHandle>(null)

  const pontos: PontoProjecao[] = saude?.projecao_90d?.length ? saude.projecao_90d : plano.projecao
  const marcos = pontos.filter((p) => p.marco)
  // linha de base real quando a governança já foi gerada; senão, os valores de referência do plano
  const metricas = plano.metricas.map((m, i) => {
    if (!saude) return m
    const total = saude.contagem.total || 1
    if (i === 0) return { ...m, base: `${fmtNumero(saude.indice_geral, 0)}%`, progresso_base: saude.indice_geral }
    if (i === 1) return { ...m, base: `${saude.tabelas_sem_pk} sem PK`, progresso_base: (1 - saude.tabelas_sem_pk / total) * 100 }
    if (i === 2) return { ...m, base: `${saude.tabelas_sem_dono} sem dono`, progresso_base: (1 - saude.tabelas_sem_dono / total) * 100 }
    if (i === 4 && saude.relatorios_total) {
      const okRel = saude.relatorios_total - saude.relatorios_impactados
      return { ...m, base: `${okRel} de ${saude.relatorios_total}`, progresso_base: (okRel / saude.relatorios_total) * 100 }
    }
    return m
  })
  const problemas = incidentes?.length
    ? [...incidentes]
        .sort((a, b) => a.prioridade - b.prioridade)
        .slice(0, 5)
        .map((i) => ({ titulo: i.titulo, tabela: i.tabela, severidade: i.severidade as string, impacto: i.impacto_negocio, acao: i.acao_recomendada }))
    : plano.problemas_fallback

  return (
    <Pagina titulo={plano.titulo} subtitulo={plano.subtitulo} icone={Milestone}>
      <div className="grid gap-4 md:grid-cols-3">
        {plano.principios.map((p) => (
          <div key={p.titulo} className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="text-sm font-semibold tracking-tight">{p.titulo}</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{p.texto}</p>
          </div>
        ))}
      </div>

      {/* Linha do tempo */}
      <section aria-label="Fases do plano" className="relative">
        <div className="absolute left-0 right-0 top-[19px] hidden h-0.5 bg-gradient-to-r from-agua-500/20 via-agua-500 to-marinho-700 xl:block" aria-hidden />
        <ol className="grid gap-5 xl:grid-cols-3">
          {plano.fases.map((f, i) => (
            <li key={f.id} className="relative animate-entrar" style={{ animationDelay: `${i * 90}ms` }}>
              <div className="mb-4 flex items-center gap-3">
                <span className="relative z-10 grid size-10 shrink-0 place-items-center rounded-full border-2 border-agua-500 bg-background text-sm font-semibold text-primary ring-4 ring-background">
                  {i + 1}
                </span>
                <span className="relative z-10 rounded-full bg-marinho-900 px-3 py-1 text-xs font-semibold tracking-wide text-white dark:bg-accent dark:text-accent-foreground">{f.periodo}</span>
              </div>
              <article className="flex h-[calc(100%-3.5rem)] flex-col rounded-2xl border border-border bg-card p-6 shadow-card">
                <h2 className="text-lg font-semibold leading-snug tracking-tight">{f.titulo}</h2>
                <p className="mt-2 flex gap-2 text-[13.5px] leading-relaxed text-muted-foreground">
                  <Target className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <span>{f.objetivo}</span>
                </p>
                <h3 className="mt-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Entregas</h3>
                <ul className="mt-2 space-y-2">
                  {f.entregas.map((e) => (
                    <li key={e} className="flex gap-2.5 text-[13.5px] leading-snug">
                      <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-agua-500" aria-hidden />
                      {e}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto grid gap-4 pt-6 sm:grid-cols-2">
                  <div>
                    <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <TriangleAlert className="size-3.5" aria-hidden />
                      Riscos
                    </h3>
                    <ul className="mt-2 space-y-1.5 text-[12.5px] leading-snug text-muted-foreground">
                      {f.riscos.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <Users className="size-3.5" aria-hidden />
                      Quem envolve
                    </h3>
                    <ul className="mt-2 space-y-1.5 text-[12.5px] leading-snug text-muted-foreground">
                      {f.envolve.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-5 xl:grid-cols-5">
        <ChartCard
          className="xl:col-span-3"
          titulo="Projeção do Índice de Saúde dos Dados"
          subtitulo={`De ${fmtNumero(pontos[0]?.indice, 0)}% hoje para ${fmtNumero(pontos[pontos.length - 1]?.indice, 0)}% no dia 90, com os marcos de cada fase`}
          chartRef={chartRef}
          nomeArquivo="projecao-indice-de-saude"
          csv={{ nome: 'projecao-indice-de-saude', colunas: ['Dia', 'Índice de Saúde (%)', 'Marco'], linhas: pontos.map((p) => [p.dia, p.indice, p.marco ?? '']) }}
          rodape={
            <ol className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
              {marcos.map((m) => (
                <li key={m.dia} className="flex gap-2">
                  <span className="tabular w-12 shrink-0 font-semibold text-foreground">Dia {m.dia}</span>
                  <span className="truncate">{m.marco}</span>
                </li>
              ))}
            </ol>
          }
        >
          <GraficoProjecao pontos={pontos} chartRef={chartRef} />
        </ChartCard>

        <section className="rounded-2xl border border-border bg-card shadow-card xl:col-span-2" aria-label="Métricas de sucesso">
          <header className="px-5 pt-4">
            <h3 className="text-sm font-semibold tracking-tight">Métricas de sucesso</h3>
            <p className="mt-0.5 text-[13px] text-muted-foreground">Linha de base hoje e meta ao fim dos 90 dias</p>
          </header>
          <ul className="divide-y divide-border px-5 pb-2 pt-1">
            {metricas.map((m) => (
              <li key={m.indicador} className="py-3.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[13.5px] font-medium leading-snug">{m.indicador}</span>
                  <span className="tabular flex shrink-0 items-center gap-1.5 text-[13px]">
                    <span className="text-muted-foreground">{m.base}</span>
                    <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden />
                    <strong className="font-semibold text-primary">{m.meta}</strong>
                  </span>
                </div>
                <div className="relative mt-2.5 h-1.5 rounded-full bg-muted" role="img" aria-label={`${m.indicador}: de ${m.base} para ${m.meta}`}>
                  <span className="absolute inset-y-0 left-0 rounded-full bg-agua-500/35" style={{ width: `${m.progresso_meta}%` }} />
                  <span className="absolute inset-y-0 left-0 rounded-full bg-marinho-700 dark:bg-serie-4" style={{ width: `${m.progresso_base}%` }} />
                  <span className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-agua-500" style={{ left: `${m.progresso_meta}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-label="Primeiros 5 problemas que eu atacaria">
        <div className="mb-3 flex items-center gap-2.5">
          <Flag className="size-4 text-primary" aria-hidden />
          <h2 className="text-lg font-semibold tracking-tight">Primeiros 5 problemas que eu atacaria</h2>
        </div>
        <ol className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          {problemas.map((p, i) => {
            const sev = SEVERIDADE[p.severidade] ?? SEVERIDADE.medio
            return (
              <li key={`${p.tabela}-${i}`} className="grid gap-x-5 gap-y-2 border-b border-border p-5 last:border-b-0 md:grid-cols-[2.25rem_minmax(0,1.1fr)_minmax(0,1fr)_auto] md:items-start">
                <span className="tabular grid size-9 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">{i + 1}</span>
                <div className="min-w-0">
                  <p className="text-[14.5px] font-semibold leading-snug">{p.titulo}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{p.impacto.replace(/`/g, '')}</p>
                </div>
                <p className="flex gap-2 text-[13px] leading-relaxed">
                  <CircleAlert className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <span>
                    <span className="font-semibold">Ação: </span>
                    {p.acao.replace(/`/g, '')}
                  </span>
                </p>
                <div className="flex items-center gap-3 md:flex-col md:items-end">
                  <StatusBadge status={sev.status} rotulo={sev.rotulo} tamanho="sm" />
                  <Link to={`/farol/${encodeURIComponent(p.tabela)}`} className="inline-flex items-center gap-1 font-mono text-xs font-medium text-primary hover:underline">
                    {p.tabela}
                    <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                </div>
              </li>
            )
          })}
        </ol>
        {!incidentes?.length && <p className="mt-2 text-xs text-muted-foreground">Lista de referência do plano. Com os dados de governança carregados, esta seção mostra os incidentes abertos por prioridade.</p>}
      </section>
    </Pagina>
  )
}
