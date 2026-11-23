import { ArrowLeft, ChevronRight, MousePointerClick } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChartCard } from '@/components/dados'
import { EChart, type EChartHandle } from '@/components/dados/EChart'
import { Button } from '@/components/ui/button'
import { filtrar, serieTemporalPor, somarDias, type Granularidade } from '@/lib/cubo'
import type { FiltrosResolvidos } from '@/lib/filtros'
import { fmtData, fmtDiaMes, fmtMes, fmtNumero, fmtPct } from '@/lib/formato'
import { corDaSerie } from '@/lib/tema-echarts'
import type { Cubo } from '@/types/cubo'
import { DIM_CANAL, fmtEixo, opcao, tooltipHTML, useTokens, type LinhaTooltip } from './util'

interface Nivel {
  g: Granularidade
  inicio: string
  fim: string
  rotulo: string
}

const NOME_NIVEL: Record<Granularidade, string> = { mes: 'mês', semana: 'semana', dia: 'dia' }
const PROXIMO: Record<Granularidade, Granularidade | null> = { mes: 'semana', semana: 'dia', dia: null }

const max = (a: string, b: string) => (a > b ? a : b)
const min = (a: string, b: string) => (a < b ? a : b)

/** Intervalo de datas coberto por um bucket, limitado ao nível atual. */
function intervaloDoBucket(bucket: string, g: Granularidade, nivel: { inicio: string; fim: string }): { inicio: string; fim: string } {
  if (g === 'dia') return { inicio: bucket, fim: bucket }
  if (g === 'semana') return { inicio: max(bucket, nivel.inicio), fim: min(somarDias(bucket, 6), nivel.fim) }
  const a = Number(bucket.slice(0, 4))
  const m = Number(bucket.slice(5, 7))
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate()
  return { inicio: max(`${bucket}-01`, nivel.inicio), fim: min(`${bucket}-${String(ultimo).padStart(2, '0')}`, nivel.fim) }
}

/** O bucket (mês ou semana) foi cortado pelos limites do período: o total não é comparável com os vizinhos. */
function ehParcial(bucket: string, g: Granularidade, nivel: { inicio: string; fim: string }): boolean {
  if (g === 'dia') return false
  const cheio = intervaloDoBucket(bucket, g, { inicio: '0000-01-01', fim: '9999-12-31' })
  return cheio.inicio < nivel.inicio || cheio.fim > nivel.fim
}

function tituloDoBucket(bucket: string, g: Granularidade, nivel: { inicio: string; fim: string }): string {
  const r = intervaloDoBucket(bucket, g, nivel)
  if (g === 'mes') return ehParcial(bucket, g, nivel) ? `${fmtMes(bucket)} · parcial, ${fmtDiaMes(r.inicio)} a ${fmtDiaMes(r.fim)}` : fmtMes(bucket)
  if (g === 'dia') return fmtData(bucket)
  return r.inicio === r.fim ? fmtData(r.inicio) : `Semana de ${fmtDiaMes(r.inicio)} a ${fmtDiaMes(r.fim)}`
}

/**
 * Tendência de volume por canal com drill-down mês → semana → dia. O clique numa barra detalha o bucket;
 * a trilha permite voltar.
 */
export function BlocoVolume({ cubo, f }: { cubo: Cubo; f: FiltrosResolvidos }) {
  const ref = useRef<EChartHandle>(null)
  const { tema, t } = useTokens()

  // a pilha de drill vale só para a combinação de período + granularidade em que foi criada
  const chave = `${f.periodo.inicio}|${f.periodo.fim}|${f.granularidade}`
  const [estado, setEstado] = useState<{ chave: string; pilha: Nivel[] }>({ chave, pilha: [] })
  const pilha = estado.chave === chave ? estado.pilha : []
  const raiz: Nivel = useMemo(
    () => ({ g: f.granularidade, inicio: f.periodo.inicio, fim: f.periodo.fim, rotulo: 'Período filtrado' }),
    [f.granularidade, f.periodo.inicio, f.periodo.fim],
  )
  const nivel = pilha[pilha.length - 1] ?? raiz

  const serie = useMemo(() => {
    const linhas = filtrar(cubo, { ...f.filtrosCubo, inicio: nivel.inicio, fim: nivel.fim }, f.meta)
    return serieTemporalPor(cubo, linhas, nivel.g, DIM_CANAL, 'contatos', { inicio: nivel.inicio, fim: nivel.fim })
  }, [cubo, f.filtrosCubo, f.meta, nivel])

  const ordemCanais = useMemo(() => cubo.dims.find((d) => d.nome === DIM_CANAL)?.valores ?? [], [cubo])

  const rotulos = useMemo(
    () =>
      serie.buckets.map((b) => {
        const base = nivel.g === 'mes' ? fmtMes(b) : fmtDiaMes(intervaloDoBucket(b, nivel.g, nivel).inicio)
        return nivel.g === 'mes' && ehParcial(b, nivel.g, nivel) ? `${base}\n(parcial)` : base
      }),
    [serie.buckets, nivel],
  )

  const totalGeral = serie.series.reduce((s, x) => s + x.total, 0)
  const proximo = PROXIMO[nivel.g]

  const option = useMemo(() => {
    const denso = serie.buckets.length > 45
    const series = serie.series.map((s) => ({
      type: 'bar',
      name: s.nome,
      stack: 'canais',
      cursor: proximo ? 'pointer' : 'default',
      barMaxWidth: 44,
      barCategoryGap: denso ? '18%' : '32%',
      itemStyle: {
        color: corDaSerie(ordemCanais.indexOf(s.nome), tema),
        borderRadius: 0,
        borderColor: t.superficie,
        borderWidth: denso ? 0 : 1,
      },
      emphasis: { focus: 'none' },
      data: s.valores,
    }))
    return opcao({
      grid: { left: 8, right: 16, top: 40, bottom: 8, containLabel: true },
      legend: { top: 0, left: 0 },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: { dataIndex: number; seriesName: string; value: number | null; color: string }[]) => {
          if (!params.length) return ''
          const i = params[0].dataIndex
          const total = params.reduce((s, p) => s + (p.value ?? 0), 0)
          const linhas: LinhaTooltip[] = params.map((p) => ({
            nome: p.seriesName,
            cor: p.color,
            valor: fmtNumero(p.value ?? 0),
            nota: total ? fmtPct((p.value ?? 0) / total, 0) : undefined,
          }))
          linhas.push({ nome: 'Total', valor: fmtNumero(total), separar: true })
          return tooltipHTML(tituloDoBucket(serie.buckets[i], nivel.g, nivel), linhas, proximo ? `Clique para detalhar por ${NOME_NIVEL[proximo]}.` : undefined)
        },
      },
      xAxis: { type: 'category', data: rotulos },
      yAxis: { type: 'value', axisLabel: { formatter: (v: number) => fmtEixo(v) } },
      series,
    })
  }, [serie, rotulos, nivel, ordemCanais, tema, t, proximo])

  const detalhar = (indice: number) => {
    if (!proximo) return
    const bucket = serie.buckets[indice]
    if (!bucket) return
    const r = intervaloDoBucket(bucket, nivel.g, nivel)
    const rotulo = nivel.g === 'mes' ? fmtMes(bucket) : r.inicio === r.fim ? fmtData(r.inicio) : `${fmtDiaMes(r.inicio)} a ${fmtDiaMes(r.fim)}`
    setEstado({ chave, pilha: [...pilha, { g: proximo, inicio: r.inicio, fim: r.fim, rotulo }] })
  }
  const voltarPara = (n: number) => setEstado({ chave, pilha: pilha.slice(0, n) })

  // clique em qualquer ponto da coluna (não só sobre a barra): mais fácil de acertar em barras finas
  const aoDetalhar = useRef(detalhar)
  aoDetalhar.current = detalhar
  const temGrafico = serie.series.length > 0
  useEffect(() => {
    const inst = ref.current?.instancia()
    if (!inst || !temGrafico) return
    const zr = inst.getZr()
    const clique = (e: { offsetX: number; offsetY: number }) => {
      const ponto = [e.offsetX, e.offsetY]
      if (!inst.containPixel('grid', ponto)) return
      const indice = inst.convertFromPixel({ xAxisIndex: 0 }, ponto[0]) as unknown as number
      if (Number.isFinite(indice)) aoDetalhar.current(Math.round(indice))
    }
    zr.on('click', clique)
    return () => {
      zr.off('click', clique)
    }
  }, [tema, temGrafico])

  const trilha = [raiz, ...pilha]

  return (
    <ChartCard
      titulo="Por quais canais os clientes procuram a administradora, e como o volume evolui?"
      subtitulo={`Contatos por canal, por ${NOME_NIVEL[nivel.g]} · ${fmtData(nivel.inicio)} a ${fmtData(nivel.fim)} · ${fmtNumero(totalGeral)} contatos`}
      chartRef={ref}
      nomeArquivo="volume-de-contatos-por-canal"
      vazio={!serie.series.length}
      csv={() => ({
        nome: 'volume-de-contatos-por-canal',
        colunas: ['Período', ...serie.series.map((s) => s.nome), 'Total'],
        linhas: serie.buckets.map((b, i) => [b, ...serie.series.map((s) => s.valores[i]), serie.series.reduce((x, s) => x + s.valores[i], 0)]),
      })}
    >
      {/* coluna flex: em tela cheia o gráfico ocupa a altura que sobra abaixo da trilha */}
      <div className="flex h-full flex-col">
      <div className="mb-2 flex min-h-8 shrink-0 flex-wrap items-center gap-x-1 gap-y-1.5 text-xs">
        {pilha.length > 0 && (
          <Button variant="outline" size="sm" className="mr-1.5 h-7 gap-1 px-2 text-xs" onClick={() => voltarPara(pilha.length - 1)}>
            <ArrowLeft className="size-3.5" aria-hidden />
            Voltar
          </Button>
        )}
        <nav aria-label="Trilha do detalhamento" className="flex flex-wrap items-center gap-1">
          {trilha.map((n, i) => {
            const atual = i === trilha.length - 1
            return (
              <span key={`${n.rotulo}-${i}`} className="inline-flex items-center gap-1">
                {i > 0 && <ChevronRight className="size-3.5 text-muted-foreground/60" aria-hidden />}
                {atual ? (
                  <span className="rounded-md bg-muted px-2 py-1 font-medium text-foreground">
                    {n.rotulo} <span className="font-normal text-muted-foreground">· por {NOME_NIVEL[n.g]}</span>
                  </span>
                ) : (
                  <button type="button" onClick={() => voltarPara(i)} className="rounded-md px-2 py-1 font-medium text-primary hover:bg-muted">
                    {n.rotulo}
                  </button>
                )}
              </span>
            )
          })}
        </nav>
        {proximo && (
          <span className="ml-auto hidden items-center gap-1.5 text-muted-foreground sm:inline-flex">
            <MousePointerClick className="size-3.5" aria-hidden />
            Clique numa barra para detalhar por {NOME_NIVEL[proximo]}
          </span>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <EChart
          ref={ref}
          option={option}
          altura="100%"
          style={{ minHeight: 340 }}
          descricao="Volume de contatos por canal ao longo do tempo, em barras empilhadas"
          className={proximo ? 'cursor-pointer' : undefined}
        />
      </div>
      </div>
    </ChartCard>
  )
}
