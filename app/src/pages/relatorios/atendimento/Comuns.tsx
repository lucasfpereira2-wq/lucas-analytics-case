import { X } from 'lucide-react'
import type { ReactNode, Ref } from 'react'
import { EChart, type EChartHandle } from '@/components/dados/EChart'
import { useTema } from '@/lib/tema'
import { tokensGrafico } from '@/lib/tema-echarts'
import { cn } from '@/lib/utils'
import { opcao, tooltipHTML, type LinhaTooltip } from './util'

/** Título de bloco do relatório (tendência, motivos, satisfação...). */
export function Secao({ id, titulo, descricao, acoes, children }: { id?: string; titulo: string; descricao?: ReactNode; acoes?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-32 space-y-4 pt-3">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight">{titulo}</h2>
          {descricao && <p className="mt-0.5 text-[13px] text-muted-foreground">{descricao}</p>}
        </div>
        {acoes}
      </div>
      {children}
    </section>
  )
}

/** Controle segmentado (alternador de visão). */
export function Alternador<T extends string>({
  valor,
  opcoes,
  aoMudar,
  rotulo,
  className,
}: {
  valor: T
  opcoes: { id: T; rotulo: string }[]
  aoMudar: (v: T) => void
  rotulo: string
  className?: string
}) {
  return (
    <div role="group" aria-label={rotulo} className={cn('inline-flex shrink-0 rounded-lg border border-border bg-muted/60 p-0.5 text-xs font-medium', className)}>
      {opcoes.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={o.id === valor}
          onClick={() => aoMudar(o.id)}
          className={cn(
            'rounded-md px-2.5 py-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
            o.id === valor ? 'bg-card text-foreground shadow-card' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  )
}

/** Etiqueta de filtro local removível (ex.: motivo selecionado). */
export function ChipFiltro({ rotulo, aoRemover }: { rotulo: string; aoRemover: () => void }) {
  return (
    <button
      type="button"
      onClick={aoRemover}
      className="inline-flex max-w-full items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-primary/15"
      aria-label={`Remover filtro: ${rotulo}`}
    >
      <span className="truncate">{rotulo}</span>
      <X className="size-3.5 shrink-0 opacity-70" aria-hidden />
    </button>
  )
}

export interface ItemBarra {
  nome: string
  valor: number | null
  /** cor da entidade (padrão: primeira cor da paleta) */
  cor?: string
  /** linhas do tooltip */
  detalhes?: LinhaTooltip[]
}

/**
 * Barras horizontais comparativas (uma por entidade). A cor segue a entidade; `selecionados` destaca
 * os itens filtrados e esmaece os demais; `media` desenha a linha de referência.
 */
export function BarrasH({
  itens,
  fmt,
  selecionados,
  aoClicar,
  media,
  altura,
  descricao,
  rodapeTooltip,
  ref,
}: {
  itens: ItemBarra[]
  fmt: (v: number) => string
  selecionados?: string[]
  aoClicar?: (nome: string) => void
  media?: { valor: number | null; rotulo: string }
  altura?: number
  descricao?: string
  rodapeTooltip?: string
  ref?: Ref<EChartHandle>
}) {
  const tema = useTema((s) => s.tema)
  const t = tokensGrafico(tema)
  const temSel = !!selecionados?.length
  const larguraRotulos = Math.min(190, Math.max(76, Math.round(Math.max(0, ...itens.map((i) => i.nome.length)) * 7.4) + 22))
  const option = opcao({
    // margem esquerda explícita (não depende da medição de texto do canvas, que varia enquanto a fonte carrega)
    grid: { left: larguraRotulos, right: 64, top: media?.valor != null ? 26 : 8, bottom: 26, containLabel: false },
    tooltip: {
      trigger: 'item',
      formatter: (p: { dataIndex: number }) => {
        const it = itens[p.dataIndex]
        if (!it) return ''
        return tooltipHTML(it.nome, it.detalhes ?? [{ nome: 'Valor', valor: it.valor == null ? '–' : fmt(it.valor), cor: it.cor }], rodapeTooltip)
      },
    },
    xAxis: { type: 'value', axisLabel: { formatter: (v: number) => fmt(v), hideOverlap: true }, splitNumber: 4 },
    yAxis: {
      type: 'category',
      inverse: true,
      data: itens.map((i) => i.nome),
      axisLine: { show: false },
      axisLabel: { color: t.texto, fontSize: 12, width: larguraRotulos - 12, overflow: 'truncate' },
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 22,
        barCategoryGap: '34%',
        cursor: aoClicar ? 'pointer' : 'default',
        data: itens.map((i) => ({
          value: i.valor,
          itemStyle: {
            color: i.cor ?? t.series[0],
            borderRadius: [0, 4, 4, 0],
            opacity: temSel && !selecionados?.includes(i.nome) ? 0.28 : 1,
          },
        })),
        label: {
          show: true,
          position: 'right',
          distance: 6,
          color: t.texto,
          fontSize: 12,
          fontWeight: 600,
          formatter: (p: { value: number | null }) => (p.value == null ? '' : fmt(p.value)),
        },
        emphasis: { focus: 'none' },
        markLine:
          media?.valor != null
            ? {
                silent: true,
                symbol: 'none',
                lineStyle: { color: t.textoSecundario, type: 'dashed', width: 1 },
                label: { formatter: `${media.rotulo}: ${fmt(media.valor)}`, position: 'start', color: t.textoSecundario, fontSize: 11 },
                data: [{ xAxis: media.valor }],
              }
            : undefined,
      },
    ],
  })
  return (
    <EChart
      ref={ref}
      option={option}
      altura={altura ?? Math.max(150, itens.length * 40 + 44)}
      descricao={descricao}
      onEvents={aoClicar ? { click: (p) => aoClicar((p as { name: string }).name) } : undefined}
    />
  )
}
