import { ArrowDownRight, ArrowUpRight, CircleHelp, Minus } from 'lucide-react'
import { useMemo } from 'react'
import { EChart, type EChartsOption } from '@/components/dados/EChart'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { fmtData, fmtDataHora, fmtDiaMes, fmtNumero, fmtPct } from '@/lib/formato'
import { useTema } from '@/lib/tema'
import { tokensGrafico, tooltipBR } from '@/lib/tema-echarts'
import { cn } from '@/lib/utils'
import type { Saude } from '@/types/governanca'

/** "−11,7 pts" / "+2,0 pts" (variação do índice em pontos). */
export function fmtPontos(v: number): string {
  const sinal = v > 0 ? '+' : v < 0 ? '−' : ''
  return `${sinal}${fmtNumero(Math.abs(v), 1)} pts`
}

/** Anel do índice: cor de identidade (não é status), trilho neutro. */
function Anel({ valor, tamanho = 156 }: { valor: number; tamanho?: number }) {
  const esp = 13
  const r = (tamanho - esp) / 2
  const c = 2 * Math.PI * r
  const fracao = Math.max(0, Math.min(1, valor / 100))
  return (
    <div className="relative shrink-0" style={{ width: tamanho, height: tamanho }} role="img" aria-label={`Índice de Saúde dos Dados: ${fmtNumero(valor, 1)} de 100`}>
      <svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`} className="-rotate-90">
        <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" strokeWidth={esp} className="stroke-muted" />
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={r}
          fill="none"
          strokeWidth={esp}
          strokeLinecap="round"
          strokeDasharray={`${c * fracao} ${c}`}
          className="stroke-primary"
          style={{ transition: 'stroke-dasharray .9s cubic-bezier(.2,.7,.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tabular text-[42px] font-semibold leading-none tracking-tight">{fmtNumero(valor, 1)}</span>
        <span className="mt-1 text-xs font-medium text-muted-foreground">de 100</span>
      </div>
    </div>
  )
}

function ChipVariacao({ pontos, rotulo }: { pontos: number; rotulo: string }) {
  const estavel = Math.abs(pontos) < 0.05
  const Seta = estavel ? Minus : pontos > 0 ? ArrowUpRight : ArrowDownRight
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        className={cn(
          'tabular inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold',
          estavel ? 'bg-muted text-muted-foreground' : pontos > 0 ? 'bg-status-verde-fundo text-status-verde-texto' : 'bg-status-vermelho-fundo text-status-vermelho-texto',
        )}
      >
        <Seta className="size-3.5" aria-hidden />
        {fmtPontos(pontos)}
      </span>
      {rotulo}
    </span>
  )
}

function ComoECalculado({ saude }: { saude: Saude }) {
  const pesos = saude.formula.filter((f) => f.peso > 0)
  const ajustes = saude.formula.filter((f) => !(f.peso > 0))
  return (
    <Popover>
      <PopoverTrigger className="inline-flex items-center gap-1 rounded-md text-xs font-medium text-muted-foreground underline decoration-dotted underline-offset-4 transition-colors hover:text-foreground">
        <CircleHelp className="size-3.5" aria-hidden />
        Como é calculado
      </PopoverTrigger>
      <PopoverContent className="w-[26rem] max-w-[calc(100vw-2rem)] p-4">
        <p className="text-sm font-semibold tracking-tight">Como o índice é calculado</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Nota de 0 a 100 para cada tabela, combinando quatro componentes. O índice geral é a média ponderada pela criticidade da tabela.</p>
        <ul className="mt-3 space-y-3">
          {pesos.map((f) => (
            <li key={f.nome}>
              <div className="flex items-center justify-between gap-3 text-[13px]">
                <span className="font-medium">{f.nome}</span>
                <span className="tabular font-semibold">{fmtPct(f.peso, 0)}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${f.peso * 100}%` }} />
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.descricao}</p>
            </li>
          ))}
        </ul>
        {ajustes.map((f) => (
          <p key={f.nome} className="mt-3 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">{f.nome}.</span> {f.descricao}
          </p>
        ))}
      </PopoverContent>
    </Popover>
  )
}

function Tendencia({ saude }: { saude: Saude }) {
  const tema = useTema((s) => s.tema)
  const option = useMemo<EChartsOption>(() => {
    const t = tokensGrafico(tema)
    const pts = saude.tendencia_30d
    const valores = pts.map((p) => p.indice)
    const min = Math.min(...valores)
    const ult = pts.length - 1
    const piso = Math.max(0, Math.floor((min - 4) / 10) * 10)
    return {
      grid: { left: 0, right: 46, top: 22, bottom: 0, containLabel: true },
      tooltip: { trigger: 'axis', formatter: tooltipBR((v) => fmtNumero(v, 1), { titulo: (d) => fmtData(d) }) },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: pts.map((p) => p.data),
        axisLabel: { formatter: (d: string) => fmtDiaMes(d), interval: (i: number) => (ult - i) % 7 === 0 },
      },
      yAxis: { type: 'value', min: piso, max: 100, interval: 10, axisLabel: { formatter: (v: number) => fmtNumero(v, 0) } },
      series: [
        {
          type: 'line',
          name: 'Índice de saúde',
          data: valores,
          color: t.destaque,
          lineStyle: { width: 2.5 },
          areaStyle: {
            color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: `${t.destaque}38` }, { offset: 1, color: `${t.destaque}00` }] },
          },
          markArea: {
            silent: true,
            itemStyle: { color: tema === 'escuro' ? 'rgba(143,165,186,.09)' : 'rgba(11,34,57,.045)' },
            label: { color: t.textoSecundario, fontSize: 11, position: 'insideTopLeft', distance: 4 },
            data: [[{ name: 'Últimos 7 dias', xAxis: pts[Math.max(0, ult - 7)].data }, { xAxis: pts[ult].data }]],
          },
          markPoint: {
            symbol: 'circle',
            symbolSize: 10,
            itemStyle: { color: t.destaque, borderColor: t.superficie, borderWidth: 2 },
            label: { position: 'right', distance: 6, color: t.texto, fontWeight: 600, fontSize: 13, formatter: () => fmtNumero(valores[ult], 1) },
            data: [{ name: 'Hoje', coord: [pts[ult].data, valores[ult]] }],
          },
        },
      ],
    }
  }, [saude, tema])
  return <EChart option={option} altura={168} descricao="Tendência do Índice de Saúde dos Dados nos últimos 30 dias" />
}

/** Bloco de destaque: anel com o índice geral, variações e a tendência de 30 dias. */
export function PainelIndice({ saude, dataReferencia }: { saude: Saude; dataReferencia?: string }) {
  const queda = saude.variacao_7d < 0
  return (
    <section aria-label="Índice de Saúde dos Dados" className="grid gap-x-8 gap-y-5 rounded-2xl border border-border bg-card p-5 shadow-card lg:grid-cols-[auto_minmax(0,1fr)] lg:p-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <Anel valor={saude.indice_geral} />
        <div className="min-w-0 max-w-[17rem]">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">Índice de Saúde dos Dados</h2>
          <p className="mt-1.5 text-[17px] font-semibold leading-snug tracking-tight">
            {queda ? `Caiu ${fmtNumero(Math.abs(saude.variacao_7d), 1)} pontos em 7 dias` : saude.variacao_7d > 0 ? `Subiu ${fmtNumero(saude.variacao_7d, 1)} pontos em 7 dias` : 'Estável nos últimos 7 dias'}
          </p>
          <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
            {saude.contagem.vermelho} tabelas críticas e {saude.rotinas_falharam_hoje} rotinas com falha hoje puxam o índice para baixo.
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            <ChipVariacao pontos={saude.variacao_7d} rotulo="em 7 dias" />
            <ChipVariacao pontos={saude.variacao_30d} rotulo="em 30 dias" />
          </div>
          <div className="mt-3">
            <ComoECalculado saude={saude} />
          </div>
        </div>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="text-sm font-semibold tracking-tight">Tendência de 30 dias</h3>
          {dataReferencia && <span className="text-xs text-muted-foreground">Posição de {fmtDataHora(dataReferencia)}</span>}
        </div>
        <Tendencia saude={saude} />
      </div>
    </section>
  )
}
