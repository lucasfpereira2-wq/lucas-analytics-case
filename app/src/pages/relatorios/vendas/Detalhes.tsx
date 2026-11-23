import { useMemo, useRef } from 'react'
import { ChartCard } from '@/components/dados'
import { EChart, type EChartHandle, type EChartsOption } from '@/components/dados/EChart'
import { agrupar, filtrar, razao, serieTemporal, serieTemporalPor, totais } from '@/lib/cubo'
import { useFiltros, type FiltrosResolvidos } from '@/lib/filtros'
import { fmtBRL, fmtCompacto, fmtNumero, fmtPct } from '@/lib/formato'
import { useTema } from '@/lib/tema'
import { corDaSerie, tokensGrafico } from '@/lib/tema-echarts'
import type { Cubo } from '@/types/cubo'
import { DicaFiltro } from './Controles'
import { alternarFiltro, eixoCompacto, NOME_GRANULARIDADE, proRata, regionaisAtivas, rotuloLongo, tip } from './comum'

interface PropsBase {
  f: FiltrosResolvidos
}

const nomeDe = (p: unknown) => (p as { name?: string }).name ?? ''

// ----------------------------------------------------------------------------------------------
// Meta vs realizado por regional (bullet)
// ----------------------------------------------------------------------------------------------

export function MetaPorRegional({ f, cuboVendas, cuboMetas }: PropsBase & { cuboVendas: Cubo; cuboMetas: Cubo }) {
  const ref = useRef<EChartHandle>(null)
  const tema = useTema((s) => s.tema)

  const linhas = useMemo(() => {
    const semGeo = { ...f.filtrosCubo, regionais: [], ufs: [] }
    const regDaUf = new Map((f.meta?.ufs ?? []).map((u) => [u.sigla, u.regional]))
    const real = new Map<string, { credito: number; cotas: number }>()
    for (const gr of agrupar(cuboVendas, filtrar(cuboVendas, semGeo, f.meta), ['uf'], ['credito_vendido', 'cotas_vendidas'])) {
      const r = regDaUf.get(gr.chave[0]) ?? 'Outras'
      const a = real.get(r) ?? { credito: 0, cotas: 0 }
      a.credito += gr.valores.credito_vendido
      a.cotas += gr.valores.cotas_vendidas
      real.set(r, a)
    }
    const metaMes = new Map<string, Map<string, number>>()
    for (const gr of agrupar(cuboMetas, filtrar(cuboMetas, semGeo, f.meta), ['mes', 'regional'], ['meta_credito'])) {
      const m = metaMes.get(gr.chave[1]) ?? new Map<string, number>()
      m.set(gr.chave[0], gr.valores.meta_credito)
      metaMes.set(gr.chave[1], m)
    }
    const ordem = f.meta?.regionais.map((r) => r.nome) ?? [...real.keys()]
    const total = [...real.values()].reduce((a, v) => a + v.credito, 0)
    return ordem.map((nome) => {
      const r = real.get(nome) ?? { credito: 0, cotas: 0 }
      const meta = proRata(metaMes.get(nome) ?? new Map(), f.periodo.inicio, f.periodo.fim)
      return { nome, credito: r.credito, cotas: r.cotas, meta, ating: razao(r.credito, meta), part: razao(r.credito, total) }
    })
  }, [cuboVendas, cuboMetas, f.filtrosCubo, f.meta, f.periodo])

  const ativas = useMemo(() => regionaisAtivas(f.regionais, f.ufs, f.meta), [f.regionais, f.ufs, f.meta])

  const option = useMemo<EChartsOption>(() => {
    const t = tokensGrafico(tema)
    const destaque = (nome: string) => (ativas.size === 0 || ativas.has(nome) ? 1 : 0.28)
    const maximo = Math.max(...linhas.map((l) => Math.max(l.credito, l.meta)), 1)
    return {
      legend: { data: ['Realizado', 'Meta proporcional'] },
      grid: { left: 8, right: 12, top: 40, bottom: 4, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const l = linhas.find((x) => x.nome === nomeDe(Array.isArray(params) ? params[0] : params))
          if (!l) return ''
          return tip(l.nome, [
            { rotulo: 'Realizado', valor: fmtBRL(l.credito, 0), cor: t.series[0], forte: true },
            { rotulo: 'Meta proporcional', valor: fmtBRL(l.meta, 0), cor: t.texto },
            { rotulo: 'Atingimento', valor: fmtPct(l.ating) },
            { rotulo: l.credito >= l.meta ? 'Acima da meta' : 'Falta para a meta', valor: fmtCompacto(Math.abs(l.credito - l.meta), { moeda: true }) },
            { rotulo: 'Cotas vendidas', valor: fmtNumero(l.cotas) },
            { rotulo: 'Participação no total', valor: fmtPct(l.part) },
          ])
        },
      },
      xAxis: { type: 'value', max: maximo * 1.04, splitNumber: 4, axisLabel: { formatter: (v: number) => eixoCompacto(v, true) } },
      yAxis: [
        { type: 'category', inverse: true, data: linhas.map((l) => l.nome), axisLabel: { color: t.texto, fontSize: 12 } },
        {
          type: 'category',
          inverse: true,
          position: 'right',
          data: linhas.map((l) => fmtPct(l.ating)),
          axisLine: { show: false },
          axisPointer: { show: false },
          axisLabel: { color: t.texto, fontSize: 13, fontWeight: 600, margin: 12 },
        },
      ],
      series: [
        {
          name: 'Realizado',
          type: 'bar',
          barWidth: 16,
          itemStyle: { color: t.series[0], borderRadius: [0, 4, 4, 0] },
          data: linhas.map((l) => ({ value: l.credito, itemStyle: { opacity: destaque(l.nome) } })),
        },
        {
          name: 'Meta proporcional',
          type: 'scatter',
          symbol: 'rect',
          symbolSize: [3, 30],
          itemStyle: { color: t.texto, borderWidth: 0 },
          z: 5,
          data: linhas.map((l) => ({ value: [l.meta, l.nome], itemStyle: { opacity: destaque(l.nome) } })),
        },
      ],
    }
  }, [linhas, ativas, tema])

  return (
    <ChartCard
      titulo="Quais regionais estão batendo a meta?"
      subtitulo="Crédito realizado contra a meta proporcional do período; o rótulo mostra o % de atingimento"
      chartRef={ref}
      nomeArquivo="vendas-meta-por-regional"
      csv={() => ({
        nome: 'vendas-meta-por-regional',
        colunas: ['Regional', 'Realizado (R$)', 'Meta proporcional (R$)', 'Atingimento (%)', 'Cotas vendidas'],
        linhas: linhas.map((l) => [l.nome, Math.round(l.credito), Math.round(l.meta), l.ating === null ? null : Math.round(l.ating * 1000) / 10, Math.round(l.cotas)]),
      })}
      rodape={<DicaFiltro texto="Clique em uma regional para filtrar o relatório." ativos={f.regionais} aoLimpar={() => useFiltros.getState().definirRegionais([], f.meta)} />}
    >
      <EChart ref={ref} altura={280} option={option} descricao="Meta versus realizado por regional" onEvents={{ click: (p) => nomeDe(p) && alternarFiltro('regional', nomeDe(p), f.meta) }} />
    </ChartCard>
  )
}

// ----------------------------------------------------------------------------------------------
// Funil comercial
// ----------------------------------------------------------------------------------------------


export function FunilComercial({ f, cubo }: PropsBase & { cubo: Cubo }) {
  const ref = useRef<EChartHandle>(null)
  const tema = useTema((s) => s.tema)

  const etapas = useMemo(() => {
    const t = totais(cubo, filtrar(cubo, f.filtrosCubo, f.meta), ['leads', 'propostas', 'propostas_aprovadas', 'contratos'])
    const lista = [
      { nome: 'Leads', curto: 'Leads', valor: t.leads },
      { nome: 'Propostas', curto: 'Propostas', valor: t.propostas },
      { nome: 'Propostas aprovadas', curto: 'Aprovadas', valor: t.propostas_aprovadas },
      { nome: 'Contratos', curto: 'Contratos', valor: t.contratos },
    ]
    return lista.map((e, i) => ({
      ...e,
      doTopo: razao(e.valor, lista[0].valor),
      daAnterior: i === 0 ? null : razao(e.valor, lista[i - 1].valor),
      anterior: i === 0 ? null : lista[i - 1].nome,
      anteriorCurto: i === 0 ? null : lista[i - 1].curto,
    }))
  }, [cubo, f.filtrosCubo, f.meta])

  const option = useMemo<EChartsOption>(() => {
    const t = tokensGrafico(tema)
    return {
      grid: { left: 8, right: 150, top: 8, bottom: 4, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const e = etapas.find((x) => x.nome === nomeDe(Array.isArray(params) ? params[0] : params))
          if (!e) return ''
          return tip(e.nome, [
            { rotulo: 'Volume', valor: fmtNumero(e.valor), cor: t.series[0], forte: true },
            { rotulo: 'Em relação aos leads', valor: fmtPct(e.doTopo) },
            !!e.anterior && { rotulo: `Conversão de ${e.anterior.toLowerCase()}`, valor: fmtPct(e.daAnterior) },
            !!e.anterior && e.daAnterior !== null && { rotulo: 'Perda na etapa', valor: fmtPct(1 - e.daAnterior) },
          ])
        },
      },
      xAxis: { type: 'value', show: false, max: (etapas[0]?.valor ?? 1) * 1 },
      yAxis: { type: 'category', inverse: true, data: etapas.map((e) => e.nome), axisLine: { show: false }, axisLabel: { color: t.texto, fontSize: 12, fontWeight: 500 } },
      series: [
        {
          type: 'bar',
          name: 'Volume',
          barWidth: 30,
          barMinHeight: 4,
          itemStyle: { color: t.series[0], borderRadius: 4 },
          label: {
            show: true,
            position: 'right',
            distance: 10,
            formatter: (p: unknown) => {
              const e = etapas[(p as { dataIndex: number }).dataIndex]
              return `{v|${fmtCompacto(e.valor)}}${e.daAnterior === null ? '' : `  {p|${fmtPct(e.daAnterior)} da etapa anterior}`}`
            },
            rich: { v: { color: t.texto, fontSize: 13, fontWeight: 600 }, p: { color: t.textoSecundario, fontSize: 11 } },
          },
          data: etapas.map((e, i) => ({ value: e.valor, itemStyle: { opacity: 1 - i * 0.17 } })),
        },
      ],
    }
  }, [etapas, tema])

  const total = razao(etapas[3]?.valor, etapas[0]?.valor)

  return (
    <ChartCard
      titulo="Onde perdemos clientes entre o lead e o contrato?"
      subtitulo={`Funil comercial do período · conversão total de ${fmtPct(total)} (contratos ÷ leads)`}
      chartRef={ref}
      nomeArquivo="vendas-funil"
      csv={() => ({
        nome: 'vendas-funil',
        colunas: ['Etapa', 'Volume', 'Conversão da etapa anterior (%)', 'Em relação aos leads (%)'],
        linhas: etapas.map((e) => [e.nome, Math.round(e.valor), e.daAnterior === null ? null : Math.round(e.daAnterior * 1000) / 10, e.doTopo === null ? null : Math.round(e.doTopo * 1000) / 10]),
      })}
    >
      <EChart ref={ref} altura={208} option={option} descricao="Funil comercial: leads, propostas, propostas aprovadas e contratos" />
      <dl className="mt-3 grid grid-cols-3 gap-2">
        {etapas.slice(1).map((e) => (
          <div key={e.nome} className="rounded-xl border border-border bg-muted/40 px-3 py-2">
            <dt className="truncate text-[11px] leading-tight text-muted-foreground" title={`${e.anterior} → ${e.nome}`}>
              {e.anteriorCurto} → {e.curto}
            </dt>
            <dd className="tabular mt-0.5 text-base font-semibold leading-tight">{fmtPct(e.daAnterior)}</dd>
          </div>
        ))}
      </dl>
    </ChartCard>
  )
}

// ----------------------------------------------------------------------------------------------
// Mix por segmento (rosca) e por canal (barras)
// ----------------------------------------------------------------------------------------------

export function MixSegmento({ f, cubo }: PropsBase & { cubo: Cubo }) {
  const ref = useRef<EChartHandle>(null)
  const tema = useTema((s) => s.tema)

  const d = useMemo(() => {
    const grupos = agrupar(cubo, filtrar(cubo, { ...f.filtrosCubo, segmentos: [] }, f.meta), ['segmento'], ['credito_vendido', 'cotas_vendidas'])
    const ordem = f.meta?.segmentos ?? cubo.dims.find((x) => x.nome === 'segmento')?.valores ?? []
    const itens = ordem
      .map((nome, indice) => {
        const g = grupos.find((x) => x.chave[0] === nome)
        return { nome, indice, credito: g?.valores.credito_vendido ?? 0, cotas: g?.valores.cotas_vendidas ?? 0 }
      })
      .filter((x) => x.credito > 0)
    const total = itens.reduce((a, v) => a + v.credito, 0)
    const ativos = itens.filter((x) => !f.segmentos.length || f.segmentos.includes(x.nome))
    return { itens, total, totalAtivo: ativos.reduce((a, v) => a + v.credito, 0) }
  }, [cubo, f.filtrosCubo, f.meta, f.segmentos])

  const option = useMemo<EChartsOption>(() => {
    const t = tokensGrafico(tema)
    const ativo = (nome: string) => !f.segmentos.length || f.segmentos.includes(nome)
    return {
      legend: { data: d.itens.map((x) => x.nome) },
      tooltip: {
        trigger: 'item',
        formatter: (p: unknown) => {
          const x = d.itens.find((i) => i.nome === nomeDe(p))
          if (!x) return ''
          return tip(x.nome, [
            { rotulo: 'Crédito comercializado', valor: fmtBRL(x.credito, 0), cor: corDaSerie(x.indice, tema), forte: true },
            { rotulo: 'Participação', valor: fmtPct(razao(x.credito, d.total)) },
            { rotulo: 'Cotas vendidas', valor: fmtNumero(x.cotas) },
            { rotulo: 'Ticket médio', valor: fmtBRL(razao(x.credito, x.cotas), 0) },
          ])
        },
      },
      series: [
        {
          type: 'pie',
          name: 'Segmento',
          radius: ['52%', '76%'],
          center: ['50%', '56%'],
          padAngle: 1.5,
          itemStyle: { borderRadius: 4 },
          label: { formatter: (p: unknown) => `${nomeDe(p)}\n${fmtPct(((p as { percent?: number }).percent ?? 0) / 100)}`, color: t.texto, fontSize: 12, lineHeight: 16 },
          labelLine: { length: 8, length2: 10, lineStyle: { color: t.eixo } },
          emphasis: { scaleSize: 4 },
          data: d.itens.map((x) => ({ name: x.nome, value: x.credito, itemStyle: { color: corDaSerie(x.indice, tema), opacity: ativo(x.nome) ? 1 : 0.28 } })),
        },
        {
          type: 'pie',
          radius: [0, '44%'],
          center: ['50%', '56%'],
          silent: true,
          tooltip: { show: false },
          label: {
            show: true,
            position: 'center',
            formatter: `{v|${fmtCompacto(d.totalAtivo, { moeda: true })}}\n{r|${f.segmentos.length ? 'nos segmentos filtrados' : 'crédito no período'}}`,
            rich: { v: { color: t.texto, fontSize: 20, fontWeight: 600, lineHeight: 26 }, r: { color: t.textoSecundario, fontSize: 11, lineHeight: 16 } },
          },
          labelLine: { show: false },
          data: [{ value: 1, name: '', itemStyle: { color: 'transparent', borderWidth: 0 } }],
        },
      ],
    }
  }, [d, tema, f.segmentos])

  return (
    <ChartCard
      titulo="Qual segmento puxa a produção?"
      subtitulo="Participação de cada segmento no crédito comercializado"
      chartRef={ref}
      nomeArquivo="vendas-mix-segmento"
      vazio={d.itens.length === 0}
      csv={() => ({
        nome: 'vendas-mix-segmento',
        colunas: ['Segmento', 'Crédito comercializado (R$)', 'Participação (%)', 'Cotas vendidas', 'Ticket médio (R$)'],
        linhas: d.itens.map((x) => [x.nome, Math.round(x.credito), Math.round((x.credito / d.total) * 1000) / 10, Math.round(x.cotas), x.cotas ? Math.round(x.credito / x.cotas) : null]),
      })}
      rodape={<DicaFiltro texto="Clique em uma fatia para filtrar o segmento." ativos={f.segmentos} aoLimpar={() => useFiltros.getState().definirSegmentos([])} />}
    >
      <EChart ref={ref} altura={300} option={option} descricao="Participação dos segmentos no crédito comercializado" onEvents={{ click: (p) => nomeDe(p) && alternarFiltro('segmento', nomeDe(p)) }} />
    </ChartCard>
  )
}

export function MixCanal({ f, cubo }: PropsBase & { cubo: Cubo }) {
  const ref = useRef<EChartHandle>(null)
  const tema = useTema((s) => s.tema)

  const d = useMemo(() => {
    const semCanal = { ...f.filtrosCubo, dims: { ...f.filtrosCubo.dims, canal: [] } }
    const grupos = agrupar(cubo, filtrar(cubo, semCanal, f.meta), ['canal'], ['credito_vendido', 'cotas_vendidas'])
    const ordem = f.meta?.canais_venda ?? []
    const itens = ordem.map((nome) => {
      const g = grupos.find((x) => x.chave[0] === nome)
      return { nome, credito: g?.valores.credito_vendido ?? 0, cotas: g?.valores.cotas_vendidas ?? 0 }
    })
    itens.sort((a, b) => b.credito - a.credito)
    return { itens, total: itens.reduce((a, v) => a + v.credito, 0) }
  }, [cubo, f.filtrosCubo, f.meta])

  const option = useMemo<EChartsOption>(() => {
    const t = tokensGrafico(tema)
    const ativo = (nome: string) => !f.canais.length || f.canais.includes(nome)
    return {
      grid: { left: 8, right: 132, top: 8, bottom: 4, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const x = d.itens.find((i) => i.nome === nomeDe(Array.isArray(params) ? params[0] : params))
          if (!x) return ''
          return tip(x.nome, [
            { rotulo: 'Crédito comercializado', valor: fmtBRL(x.credito, 0), cor: t.series[1], forte: true },
            { rotulo: 'Participação', valor: fmtPct(razao(x.credito, d.total)) },
            { rotulo: 'Cotas vendidas', valor: fmtNumero(x.cotas) },
            { rotulo: 'Ticket médio', valor: fmtBRL(razao(x.credito, x.cotas), 0) },
          ])
        },
      },
      xAxis: { type: 'value', show: false },
      yAxis: { type: 'category', inverse: true, data: d.itens.map((x) => x.nome), axisLine: { show: false }, axisLabel: { color: t.texto, fontSize: 12, fontWeight: 500 } },
      series: [
        {
          type: 'bar',
          name: 'Crédito comercializado',
          barWidth: 26,
          itemStyle: { color: t.series[1], borderRadius: 4 },
          label: {
            show: true,
            position: 'right',
            distance: 10,
            formatter: (p: unknown) => {
              const x = d.itens[(p as { dataIndex: number }).dataIndex]
              return `{v|${fmtCompacto(x.credito, { moeda: true })}}  {p|${fmtPct(razao(x.credito, d.total))}}`
            },
            rich: { v: { color: t.texto, fontSize: 13, fontWeight: 600 }, p: { color: t.textoSecundario, fontSize: 11 } },
          },
          data: d.itens.map((x) => ({ value: x.credito, itemStyle: { opacity: ativo(x.nome) ? 1 : 0.28 } })),
        },
      ],
    }
  }, [d, tema, f.canais])

  return (
    <ChartCard
      titulo="Por qual canal vendemos mais?"
      subtitulo="Crédito comercializado e participação por canal de venda"
      chartRef={ref}
      nomeArquivo="vendas-mix-canal"
      csv={() => ({
        nome: 'vendas-mix-canal',
        colunas: ['Canal', 'Crédito comercializado (R$)', 'Participação (%)', 'Cotas vendidas', 'Ticket médio (R$)'],
        linhas: d.itens.map((x) => [x.nome, Math.round(x.credito), d.total ? Math.round((x.credito / d.total) * 1000) / 10 : null, Math.round(x.cotas), x.cotas ? Math.round(x.credito / x.cotas) : null]),
      })}
      rodape={<DicaFiltro texto="Clique em um canal para filtrar." ativos={f.canais} aoLimpar={() => useFiltros.getState().definirCanais([])} />}
    >
      <EChart ref={ref} altura={300} option={option} descricao="Crédito comercializado por canal de venda" onEvents={{ click: (p) => nomeDe(p) && alternarFiltro('canal', nomeDe(p)) }} />
    </ChartCard>
  )
}

// ----------------------------------------------------------------------------------------------
// Cancelamentos: evolução por motivo e quebra
// ----------------------------------------------------------------------------------------------

export function Cancelamentos({ f, cubo, cuboVendas }: PropsBase & { cubo: Cubo; cuboVendas: Cubo }) {
  const refEvolucao = useRef<EChartHandle>(null)
  const refMotivos = useRef<EChartHandle>(null)
  const tema = useTema((s) => s.tema)
  const g = f.granularidade

  const d = useMemo(() => {
    const linhas = filtrar(cubo, f.filtrosCubo, f.meta)
    const serie = serieTemporalPor(cubo, linhas, g, 'motivo', 'cotas_canceladas', f.periodo)
    const vendas = serieTemporal(cuboVendas, filtrar(cuboVendas, f.filtrosCubo, f.meta), g, ['cotas_vendidas'], f.periodo)
    const vendasPorBucket = new Map(vendas.buckets.map((b, i) => [b, vendas.valores.cotas_vendidas[i]]))
    const ordem = cubo.dims.find((x) => x.nome === 'motivo')?.valores ?? []
    const porMotivo = agrupar(cubo, linhas, ['motivo'], ['cotas_canceladas', 'credito_cancelado'])
    const motivos = ordem
      .map((nome, indice) => {
        const m = porMotivo.find((x) => x.chave[0] === nome)
        return { nome, indice, cotas: m?.valores.cotas_canceladas ?? 0, credito: m?.valores.credito_cancelado ?? 0 }
      })
      .sort((a, b) => b.cotas - a.cotas)
    const total = motivos.reduce((a, v) => a + v.cotas, 0)
    const totalBucket = serie.buckets.map((_, i) => serie.series.reduce((a, s) => a + s.valores[i], 0))
    return { serie, ordem, motivos, total, totalBucket, vendasPorBucket }
  }, [cubo, cuboVendas, f.filtrosCubo, f.meta, f.periodo, g])

  const optEvolucao = useMemo<EChartsOption>(() => {
    const t = tokensGrafico(tema)
    return {
      legend: { data: d.serie.series.map((s) => s.nome), itemGap: 14, right: 8 },
      grid: { left: 8, right: 16, top: 64, bottom: 4, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const itens = (Array.isArray(params) ? params : [params]) as { dataIndex: number; seriesName: string; value: number; color: string }[]
          if (!itens.length) return ''
          const i = itens[0].dataIndex
          const b = d.serie.buckets[i]
          const tot = d.totalBucket[i]
          return tip(
            rotuloLongo(b, g),
            [
              ...itens.map((p) => ({ rotulo: p.seriesName, valor: `${fmtNumero(p.value)} · ${fmtPct(razao(p.value, tot))}`, cor: p.color })),
              { rotulo: 'Total de cotas canceladas', valor: fmtNumero(tot), forte: true },
              { rotulo: '% sobre as vendas do período', valor: fmtPct(razao(tot, d.vendasPorBucket.get(b))) },
            ],
          )
        },
      },
      xAxis: { type: 'category', data: d.serie.rotulos },
      yAxis: { type: 'value', splitNumber: 4, axisLabel: { formatter: (v: number) => eixoCompacto(v) } },
      series: d.serie.series.map((s) => ({
        name: s.nome,
        type: 'bar' as const,
        stack: 'motivo',
        barMaxWidth: 32,
        itemStyle: { color: corDaSerie(d.ordem.indexOf(s.nome), tema), borderRadius: 0, borderColor: t.superficie, borderWidth: 1 },
        emphasis: { focus: 'series' as const },
        data: s.valores,
      })),
    }
  }, [d, g, tema])

  const optMotivos = useMemo<EChartsOption>(() => {
    const t = tokensGrafico(tema)
    return {
      grid: { left: 8, right: 108, top: 8, bottom: 4, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const m = d.motivos.find((x) => x.nome === nomeDe(Array.isArray(params) ? params[0] : params))
          if (!m) return ''
          return tip(m.nome, [
            { rotulo: 'Cotas canceladas', valor: fmtNumero(m.cotas), cor: corDaSerie(m.indice, tema), forte: true },
            { rotulo: 'Participação', valor: fmtPct(razao(m.cotas, d.total)) },
            { rotulo: 'Crédito cancelado', valor: fmtBRL(m.credito, 0) },
          ])
        },
      },
      xAxis: { type: 'value', show: false },
      yAxis: {
        type: 'category',
        inverse: true,
        data: d.motivos.map((m) => m.nome),
        axisLine: { show: false },
        axisLabel: { color: t.texto, fontSize: 12, width: 130, overflow: 'break', lineHeight: 15 },
      },
      series: [
        {
          type: 'bar',
          name: 'Cotas canceladas',
          barWidth: 22,
          label: {
            show: true,
            position: 'right',
            distance: 10,
            formatter: (p: unknown) => {
              const m = d.motivos[(p as { dataIndex: number }).dataIndex]
              return `{v|${fmtCompacto(m.cotas)}}  {p|${fmtPct(razao(m.cotas, d.total))}}`
            },
            rich: { v: { color: t.texto, fontSize: 13, fontWeight: 600 }, p: { color: t.textoSecundario, fontSize: 11 } },
          },
          data: d.motivos.map((m) => ({ value: m.cotas, itemStyle: { color: corDaSerie(m.indice, tema), borderRadius: 4 } })),
        },
      ],
    }
  }, [d, tema])

  return (
    <div className="grid gap-4 xl:grid-cols-5">
      <ChartCard
        className="xl:col-span-3"
        titulo="Os cancelamentos estão crescendo? E por quê?"
        subtitulo={`Cotas canceladas por ${NOME_GRANULARIDADE[g]}, pela data do cancelamento, segundo o motivo declarado`}
        chartRef={refEvolucao}
        nomeArquivo="vendas-cancelamentos-evolucao"
        vazio={d.total === 0}
        csv={() => ({
          nome: 'vendas-cancelamentos-evolucao',
          colunas: ['Período', ...d.serie.series.map((s) => s.nome), 'Total'],
          linhas: d.serie.buckets.map((b, i) => [rotuloLongo(b, g), ...d.serie.series.map((s) => Math.round(s.valores[i])), Math.round(d.totalBucket[i])]),
        })}
      >
        <EChart ref={refEvolucao} altura={320} option={optEvolucao} descricao="Evolução das cotas canceladas por motivo" />
      </ChartCard>
      <ChartCard
        className="xl:col-span-2"
        titulo="Quais motivos mais pesam nos cancelamentos?"
        subtitulo={`${fmtNumero(d.total)} cotas canceladas no período`}
        chartRef={refMotivos}
        nomeArquivo="vendas-cancelamentos-motivos"
        vazio={d.total === 0}
        csv={() => ({
          nome: 'vendas-cancelamentos-motivos',
          colunas: ['Motivo', 'Cotas canceladas', 'Participação (%)', 'Crédito cancelado (R$)'],
          linhas: d.motivos.map((m) => [m.nome, Math.round(m.cotas), d.total ? Math.round((m.cotas / d.total) * 1000) / 10 : null, Math.round(m.credito)]),
        })}
      >
        <EChart ref={refMotivos} altura={320} option={optMotivos} descricao="Cotas canceladas por motivo" />
      </ChartCard>
    </div>
  )
}
