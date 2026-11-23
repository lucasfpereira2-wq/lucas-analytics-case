import { useMemo, useRef, useState } from 'react'
import { ChartCard } from '@/components/dados'
import { EChart, type EChartHandle, type EChartsOption } from '@/components/dados/EChart'
import { agrupar, filtrar, type FiltrosCubo, type LinhasFiltradas } from '@/lib/cubo'
import { useFiltros } from '@/lib/filtros'
import { fmtCompacto, fmtNumero, fmtPct } from '@/lib/formato'
import { useTema } from '@/lib/tema'
import { tokensGrafico } from '@/lib/tema-echarts'
import type { Cubo } from '@/types/cubo'
import type { Meta } from '@/types/governanca'
import { coresFaixas } from './cores'
import { FAIXAS_ATRASO, posicaoDe, type PosicaoCarteira } from './dados'
import { Alternador } from './ui'

type Metrica = 'saldo' | 'cotas' | 'pct'

/** Composição do atraso na última fotografia: barras por faixa + quebras 100% por segmento e regional. */
export function ComposicaoFaixas({
  cubo,
  linhasFoto,
  posicao,
  dataFoto,
  meta,
  filtrosBase,
  fim,
}: {
  cubo: Cubo
  /** linhas até o fim do período (o motor usa a última fotografia) */
  linhasFoto: LinhasFiltradas
  posicao: PosicaoCarteira
  dataFoto: string
  meta: Meta | null
  /** filtros de segmento/regional/UF e fim do período: cada quebra ignora o filtro da própria dimensão */
  filtrosBase: FiltrosCubo
  fim: string
}) {
  const tema = useTema((s) => s.tema)
  const [metrica, setMetrica] = useState<Metrica>('saldo')
  const refFaixa = useRef<EChartHandle>(null)
  const refSeg = useRef<EChartHandle>(null)
  const refReg = useRef<EChartHandle>(null)
  const segSel = useFiltros((s) => s.segmentos)
  const regSel = useFiltros((s) => s.regionais)

  const porSegmento = useMemo(() => {
    const linhas = filtrosBase.segmentos?.length ? filtrar(cubo, { ...filtrosBase, segmentos: [], fim }, meta) : linhasFoto
    return quebra(agrupar(cubo, linhas, ['segmento', 'faixa'], ['saldo_devedor', 'cotas', 'valor_em_atraso']))
  }, [cubo, linhasFoto, filtrosBase, fim, meta])
  const porRegional = useMemo(() => {
    const regDaUf = new Map((meta?.ufs ?? []).map((u) => [u.sigla, u.regional]))
    const linhas = filtrosBase.regionais?.length ? filtrar(cubo, { ...filtrosBase, regionais: [], ufs: [], fim }, meta) : linhasFoto
    const g = agrupar(cubo, linhas, ['uf', 'faixa'], ['saldo_devedor', 'cotas', 'valor_em_atraso']).map((x) => ({ ...x, chave: [regDaUf.get(x.chave[0]) ?? 'Outras', x.chave[1]] }))
    const ordem = meta?.regionais.map((r) => r.nome) ?? []
    return quebra(g).sort((a, b) => ordem.indexOf(a.nome) - ordem.indexOf(b.nome))
  }, [cubo, linhasFoto, filtrosBase, fim, meta])

  const optFaixa = useMemo<EChartsOption>(() => {
    const cores = coresFaixas(tema)
    const t = tokensGrafico(tema)
    const valor = (f: string) => {
      const v = posicao.porFaixa[f]
      if (!v) return 0
      return metrica === 'saldo' ? Math.round(v.saldo) : metrica === 'cotas' ? Math.round(v.cotas) : posicao.saldo ? +((v.saldo / posicao.saldo) * 100).toFixed(3) : 0
    }
    const fmt = (v: number) => (metrica === 'saldo' ? fmtCompacto(v, { moeda: true }) : metrica === 'cotas' ? fmtNumero(v) : fmtPct(v, 2, { fracao: false }))
    return {
      grid: { left: 8, right: 16, top: 28, bottom: 6, containLabel: true },
      tooltip: {
        trigger: 'item',
        formatter: (p: unknown) => {
          const f = (p as { name: string }).name.replace(' dias', '')
          const v = posicao.porFaixa[f]
          if (!v) return ''
          return `<div style="min-width:190px"><div style="font-weight:600;margin-bottom:4px">Atraso de ${f} dias</div>
            <div style="display:flex;justify-content:space-between;gap:20px;line-height:1.7"><span style="opacity:.8">Saldo devedor</span><strong>${fmtCompacto(v.saldo, { moeda: true })}</strong></div>
            <div style="display:flex;justify-content:space-between;gap:20px;line-height:1.7"><span style="opacity:.8">Cotas</span><strong>${fmtNumero(v.cotas)}</strong></div>
            <div style="display:flex;justify-content:space-between;gap:20px;line-height:1.7"><span style="opacity:.8">% da carteira</span><strong>${fmtPct(posicao.saldo ? v.saldo / posicao.saldo : null, 2)}</strong></div>
            <div style="display:flex;justify-content:space-between;gap:20px;line-height:1.7"><span style="opacity:.8">Valor em atraso</span><strong>${fmtCompacto(v.atraso, { moeda: true })}</strong></div></div>`
        },
      },
      xAxis: { type: 'category', data: FAIXAS_ATRASO.map((f) => `${f} dias`) },
      yAxis: { type: 'value', axisLabel: { formatter: (v: number) => (metrica === 'pct' ? fmtPct(v, 1, { fracao: false }) : fmtCompacto(v, { moeda: metrica === 'saldo', casas: 0 })) } },
      series: [
        {
          type: 'bar', name: 'Faixa de atraso', barMaxWidth: 56,
          data: FAIXAS_ATRASO.map((f) => ({ value: valor(f), itemStyle: { color: cores[f] } })),
          label: { show: true, position: 'top', color: t.texto, fontWeight: 600, fontSize: 12, formatter: (p: { value: unknown }) => fmt(p.value as number) },
        },
      ],
    }
  }, [posicao, metrica, tema])

  const empilhado = (dados: Quebra[], selecionados: string[]): EChartsOption => {
    const cores = coresFaixas(tema)
    const t = tokensGrafico(tema)
    const nomes = dados.map((d) => d.nome)
    return {
      legend: { data: [...FAIXAS_ATRASO], itemGap: 12 },
      grid: { left: 8, right: 64, top: 38, bottom: 4, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const i = (params as { dataIndex: number }[])[0]?.dataIndex ?? 0
          const d = dados[i]
          if (!d) return ''
          return `<div style="min-width:230px"><div style="font-weight:600;margin-bottom:4px">${d.nome}</div>
            ${FAIXAS_ATRASO.map((f) => `<div style="display:flex;justify-content:space-between;gap:20px;line-height:1.7"><span style="opacity:.85"><span style="display:inline-block;width:9px;height:9px;border-radius:3px;background:${cores[f]};margin-right:6px"></span>${f} dias</span><strong style="font-variant-numeric:tabular-nums">${fmtCompacto(d.pos.porFaixa[f]?.saldo ?? 0, { moeda: true })} · ${fmtPct(d.pos.saldoAtrasado ? (d.pos.porFaixa[f]?.saldo ?? 0) / d.pos.saldoAtrasado : null)}</strong></div>`).join('')}
            <div style="border-top:1px solid rgba(128,150,170,.3);margin:5px 0"></div>
            <div style="display:flex;justify-content:space-between;gap:20px;line-height:1.7"><span style="opacity:.8">Carteira ativa</span><strong>${fmtCompacto(d.pos.saldo, { moeda: true })}</strong></div>
            <div style="display:flex;justify-content:space-between;gap:20px;line-height:1.7"><span style="opacity:.8">Over 30</span><strong>${fmtPct(d.pos.over30, 2)}</strong></div>
            <div style="display:flex;justify-content:space-between;gap:20px;line-height:1.7"><span style="opacity:.8">Over 90</span><strong>${fmtPct(d.pos.over90, 2)}</strong></div>
            <div style="opacity:.6;font-size:11px;margin-top:6px">Clique para filtrar o relatório</div></div>`
        },
      },
      xAxis: { type: 'value', max: 100, interval: 25, axisLabel: { formatter: (v: number) => fmtPct(v, 0, { fracao: false }) } },
      yAxis: {
        type: 'category', inverse: true, data: nomes, axisLine: { show: false },
        axisLabel: { color: (v?: string | number) => (selecionados.length && !selecionados.includes(String(v)) ? t.textoSecundario : t.texto), fontSize: 12, width: 110, overflow: 'truncate' },
      },
      series: FAIXAS_ATRASO.map((f, k) => ({
        type: 'bar' as const, name: f, stack: 'total', barWidth: 20, cursor: 'pointer',
        itemStyle: { color: cores[f], borderColor: t.superficie, borderWidth: 1, borderRadius: 0 },
        data: dados.map((d) => ({
          value: d.pos.saldoAtrasado ? +(((d.pos.porFaixa[f]?.saldo ?? 0) / d.pos.saldoAtrasado) * 100).toFixed(3) : 0,
          itemStyle: { opacity: selecionados.length && !selecionados.includes(d.nome) ? 0.35 : 1 },
        })),
        emphasis: { focus: 'none' as const },
        // rótulo direto à direita: over 30 do grupo (só na última série da pilha)
        label: k === FAIXAS_ATRASO.length - 1
          ? { show: true, position: 'right' as const, distance: 8, color: t.texto, fontWeight: 600, fontSize: 12, formatter: (p: { dataIndex: number }) => fmtPct(dados[p.dataIndex]?.pos.over30, 1) }
          : { show: false },
      })),
    }
  }

  const optSeg = useMemo(() => empilhado(porSegmento, segSel), [porSegmento, segSel, tema]) // eslint-disable-line react-hooks/exhaustive-deps
  const optReg = useMemo(() => empilhado(porRegional, regSel), [porRegional, regSel, tema]) // eslint-disable-line react-hooks/exhaustive-deps

  const alternarSeg = (nome: string) => {
    const s = useFiltros.getState()
    s.definirSegmentos(s.segmentos.includes(nome) ? s.segmentos.filter((x) => x !== nome) : [...s.segmentos, nome])
  }
  const alternarReg = (nome: string) => {
    const s = useFiltros.getState()
    s.definirRegionais(s.regionais.includes(nome) ? s.regionais.filter((x) => x !== nome) : [...s.regionais, nome], meta)
  }
  const csvQuebra = (nome: string, rotulo: string, dados: Quebra[]) => () => ({
    nome,
    colunas: [rotulo, 'Carteira ativa (R$)', 'Over 30 (%)', 'Over 90 (%)', ...FAIXAS_ATRASO.map((f) => `Saldo ${f} (R$)`)],
    linhas: dados.map((d) => [d.nome, Math.round(d.pos.saldo), pct(d.pos.over30), pct(d.pos.over90), ...FAIXAS_ATRASO.map((f) => Math.round(d.pos.porFaixa[f]?.saldo ?? 0))]),
  })
  const sub = 'Mix do saldo em atraso por faixa, em dias (100%). À direita, o over 30 do grupo. Clique para filtrar.'

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <ChartCard
        titulo="Em que faixa de atraso o saldo está concentrado?"
        subtitulo={`Posição de ${dataFoto}`}
        chartRef={refFaixa}
        nomeArquivo="carteira-faixas-de-atraso"
        csv={{
          nome: 'carteira-faixas-de-atraso',
          colunas: ['Faixa de atraso', 'Saldo devedor (R$)', 'Cotas', '% da carteira', 'Valor em atraso (R$)'],
          linhas: ['Em dia', ...FAIXAS_ATRASO].map((f) => {
            const v = posicao.porFaixa[f] ?? { saldo: 0, cotas: 0, atraso: 0 }
            return [f, Math.round(v.saldo), Math.round(v.cotas), posicao.saldo ? +((v.saldo / posicao.saldo) * 100).toFixed(3) : '', Math.round(v.atraso)]
          }),
        }}
      >
        <Alternador rotulo="Métrica" valor={metrica} onChange={setMetrica} opcoes={[{ id: 'saldo', rotulo: 'Saldo' }, { id: 'cotas', rotulo: 'Cotas' }, { id: 'pct', rotulo: '% da carteira' }]} />
        <EChart ref={refFaixa} altura={238} option={optFaixa} descricao="Saldo devedor por faixa de atraso" />
      </ChartCard>
      <ChartCard titulo="Qual segmento carrega o atraso mais grave?" subtitulo={sub} chartRef={refSeg} nomeArquivo="carteira-atraso-por-segmento" csv={csvQuebra('carteira-atraso-por-segmento', 'Segmento', porSegmento)}>
        <EChart ref={refSeg} altura={270} option={optSeg} descricao="Mix do atraso por segmento" onEvents={{ click: (p) => alternarSeg((p as { name: string }).name) }} />
      </ChartCard>
      <ChartCard titulo="E qual regional?" subtitulo={sub} chartRef={refReg} nomeArquivo="carteira-atraso-por-regional" csv={csvQuebra('carteira-atraso-por-regional', 'Regional', porRegional)}>
        <EChart ref={refReg} altura={270} option={optReg} descricao="Mix do atraso por regional" onEvents={{ click: (p) => alternarReg((p as { name: string }).name) }} />
      </ChartCard>
    </div>
  )
}

interface Quebra {
  nome: string
  pos: PosicaoCarteira
}
const pct = (v: number | null) => (v == null ? '' : +(v * 100).toFixed(3))

function quebra(grupos: { chave: string[]; valores: Record<string, number> }[]): Quebra[] {
  const m = new Map<string, PosicaoCarteira['porFaixa']>()
  for (const g of grupos) {
    let pf = m.get(g.chave[0])
    if (!pf) m.set(g.chave[0], (pf = {}))
    const a = pf[g.chave[1]] ?? (pf[g.chave[1]] = { saldo: 0, cotas: 0, atraso: 0 })
    a.saldo += g.valores.saldo_devedor
    a.cotas += g.valores.cotas
    a.atraso += g.valores.valor_em_atraso
  }
  return [...m.entries()].map(([nome, pf]) => ({ nome, pos: posicaoDe(pf) }))
}
