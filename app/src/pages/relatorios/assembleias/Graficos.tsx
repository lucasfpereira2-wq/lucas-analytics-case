import { useMemo, useRef, useState } from 'react'
import { ChartCard } from '@/components/dados'
import { EChart, type EChartHandle, type EChartsOption } from '@/components/dados/EChart'
import { agrupar, filtrar, razao, serieTemporal, serieTemporalPor } from '@/lib/cubo'
import { useFiltros, type FiltrosResolvidos } from '@/lib/filtros'
import { fmtBRL, fmtCompacto, fmtNumero, fmtPct, variacao } from '@/lib/formato'
import { useTema } from '@/lib/tema'
import { corDaSerie, tokensGrafico } from '@/lib/tema-echarts'
import type { Cubo } from '@/types/cubo'
import { DicaFiltro, Segmentado, TrilhaDrill } from '../vendas/Controles'
import { alternarFiltro, bucketParcial, eixoCompacto, indiceDoClique, NOME_GRANULARIDADE, regionaisAtivas, rotuloLongo, tip, useDrill } from '../vendas/comum'

interface PropsBase {
  f: FiltrosResolvidos
}

const nomeDe = (p: unknown) => (p as { name?: string }).name ?? ''
/** percentual já em pontos (30,3) → "30,3%" */
const pontos = (v: number | null | undefined, casas = 1) => fmtPct(v, casas, { fracao: false })

// ----------------------------------------------------------------------------------------------
// Tendência: contemplações por modalidade, com drill-down
// ----------------------------------------------------------------------------------------------

export function TendenciaContemplacoes({ f, cubo }: PropsBase & { cubo: Cubo }) {
  const ref = useRef<EChartHandle>(null)
  const tema = useTema((s) => s.tema)
  const drill = useDrill(f.periodo, f.granularidade)
  const g = drill.granularidade

  const d = useMemo(() => {
    const filtros = { ...f.filtrosCubo, inicio: drill.periodo.inicio, fim: drill.periodo.fim }
    const s = serieTemporalPor(cubo, filtrar(cubo, filtros, f.meta), g, 'modalidade', 'contemplacoes', drill.periodo)
    const ordem = cubo.dims.find((x) => x.nome === 'modalidade')?.valores ?? []
    const totalBucket = s.buckets.map((_, i) => s.series.reduce((a, x) => a + x.valores[i], 0))
    const total = totalBucket.reduce((a, v) => a + v, 0)
    const parcial = s.buckets.map((b) => bucketParcial(b, g, drill.periodo))
    return { ...s, ordem, totalBucket, total, parcial }
  }, [cubo, f.filtrosCubo, f.meta, drill.periodo, g])

  const option = useMemo<EChartsOption>(() => {
    const t = tokensGrafico(tema)
    return {
      legend: { data: d.series.map((s) => s.nome) },
      grid: { left: 8, right: 16, top: 44, bottom: 4, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const itens = (Array.isArray(params) ? params : [params]) as { dataIndex: number; seriesName: string; value: number; color: string }[]
          if (!itens.length) return ''
          const i = itens[0].dataIndex
          const b = d.buckets[i]
          const tot = d.totalBucket[i]
          const sorteio = itens.find((p) => p.seriesName === 'Sorteio')?.value ?? 0
          const ant = i > 0 ? variacao(tot, d.totalBucket[i - 1]) : null
          return tip(
            rotuloLongo(b, g),
            [
              ...itens.map((p) => ({ rotulo: p.seriesName, valor: `${fmtNumero(p.value)} · ${fmtPct(razao(p.value, tot))}`, cor: p.color })),
              { rotulo: 'Total de contemplações', valor: fmtNumero(tot), forte: true },
              { rotulo: 'Por lance', valor: fmtPct(razao(tot - sorteio, tot)) },
              { rotulo: 'Participação no período', valor: fmtPct(razao(tot, d.total)) },
              ant !== null && !d.parcial[i] && !d.parcial[i - 1] && { rotulo: `vs ${NOME_GRANULARIDADE[g]} anterior`, valor: fmtPct(ant, 1, { sinal: true }) },
            ],
            d.parcial[i] ? 'Período parcial: o recorte não cobre todos os dias deste intervalo.' : undefined,
          )
        },
      },
      xAxis: { type: 'category', data: d.rotulos },
      yAxis: { type: 'value', splitNumber: 4, axisLabel: { formatter: (v: number) => eixoCompacto(v) } },
      series: d.series.map((s) => ({
        name: s.nome,
        type: 'bar' as const,
        stack: 'modalidade',
        barMaxWidth: 36,
        cursor: drill.podeDescer ? 'pointer' : 'default',
        itemStyle: { color: corDaSerie(d.ordem.indexOf(s.nome), tema), borderRadius: 0, borderColor: t.superficie, borderWidth: 1 },
        emphasis: { focus: 'none' as const },
        data: s.valores.map((v, i) => (d.parcial[i] ? { value: v, itemStyle: { opacity: 0.55 } } : v)),
      })),
    }
  }, [d, g, tema, drill.podeDescer])

  return (
    <ChartCard
      titulo="Quantas cotas foram contempladas e por qual modalidade?"
      subtitulo={`Contemplações por ${NOME_GRANULARIDADE[g]} de assembleia · ${fmtNumero(d.total)} no recorte`}
      chartRef={ref}
      nomeArquivo="assembleias-contemplacoes"
      vazio={d.total === 0}
      csv={() => ({
        nome: 'assembleias-contemplacoes',
        colunas: ['Período', ...d.series.map((s) => s.nome), 'Total'],
        linhas: d.buckets.map((b, i) => [rotuloLongo(b, g), ...d.series.map((s) => Math.round(s.valores[i])), Math.round(d.totalBucket[i])]),
      })}
      rodape={d.parcial.some(Boolean) ? 'Barras esmaecidas indicam período parcial (o histórico vai até a última assembleia apurada).' : undefined}
    >
      <TrilhaDrill drill={drill} />
      <div
        className={drill.podeDescer ? 'cursor-pointer' : undefined}
        onClick={(e) => {
          const i = indiceDoClique(e, ref.current?.instancia())
          if (i !== null && d.buckets[i]) drill.descer(d.buckets[i])
        }}
      >
        <EChart ref={ref} altura={340} option={option} descricao="Contemplações por modalidade ao longo do tempo" />
      </div>
    </ChartCard>
  )
}

// ----------------------------------------------------------------------------------------------
// Lances: ofertados vs vencedores e lance médio (%)
// ----------------------------------------------------------------------------------------------

export function Lances({ f, cubo }: PropsBase & { cubo: Cubo }) {
  const refQtd = useRef<EChartHandle>(null)
  const refPct = useRef<EChartHandle>(null)
  const tema = useTema((s) => s.tema)

  const d = useMemo(() => {
    const s = serieTemporal(cubo, filtrar(cubo, f.filtrosCubo, f.meta), 'mes', undefined, f.periodo)
    const of = s.valores.lances_ofertados
    const ve = s.valores.lances_vencedores
    const pOf = s.buckets.map((_, i) => razao(s.valores.soma_lance_pct_ofertado[i], of[i] * 100))
    const pVe = s.buckets.map((_, i) => razao(s.valores.soma_lance_pct_vencedor[i], ve[i] * 100))
    const soma = (a: number[]) => a.reduce((x, v) => x + v, 0)
    return {
      ...s,
      of,
      ve,
      pOf,
      pVe,
      totalOf: soma(of),
      totalVe: soma(ve),
      medioOf: razao(soma(s.valores.soma_lance_pct_ofertado), soma(of) * 100),
      medioVe: razao(soma(s.valores.soma_lance_pct_vencedor), soma(ve) * 100),
    }
  }, [cubo, f.filtrosCubo, f.meta, f.periodo])

  const optQtd = useMemo<EChartsOption>(() => {
    const t = tokensGrafico(tema)
    return {
      legend: { data: ['Lances ofertados', 'Lances vencedores'] },
      grid: { left: 8, right: 16, top: 44, bottom: 4, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const i = ((Array.isArray(params) ? params[0] : params) as { dataIndex: number }).dataIndex
          return tip(rotuloLongo(d.buckets[i], 'mes'), [
            { rotulo: 'Lances ofertados', valor: fmtNumero(d.of[i]), cor: t.series[3] },
            { rotulo: 'Lances vencedores', valor: fmtNumero(d.ve[i]), cor: t.series[0] },
            { rotulo: 'Taxa de sucesso do lance', valor: fmtPct(razao(d.ve[i], d.of[i])), forte: true },
            { rotulo: 'Ofertados: participação no período', valor: fmtPct(razao(d.of[i], d.totalOf)) },
          ])
        },
      },
      xAxis: { type: 'category', data: d.rotulos },
      yAxis: { type: 'value', splitNumber: 4, axisLabel: { formatter: (v: number) => eixoCompacto(v) } },
      series: [
        { name: 'Lances ofertados', type: 'bar', barGap: '10%', barMaxWidth: 18, itemStyle: { color: t.series[3] }, data: d.of },
        { name: 'Lances vencedores', type: 'bar', barMaxWidth: 18, itemStyle: { color: t.series[0] }, data: d.ve },
      ],
    }
  }, [d, tema])

  const optPct = useMemo<EChartsOption>(() => {
    const t = tokensGrafico(tema)
    const linha = (nome: string, cor: string, dados: (number | null)[]) => ({
      name: nome,
      type: 'line' as const,
      showSymbol: true,
      symbolSize: 7,
      connectNulls: true,
      itemStyle: { color: cor, borderColor: t.superficie, borderWidth: 2 },
      lineStyle: { color: cor, width: 2 },
      endLabel: { show: true, formatter: (p: unknown) => pontos((p as { value: number }).value), color: t.texto, fontSize: 11, fontWeight: 600, distance: 6 },
      data: dados,
    })
    return {
      legend: { data: ['Lance médio vencedor', 'Lance médio ofertado'] },
      grid: { left: 8, right: 52, top: 44, bottom: 4, containLabel: true },
      tooltip: {
        trigger: 'axis',
        formatter: (params: unknown) => {
          const i = ((Array.isArray(params) ? params[0] : params) as { dataIndex: number }).dataIndex
          const dif = d.pVe[i] !== null && d.pOf[i] !== null ? (d.pVe[i] as number) - (d.pOf[i] as number) : null
          return tip(rotuloLongo(d.buckets[i], 'mes'), [
            { rotulo: 'Lance médio vencedor', valor: pontos(d.pVe[i]), cor: t.series[0], forte: true },
            { rotulo: 'Lance médio ofertado', valor: pontos(d.pOf[i]), cor: t.series[3] },
            { rotulo: 'Diferença', valor: dif === null ? '–' : `${fmtNumero(dif, 1)} p.p.` },
            { rotulo: 'Lances vencedores', valor: fmtNumero(d.ve[i]) },
          ])
        },
      },
      xAxis: { type: 'category', data: d.rotulos, boundaryGap: false },
      yAxis: { type: 'value', scale: true, splitNumber: 4, axisLabel: { formatter: (v: number) => pontos(v, 0) } },
      series: [linha('Lance médio vencedor', t.series[0], d.pVe), linha('Lance médio ofertado', t.series[3], d.pOf)],
    }
  }, [d, tema])

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartCard
        titulo="Quantos lances são ofertados e quantos vencem?"
        subtitulo={`Por mês · ${fmtCompacto(d.totalOf)} ofertados e ${fmtCompacto(d.totalVe)} vencedores (${fmtPct(razao(d.totalVe, d.totalOf))} de sucesso)`}
        chartRef={refQtd}
        nomeArquivo="assembleias-lances"
        vazio={d.totalOf === 0}
        csv={() => ({
          nome: 'assembleias-lances',
          colunas: ['Mês', 'Lances ofertados', 'Lances vencedores', 'Taxa de sucesso (%)', 'Lance médio ofertado (%)', 'Lance médio vencedor (%)'],
          linhas: d.buckets.map((b, i) => [rotuloLongo(b, 'mes'), Math.round(d.of[i]), Math.round(d.ve[i]), d.of[i] ? Math.round((d.ve[i] / d.of[i]) * 1000) / 10 : null, d.pOf[i] === null ? null : Math.round((d.pOf[i] as number) * 10) / 10, d.pVe[i] === null ? null : Math.round((d.pVe[i] as number) * 10) / 10]),
        })}
      >
        <EChart ref={refQtd} altura={300} option={optQtd} descricao="Lances ofertados e vencedores por mês" />
      </ChartCard>
      <ChartCard
        titulo="Quanto é preciso ofertar para vencer um lance?"
        subtitulo={`Lance médio em % do crédito, por mês · vencedor ${pontos(d.medioVe)} contra ${pontos(d.medioOf)} do ofertado no período`}
        chartRef={refPct}
        nomeArquivo="assembleias-lance-medio"
        vazio={d.totalOf === 0}
        csv={() => ({
          nome: 'assembleias-lance-medio',
          colunas: ['Mês', 'Lance médio ofertado (%)', 'Lance médio vencedor (%)'],
          linhas: d.buckets.map((b, i) => [rotuloLongo(b, 'mes'), d.pOf[i] === null ? null : Math.round((d.pOf[i] as number) * 10) / 10, d.pVe[i] === null ? null : Math.round((d.pVe[i] as number) * 10) / 10]),
        })}
      >
        <EChart ref={refPct} altura={300} option={optPct} descricao="Lance médio ofertado e vencedor por mês" />
      </ChartCard>
    </div>
  )
}

// ----------------------------------------------------------------------------------------------
// Crédito contemplado vs liberado e prazo médio até a liberação
// ----------------------------------------------------------------------------------------------

export function CreditoLiberacao({ f, cuboContemplacoes, cuboLiberacao }: PropsBase & { cuboContemplacoes: Cubo; cuboLiberacao: Cubo }) {
  const ref = useRef<EChartHandle>(null)
  const tema = useTema((s) => s.tema)
  const g = f.granularidade

  const d = useMemo(() => {
    const c = serieTemporal(cuboContemplacoes, filtrar(cuboContemplacoes, f.filtrosCubo, f.meta), g, ['credito_contemplado'], f.periodo)
    const l = serieTemporal(cuboLiberacao, filtrar(cuboLiberacao, f.filtrosCubo, f.meta), g, undefined, f.periodo)
    const pos = new Map(l.buckets.map((b, i) => [b, i]))
    const lib = c.buckets.map((b) => l.valores.valor_liberado[pos.get(b) ?? -1] ?? 0)
    const qtd = c.buckets.map((b) => l.valores.creditos_liberados[pos.get(b) ?? -1] ?? 0)
    const dias = c.buckets.map((b) => l.valores.soma_dias_ate_liberacao[pos.get(b) ?? -1] ?? 0)
    const prazo = c.buckets.map((_, i) => razao(dias[i], qtd[i]))
    const soma = (a: number[]) => a.reduce((x, v) => x + v, 0)
    return { buckets: c.buckets, rotulos: c.rotulos, cont: c.valores.credito_contemplado, lib, qtd, prazo, totalCont: soma(c.valores.credito_contemplado), totalLib: soma(lib), prazoMedio: razao(soma(dias), soma(qtd)) }
  }, [cuboContemplacoes, cuboLiberacao, f.filtrosCubo, f.meta, f.periodo, g])

  const option = useMemo<EChartsOption>(() => {
    const t = tokensGrafico(tema)
    const esquerda = 74
    return {
      legend: { data: ['Crédito contemplado', 'Crédito liberado', 'Prazo médio até a liberação'] },
      axisPointer: { link: [{ xAxisIndex: 'all' }] },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const i = ((Array.isArray(params) ? params[0] : params) as { dataIndex: number }).dataIndex
          return tip(rotuloLongo(d.buckets[i], g), [
            { rotulo: 'Crédito contemplado', valor: fmtBRL(d.cont[i], 0), cor: t.series[0] },
            { rotulo: 'Crédito liberado', valor: fmtBRL(d.lib[i], 0), cor: t.series[1] },
            { rotulo: 'Liberado ÷ contemplado', valor: fmtPct(razao(d.lib[i], d.cont[i])), forte: true },
            { rotulo: 'Créditos liberados (qtd.)', valor: fmtNumero(d.qtd[i]) },
            { rotulo: 'Prazo médio até a liberação', valor: d.prazo[i] === null ? '–' : `${fmtNumero(d.prazo[i], 1)} dias`, cor: t.series[2] },
          ])
        },
      },
      title: [
        { text: 'Crédito (R$)', left: 0, top: 30, textStyle: { fontSize: 11, fontWeight: 500, color: t.textoSecundario } },
        { text: 'Prazo médio até a liberação (dias)', left: 0, top: '65%', textStyle: { fontSize: 11, fontWeight: 500, color: t.textoSecundario } },
      ],
      grid: [
        { left: esquerda, right: 16, top: 58, height: '42%' },
        { left: esquerda, right: 16, top: '73%', bottom: 28 },
      ],
      xAxis: [
        { type: 'category', gridIndex: 0, data: d.rotulos, axisLabel: { show: false } },
        { type: 'category', gridIndex: 1, data: d.rotulos },
      ],
      yAxis: [
        { type: 'value', gridIndex: 0, splitNumber: 4, axisLabel: { formatter: (v: number) => eixoCompacto(v, true) } },
        { type: 'value', gridIndex: 1, splitNumber: 2, minInterval: 2, scale: true, axisLabel: { formatter: (v: number) => fmtNumero(v) } },
      ],
      series: [
        { name: 'Crédito contemplado', type: 'bar', xAxisIndex: 0, yAxisIndex: 0, barGap: '10%', barMaxWidth: 18, itemStyle: { color: t.series[0] }, data: d.cont },
        { name: 'Crédito liberado', type: 'bar', xAxisIndex: 0, yAxisIndex: 0, barMaxWidth: 18, itemStyle: { color: t.series[1] }, data: d.lib },
        {
          name: 'Prazo médio até a liberação',
          type: 'line',
          xAxisIndex: 1,
          yAxisIndex: 1,
          connectNulls: true,
          showSymbol: d.buckets.length <= 31,
          symbolSize: 7,
          itemStyle: { color: t.series[2], borderColor: t.superficie, borderWidth: 2 },
          lineStyle: { color: t.series[2], width: 2 },
          data: d.prazo,
        },
      ],
    }
  }, [d, g, tema])

  return (
    <ChartCard
      titulo="O crédito contemplado está chegando ao cliente?"
      subtitulo={`Por ${NOME_GRANULARIDADE[g]} · ${fmtCompacto(d.totalLib, { moeda: true })} liberados de ${fmtCompacto(d.totalCont, { moeda: true })} contemplados; prazo médio de ${d.prazoMedio === null ? '–' : fmtNumero(d.prazoMedio, 1)} dias`}
      chartRef={ref}
      nomeArquivo="assembleias-credito-liberacao"
      vazio={d.totalCont === 0 && d.totalLib === 0}
      csv={() => ({
        nome: 'assembleias-credito-liberacao',
        colunas: ['Período', 'Crédito contemplado (R$)', 'Crédito liberado (R$)', 'Créditos liberados', 'Prazo médio até a liberação (dias)'],
        linhas: d.buckets.map((b, i) => [rotuloLongo(b, g), Math.round(d.cont[i]), Math.round(d.lib[i]), Math.round(d.qtd[i]), d.prazo[i] === null ? null : Math.round((d.prazo[i] as number) * 10) / 10]),
      })}
      rodape="A liberação ocorre depois da contemplação (análise de garantias e documentação): os dois valores do mesmo período não se referem às mesmas cotas."
    >
      <EChart ref={ref} altura={400} option={option} descricao="Crédito contemplado, crédito liberado e prazo médio até a liberação" />
    </ChartCard>
  )
}

// ----------------------------------------------------------------------------------------------
// Ocupação dos grupos por segmento ou regional (estoque: última fotografia)
// ----------------------------------------------------------------------------------------------

type Quebra = 'segmento' | 'regional'

export function OcupacaoGrupos({ f, cubo }: PropsBase & { cubo: Cubo }) {
  const ref = useRef<EChartHandle>(null)
  const tema = useTema((s) => s.tema)
  const [quebra, setQuebra] = useState<Quebra>('segmento')

  const linhas = useMemo(() => {
    const filtros = quebra === 'segmento' ? { ...f.filtrosCubo, segmentos: [] } : { ...f.filtrosCubo, regionais: [], ufs: [] }
    const grupos = agrupar(cubo, filtrar(cubo, filtros, f.meta), [quebra], ['grupos_ativos', 'cotas_capacidade', 'cotas_ocupadas', 'cotas_disponiveis'])
    const ordem = quebra === 'segmento' ? (f.meta?.segmentos ?? []) : (f.meta?.regionais.map((r) => r.nome) ?? [])
    return ordem
      .map((nome) => {
        const v = grupos.find((x) => x.chave[0] === nome)?.valores
        return {
          nome,
          grupos: v?.grupos_ativos ?? 0,
          capacidade: v?.cotas_capacidade ?? 0,
          ocupadas: v?.cotas_ocupadas ?? 0,
          disponiveis: v?.cotas_disponiveis ?? 0,
          taxa: razao(v?.cotas_ocupadas, v?.cotas_capacidade),
        }
      })
      .filter((l) => l.capacidade > 0)
  }, [cubo, quebra, f.filtrosCubo, f.meta])

  const ativos = useMemo(() => (quebra === 'segmento' ? new Set(f.segmentos) : regionaisAtivas(f.regionais, f.ufs, f.meta)), [quebra, f.segmentos, f.regionais, f.ufs, f.meta])

  const option = useMemo<EChartsOption>(() => {
    const t = tokensGrafico(tema)
    const op = (nome: string) => (ativos.size === 0 || ativos.has(nome) ? 1 : 0.28)
    return {
      legend: { data: ['Cotas ocupadas', 'Cotas disponíveis'] },
      grid: { left: 8, right: 12, top: 40, bottom: 4, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const l = linhas.find((x) => x.nome === nomeDe(Array.isArray(params) ? params[0] : params))
          if (!l) return ''
          return tip(l.nome, [
            { rotulo: 'Grupos ativos', valor: fmtNumero(l.grupos) },
            { rotulo: 'Capacidade de cotas', valor: fmtNumero(l.capacidade) },
            { rotulo: 'Cotas ocupadas', valor: fmtNumero(l.ocupadas), cor: t.series[0] },
            { rotulo: 'Cotas disponíveis', valor: fmtNumero(l.disponiveis), cor: t.outros },
            { rotulo: 'Taxa de ocupação', valor: fmtPct(l.taxa), forte: true },
            { rotulo: 'Média de cotas por grupo', valor: fmtNumero(razao(l.capacidade, l.grupos), 0) },
          ])
        },
      },
      xAxis: { type: 'value', splitNumber: 4, axisLabel: { formatter: (v: number) => eixoCompacto(v) } },
      yAxis: [
        { type: 'category', inverse: true, data: linhas.map((l) => l.nome), axisLabel: { color: t.texto, fontSize: 12 } },
        {
          type: 'category',
          inverse: true,
          position: 'right',
          data: linhas.map((l) => `{v|${fmtPct(l.taxa)}}\n{g|${fmtNumero(l.grupos)} grupos}`),
          axisLine: { show: false },
          axisPointer: { show: false },
          axisLabel: { margin: 12, rich: { v: { color: t.texto, fontSize: 13, fontWeight: 600, lineHeight: 17 }, g: { color: t.textoSecundario, fontSize: 11, lineHeight: 15 } } },
        },
      ],
      series: [
        {
          name: 'Cotas ocupadas',
          type: 'bar',
          stack: 'cap',
          barWidth: 20,
          itemStyle: { color: t.series[0], borderRadius: 0, borderColor: t.superficie, borderWidth: 1 },
          data: linhas.map((l) => ({ value: l.ocupadas, itemStyle: { opacity: op(l.nome) } })),
        },
        {
          name: 'Cotas disponíveis',
          type: 'bar',
          stack: 'cap',
          barWidth: 20,
          itemStyle: { color: t.outros, borderRadius: [0, 4, 4, 0], borderColor: t.superficie, borderWidth: 1 },
          data: linhas.map((l) => ({ value: l.disponiveis, itemStyle: { opacity: op(l.nome) } })),
        },
      ],
    }
  }, [linhas, ativos, tema])

  const filtroAtivo = quebra === 'segmento' ? f.segmentos : f.regionais

  return (
    <ChartCard
      titulo="Onde ainda há cotas para vender nos grupos?"
      subtitulo="Capacidade e ocupação dos grupos ativos na última fotografia do período"
      chartRef={ref}
      nomeArquivo={`assembleias-ocupacao-${quebra}`}
      vazio={linhas.length === 0}
      csv={() => ({
        nome: `assembleias-ocupacao-${quebra}`,
        colunas: [quebra === 'segmento' ? 'Segmento' : 'Regional', 'Grupos ativos', 'Capacidade de cotas', 'Cotas ocupadas', 'Cotas disponíveis', 'Taxa de ocupação (%)'],
        linhas: linhas.map((l) => [l.nome, Math.round(l.grupos), Math.round(l.capacidade), Math.round(l.ocupadas), Math.round(l.disponiveis), l.taxa === null ? null : Math.round(l.taxa * 1000) / 10]),
      })}
      rodape={
        <DicaFiltro
          texto={`Clique em uma barra para filtrar ${quebra === 'segmento' ? 'o segmento' : 'a regional'}.`}
          ativos={filtroAtivo}
          aoLimpar={() => (quebra === 'segmento' ? useFiltros.getState().definirSegmentos([]) : useFiltros.getState().definirRegionais([], f.meta))}
        />
      }
    >
      <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
        Ver por
        <Segmentado
          rotulo="Quebra"
          valor={quebra}
          aoMudar={setQuebra}
          opcoes={[
            { id: 'segmento', rotulo: 'Segmento' },
            { id: 'regional', rotulo: 'Regional' },
          ]}
        />
      </div>
      <EChart ref={ref} altura={340} option={option} descricao="Ocupação dos grupos" onEvents={{ click: (p) => nomeDe(p) && alternarFiltro(quebra, nomeDe(p), f.meta) }} />
    </ChartCard>
  )
}
