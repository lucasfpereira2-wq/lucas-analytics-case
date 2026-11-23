import { useMemo, useRef } from 'react'
import { ChartCard } from '@/components/dados'
import { EChart, type EChartHandle } from '@/components/dados/EChart'
import { agrupar, filtrar, razao, serieTemporalPor, type SeriePorDimensao } from '@/lib/cubo'
import type { FiltrosResolvidos } from '@/lib/filtros'
import { fmtNumero, fmtPct } from '@/lib/formato'
import { useTema } from '@/lib/tema'
import { corDaSerie } from '@/lib/tema-echarts'
import type { Cubo } from '@/types/cubo'
import { BarrasH, type ItemBarra } from './Comuns'
import { DIM_CANAL, fmtMMSS, opcao, pctCSV, semCanal, tooltipHTML, useAlternarCanal, type LinhaTooltip } from './util'

interface SerieRazao {
  nome: string
  valores: (number | null)[]
}

/** Razão por canal e bucket a partir de duas séries aditivas (numerador / denominador). */
function razaoPorCanal(num: SeriePorDimensao, den: SeriePorDimensao): SerieRazao[] {
  return den.series.map((d) => {
    const n = num.series.find((s) => s.nome === d.nome)
    return { nome: d.nome, valores: d.valores.map((v, i) => (v > 0 && n ? n.valores[i] / v : null)) }
  })
}

function LinhasPorCanal({
  titulo,
  subtitulo,
  arquivo,
  series,
  buckets,
  rotulos,
  ordem,
}: {
  titulo: string
  subtitulo: string
  arquivo: string
  series: SerieRazao[]
  buckets: string[]
  rotulos: string[]
  ordem: string[]
}) {
  const ref = useRef<EChartHandle>(null)
  const tema = useTema((s) => s.tema)
  const option = useMemo(() => {
    // eixo em passos "de relógio" (30s, 1min, 5min...), não em múltiplos decimais de segundos
    const maior = Math.max(0, ...series.flatMap((s) => s.valores.map((v) => v ?? 0)))
    const passo = [15, 30, 60, 120, 180, 300, 600, 900, 1800, 3600].find((p) => maior / p <= 6) ?? 7200
    return opcao({
        legend: { top: 0, left: 0 },
        grid: { left: 8, right: 16, top: 40, bottom: 8, containLabel: true },
        tooltip: {
          trigger: 'axis',
          formatter: (params: { dataIndex: number; seriesName: string; value: number | null; color: string }[]) => {
            if (!params.length) return ''
            const linhas: LinhaTooltip[] = [...params]
              .sort((a, b) => (b.value ?? -1) - (a.value ?? -1))
              .map((p) => ({ nome: p.seriesName, cor: p.color, valor: fmtMMSS(p.value) }))
            return tooltipHTML(rotulos[params[0].dataIndex] ?? '', linhas)
          },
        },
        xAxis: { type: 'category', data: rotulos, boundaryGap: false },
        yAxis: { type: 'value', min: 0, max: Math.max(passo, Math.ceil(maior / passo) * passo), interval: passo, axisLabel: { formatter: (v: number) => fmtMMSS(v) } },
        series: series.map((s) => ({
          type: 'line',
          name: s.nome,
          data: s.valores,
          connectNulls: false,
          showSymbol: buckets.length <= 14,
          symbolSize: 6,
          itemStyle: { color: corDaSerie(ordem.indexOf(s.nome), tema) },
          lineStyle: { width: 2 },
        })),
      })
  }, [series, buckets.length, rotulos, ordem, tema])
  return (
    <ChartCard
      titulo={titulo}
      subtitulo={subtitulo}
      chartRef={ref}
      nomeArquivo={arquivo}
      vazio={!series.length}
      csv={() => ({
        nome: arquivo,
        colunas: ['Período', ...series.map((s) => `${s.nome} (s)`)],
        linhas: buckets.map((b, i) => [b, ...series.map((s) => (s.valores[i] == null ? '' : Math.round(s.valores[i] as number)))]),
      })}
    >
      <EChart ref={ref} option={option} altura={290} descricao={titulo} />
    </ChartCard>
  )
}

const NOME_G = { mes: 'mês', semana: 'semana', dia: 'dia' } as const

/** TMA e TME por canal no tempo + taxa de abandono e FCR por canal (clicar num canal filtra o relatório). */
export function BlocoCanais({ cubo, f }: { cubo: Cubo; f: FiltrosResolvidos }) {
  const refAbandono = useRef<EChartHandle>(null)
  const refFcr = useRef<EChartHandle>(null)
  const tema = useTema((s) => s.tema)
  const alternarCanal = useAlternarCanal()
  const ordem = useMemo(() => cubo.dims.find((d) => d.nome === DIM_CANAL)?.valores ?? [], [cubo])

  const tempos = useMemo(() => {
    const linhas = filtrar(cubo, f.filtrosCubo, f.meta)
    const atendidos = serieTemporalPor(cubo, linhas, f.granularidade, DIM_CANAL, 'atendidos', f.periodo)
    const tma = serieTemporalPor(cubo, linhas, f.granularidade, DIM_CANAL, 'soma_tma_seg', f.periodo)
    const tme = serieTemporalPor(cubo, linhas, f.granularidade, DIM_CANAL, 'soma_tme_seg', f.periodo)
    return { buckets: atendidos.buckets, rotulos: atendidos.rotulos, tma: razaoPorCanal(tma, atendidos), tme: razaoPorCanal(tme, atendidos) }
  }, [cubo, f.filtrosCubo, f.meta, f.granularidade, f.periodo])

  // comparativos por canal ignoram o filtro de canal: o canal filtrado aparece em destaque
  const porCanal = useMemo(() => {
    const linhas = filtrar(cubo, semCanal(f.filtrosCubo), f.meta)
    const grupos = agrupar(cubo, linhas, [DIM_CANAL], ['contatos', 'atendidos', 'abandonados', 'base_fcr', 'resolvidos_fcr'])
    const tot = { contatos: 0, abandonados: 0, base_fcr: 0, resolvidos_fcr: 0 }
    for (const g of grupos) {
      tot.contatos += g.valores.contatos
      tot.abandonados += g.valores.abandonados
      tot.base_fcr += g.valores.base_fcr
      tot.resolvidos_fcr += g.valores.resolvidos_fcr
    }
    return { grupos, tot }
  }, [cubo, f.filtrosCubo, f.meta])

  const itensAbandono: ItemBarra[] = useMemo(
    () =>
      porCanal.grupos
        .map((g) => ({
          nome: g.chave[0],
          valor: razao(g.valores.abandonados, g.valores.contatos),
          cor: corDaSerie(ordem.indexOf(g.chave[0]), tema),
          detalhes: [
            { nome: 'Taxa de abandono', valor: fmtPct(razao(g.valores.abandonados, g.valores.contatos)), cor: corDaSerie(ordem.indexOf(g.chave[0]), tema) },
            { nome: 'Abandonados', valor: fmtNumero(g.valores.abandonados) },
            { nome: 'Contatos', valor: fmtNumero(g.valores.contatos) },
          ],
        }))
        .sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0)),
    [porCanal, ordem, tema],
  )
  const itensFcr: ItemBarra[] = useMemo(
    () =>
      porCanal.grupos
        .map((g) => ({
          nome: g.chave[0],
          valor: razao(g.valores.resolvidos_fcr, g.valores.base_fcr),
          cor: corDaSerie(ordem.indexOf(g.chave[0]), tema),
          detalhes: [
            { nome: 'FCR', valor: fmtPct(razao(g.valores.resolvidos_fcr, g.valores.base_fcr)), cor: corDaSerie(ordem.indexOf(g.chave[0]), tema) },
            { nome: 'Resolvidos no 1º contato', valor: fmtNumero(g.valores.resolvidos_fcr) },
            { nome: 'Contatos atendidos', valor: fmtNumero(g.valores.base_fcr) },
          ],
        }))
        .sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0)),
    [porCanal, ordem, tema],
  )

  const dicaClique = 'Clique para filtrar o relatório por este canal (clique de novo para remover).'
  const notaFiltro = f.canais.length ? ` · em destaque: ${f.canais.join(', ')}` : ''

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-2">
        <LinhasPorCanal
          titulo="Em quais canais o atendimento leva mais tempo?"
          subtitulo={`TMA (tempo médio de atendimento) por canal, por ${NOME_G[f.granularidade]} · mm:ss`}
          arquivo="tma-por-canal"
          series={tempos.tma}
          buckets={tempos.buckets}
          rotulos={tempos.rotulos}
          ordem={ordem}
        />
        <LinhasPorCanal
          titulo="Quanto o cliente espera até ser atendido?"
          subtitulo={`TME (tempo médio de espera) por canal, por ${NOME_G[f.granularidade]} · mm:ss`}
          arquivo="tme-por-canal"
          series={tempos.tme}
          buckets={tempos.buckets}
          rotulos={tempos.rotulos}
          ordem={ordem}
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          titulo="Onde o cliente mais desiste antes de ser atendido?"
          subtitulo={`Taxa de abandono por canal (abandonados ÷ contatos)${notaFiltro}`}
          chartRef={refAbandono}
          nomeArquivo="taxa-de-abandono-por-canal"
          vazio={!itensAbandono.length}
          csv={() => ({
            nome: 'taxa-de-abandono-por-canal',
            colunas: ['Canal', 'Contatos', 'Abandonados', 'Taxa de abandono (%)'],
            linhas: porCanal.grupos.map((g) => [g.chave[0], Math.round(g.valores.contatos), Math.round(g.valores.abandonados), pctCSV(razao(g.valores.abandonados, g.valores.contatos))]),
          })}
        >
          <BarrasH
            ref={refAbandono}
            itens={itensAbandono}
            fmt={(v) => fmtPct(v)}
            selecionados={f.canais}
            aoClicar={alternarCanal}
            media={{ valor: razao(porCanal.tot.abandonados, porCanal.tot.contatos), rotulo: 'Média' }}
            rodapeTooltip={dicaClique}
            descricao="Taxa de abandono por canal de atendimento"
          />
        </ChartCard>
        <ChartCard
          titulo="Quais canais resolvem no primeiro contato?"
          subtitulo={`FCR por canal (resolvidos no primeiro contato ÷ contatos atendidos)${notaFiltro}`}
          chartRef={refFcr}
          nomeArquivo="fcr-por-canal"
          vazio={!itensFcr.length}
          csv={() => ({
            nome: 'fcr-por-canal',
            colunas: ['Canal', 'Contatos atendidos', 'Resolvidos no primeiro contato', 'FCR (%)'],
            linhas: porCanal.grupos.map((g) => [g.chave[0], Math.round(g.valores.base_fcr), Math.round(g.valores.resolvidos_fcr), pctCSV(razao(g.valores.resolvidos_fcr, g.valores.base_fcr))]),
          })}
        >
          <BarrasH
            ref={refFcr}
            itens={itensFcr}
            fmt={(v) => fmtPct(v)}
            selecionados={f.canais}
            aoClicar={alternarCanal}
            media={{ valor: razao(porCanal.tot.resolvidos_fcr, porCanal.tot.base_fcr), rotulo: 'Média' }}
            rodapeTooltip={dicaClique}
            descricao="FCR por canal de atendimento"
          />
        </ChartCard>
      </div>
    </>
  )
}
