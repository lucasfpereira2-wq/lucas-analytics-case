import { useMemo, useRef, useState } from 'react'
import { ChartCard } from '@/components/dados'
import { EChart, type EChartHandle, type EChartsOption } from '@/components/dados/EChart'
import { MultiSelecao } from '@/components/relatorio/MultiSelecao'
import { agrupar, filtrar, razao, serieTemporal, totais, type FiltrosCubo, type Granularidade, type MetaCubo } from '@/lib/cubo'
import { fmtBRL, fmtCompacto, fmtData, fmtMes, fmtNumero, fmtPct } from '@/lib/formato'
import { useTema } from '@/lib/tema'
import { corDaSerie, tokensGrafico, tooltipBR } from '@/lib/tema-echarts'
import { cn } from '@/lib/utils'
import type { Cubo } from '@/types/cubo'
import { Secao } from './ui'

const ETAPAS = [
  { id: 'acionamentos', rotulo: 'Acionamentos' },
  { id: 'contatos_efetivos', rotulo: 'Contatos efetivos' },
  { id: 'acordos_firmados', rotulo: 'Acordos firmados' },
  { id: 'acordos_cumpridos', rotulo: 'Acordos cumpridos' },
] as const

/** Recuperação e acordos: funil, valor acordado × recuperado e efetividade por canal de cobrança. */
export function Recuperacao({
  cubo,
  filtros,
  meta,
  granularidade,
  periodo,
}: {
  cubo: Cubo
  /** filtros globais (período, segmento, regional, UF) */
  filtros: FiltrosCubo
  meta: MetaCubo | null
  granularidade: Granularidade
  periodo: { inicio: string; fim: string }
}) {
  const tema = useTema((s) => s.tema)
  const refFunil = useRef<EChartHandle>(null)
  const refTempo = useRef<EChartHandle>(null)
  const canaisTodos = useMemo(() => cubo.dims.find((d) => d.nome === 'canal_cobranca')?.valores ?? [], [cubo])
  const [canais, setCanais] = useState<string[]>([])

  const linhasTodos = useMemo(() => filtrar(cubo, { ...filtros, dims: {} }, meta), [cubo, filtros, meta])
  const linhas = useMemo(() => (canais.length ? filtrar(cubo, { ...filtros, dims: { canal_cobranca: canais } }, meta) : linhasTodos), [cubo, filtros, meta, canais, linhasTodos])
  const tot = useMemo(() => totais(cubo, linhas), [cubo, linhas])
  const serie = useMemo(() => serieTemporal(cubo, linhas, granularidade, ['valor_acordado', 'valor_recuperado'], periodo), [cubo, linhas, granularidade, periodo])
  const porCanal = useMemo(() => {
    const m = new Map(agrupar(cubo, linhasTodos, ['canal_cobranca']).map((g) => [g.chave[0], g.valores]))
    return canaisTodos.map((c, i) => ({ canal: c, indice: i, v: m.get(c) ?? {} })).filter((x) => (x.v.acionamentos ?? 0) > 0)
  }, [cubo, linhasTodos, canaisTodos])
  const maxRec = Math.max(1, ...porCanal.map((c) => c.v.valor_recuperado ?? 0))

  const optFunil = useMemo<EChartsOption>(() => {
    const t = tokensGrafico(tema)
    const valores = ETAPAS.map((e) => tot[e.id] ?? 0)
    return {
      grid: { left: 8, right: 150, top: 8, bottom: 4, containLabel: true },
      tooltip: {
        trigger: 'item',
        formatter: (p: unknown) => {
          const i = (p as { dataIndex: number }).dataIndex
          return `<div style="min-width:200px"><div style="font-weight:600;margin-bottom:4px">${ETAPAS[i].rotulo}</div>
            <div style="display:flex;justify-content:space-between;gap:20px;line-height:1.7"><span style="opacity:.8">Volume</span><strong>${fmtNumero(valores[i])}</strong></div>
            ${i > 0 ? `<div style="display:flex;justify-content:space-between;gap:20px;line-height:1.7"><span style="opacity:.8">Conversão da etapa anterior</span><strong>${fmtPct(razao(valores[i], valores[i - 1]))}</strong></div>` : ''}
            <div style="display:flex;justify-content:space-between;gap:20px;line-height:1.7"><span style="opacity:.8">% dos acionamentos</span><strong>${fmtPct(razao(valores[i], valores[0]), 2)}</strong></div></div>`
        },
      },
      xAxis: { type: 'value', show: false, max: (v: { max: number }) => v.max },
      yAxis: { type: 'category', inverse: true, data: ETAPAS.map((e) => e.rotulo), axisLine: { show: false }, axisLabel: { color: t.texto, fontSize: 12 } },
      series: [
        {
          type: 'bar', name: 'Funil de recuperação', barWidth: 30, barMinHeight: 3,
          data: valores.map((v, i) => ({ value: Math.round(v), itemStyle: { color: t.series[0], opacity: 1 - i * 0.17, borderRadius: [0, 4, 4, 0] } })),
          label: {
            show: true, position: 'right', distance: 8,
            formatter: (p: { dataIndex: number }) => `{v|${fmtCompacto(valores[p.dataIndex])}}${p.dataIndex > 0 ? `  {c|${fmtPct(razao(valores[p.dataIndex], valores[p.dataIndex - 1]))} da etapa anterior}` : ''}`,
            rich: { v: { color: t.texto, fontWeight: 700, fontSize: 13 }, c: { color: t.textoSecundario, fontSize: 11 } },
          },
        },
      ],
    }
  }, [tot, tema])

  const optTempo = useMemo<EChartsOption>(() => {
    const titulo = (b: string) => (b.length === 7 ? fmtMes(b) : granularidade === 'semana' ? `Semana de ${fmtData(b)}` : fmtData(b))
    return {
      legend: { data: ['Valor acordado', 'Valor recuperado'] },
      tooltip: { trigger: 'axis', formatter: tooltipBR((v) => fmtCompacto(v, { moeda: true, casas: 2 }), { titulo: (r) => titulo(serie.buckets[serie.rotulos.indexOf(r)] ?? r) }) },
      xAxis: { type: 'category', data: serie.rotulos, boundaryGap: false },
      yAxis: { type: 'value', axisLabel: { formatter: (v: number) => fmtCompacto(v, { moeda: true, casas: 0 }) } },
      series: [
        { type: 'line', name: 'Valor acordado', data: serie.valores.valor_acordado.map(Math.round), color: corDaSerie(3, tema), lineStyle: { width: 2, type: [5, 4] }, showSymbol: serie.buckets.length <= 16 },
        { type: 'line', name: 'Valor recuperado', data: serie.valores.valor_recuperado.map(Math.round), color: corDaSerie(0, tema), areaStyle: { opacity: 0.1 }, showSymbol: serie.buckets.length <= 16 },
      ],
    }
  }, [serie, tema, granularidade])

  const alternarCanal = (c: string) => setCanais((atual) => (atual.includes(c) ? atual.filter((x) => x !== c) : [...atual, c]))
  const escopo = canais.length ? (canais.length === 1 ? canais[0] : `${canais.length} canais`) : 'todos os canais'

  return (
    <Secao
      titulo="Recuperação e acordos"
      descricao="Da régua de cobrança ao dinheiro de volta no grupo: acionamentos, contatos, acordos e valor recuperado no período."
      acoes={<MultiSelecao rotulo="Canal de cobrança" opcoes={canaisTodos} selecionados={canais} onChange={setCanais} />}
    >
      <div className="grid gap-4 xl:grid-cols-5">
        <ChartCard
          className="xl:col-span-2"
          titulo="Quantos acionamentos viram acordo cumprido?"
          subtitulo={`Funil de recuperação · ${escopo}`}
          chartRef={refFunil}
          nomeArquivo="carteira-funil-recuperacao"
          vazio={!tot.acionamentos}
          csv={{ nome: 'carteira-funil-recuperacao', colunas: ['Etapa', 'Volume', 'Conversão da etapa anterior (%)'], linhas: ETAPAS.map((e, i) => [e.rotulo, Math.round(tot[e.id] ?? 0), i ? pct(razao(tot[e.id], tot[ETAPAS[i - 1].id])) : '']) }}
          rodape={
            <span>
              Valor acordado <strong className="tabular font-semibold text-foreground">{fmtCompacto(tot.valor_acordado, { moeda: true })}</strong> · recuperado{' '}
              <strong className="tabular font-semibold text-foreground">{fmtCompacto(tot.valor_recuperado, { moeda: true })}</strong> ({fmtPct(razao(tot.valor_recuperado, tot.valor_acordado))} do acordado)
            </span>
          }
        >
          <EChart ref={refFunil} altura={250} option={optFunil} descricao="Funil de recuperação" />
        </ChartCard>
        <ChartCard
          className="xl:col-span-3"
          titulo="O valor acordado está se convertendo em caixa?"
          subtitulo={`Valor acordado × valor recuperado · ${escopo}`}
          chartRef={refTempo}
          nomeArquivo="carteira-acordado-recuperado"
          vazio={!serie.buckets.length}
          csv={() => ({ nome: 'carteira-acordado-recuperado', colunas: ['Período', 'Valor acordado (R$)', 'Valor recuperado (R$)'], linhas: serie.buckets.map((b, i) => [b, Math.round(serie.valores.valor_acordado[i]), Math.round(serie.valores.valor_recuperado[i])]) })}
        >
          <EChart ref={refTempo} altura={286} option={optTempo} descricao="Valor acordado e recuperado no tempo" />
        </ChartCard>
      </div>

      <ChartCard
        titulo="Qual canal de cobrança entrega mais por acionamento?"
        subtitulo="Efetividade por canal no período filtrado. Clique em um canal para focar o funil e a série acima."
        vazio={!porCanal.length}
        csv={{
          nome: 'carteira-efetividade-por-canal',
          colunas: ['Canal de cobrança', 'Acionamentos', 'Taxa de contato (%)', 'Taxa de acordo (%)', 'Taxa de cumprimento (%)', 'Valor recuperado (R$)', 'Recuperado por acionamento (R$)'],
          linhas: porCanal.map(({ canal, v }) => [canal, Math.round(v.acionamentos), pct(razao(v.contatos_efetivos, v.acionamentos)), pct(razao(v.acordos_firmados, v.contatos_efetivos)), pct(razao(v.acordos_cumpridos, v.acordos_firmados)), Math.round(v.valor_recuperado), +(razao(v.valor_recuperado, v.acionamentos) ?? 0).toFixed(2)]),
        }}
      >
        <div className="scroll-fino -mx-1 overflow-x-auto">
          <table className="w-full min-w-[820px] border-separate border-spacing-0 text-[13px]">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                {['Canal de cobrança', 'Acionamentos', 'Taxa de contato', 'Taxa de acordo', 'Taxa de cumprimento', 'Valor recuperado', 'Recuperado por acionamento'].map((h, i) => (
                  <th key={h} className={cn('border-b border-border px-2 pb-2 font-medium', i > 0 && i !== 5 && 'text-right', i === 5 && 'w-[26%]')}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {porCanal.map(({ canal, indice, v }) => {
                const ativo = canais.includes(canal)
                const apagado = canais.length > 0 && !ativo
                return (
                  <tr key={canal} onClick={() => alternarCanal(canal)} className={cn('cursor-pointer transition-colors hover:bg-muted/60', ativo && 'bg-accent/60', apagado && 'opacity-55')} aria-selected={ativo}>
                    <td className="border-b border-border/60 px-2 py-2.5 font-medium">
                      <span className="inline-flex items-center gap-2">
                        <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: corDaSerie(indice, tema) }} aria-hidden />
                        {canal}
                      </span>
                    </td>
                    <td className="tabular border-b border-border/60 px-2 py-2.5 text-right">{fmtNumero(v.acionamentos)}</td>
                    <td className="tabular border-b border-border/60 px-2 py-2.5 text-right">{fmtPct(razao(v.contatos_efetivos, v.acionamentos))}</td>
                    <td className="tabular border-b border-border/60 px-2 py-2.5 text-right">{fmtPct(razao(v.acordos_firmados, v.contatos_efetivos))}</td>
                    <td className="tabular border-b border-border/60 px-2 py-2.5 text-right">{fmtPct(razao(v.acordos_cumpridos, v.acordos_firmados))}</td>
                    <td className="border-b border-border/60 px-2 py-2.5">
                      <span className="flex items-center gap-2.5">
                        <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                          <span className="block h-full rounded-full" style={{ width: `${((v.valor_recuperado ?? 0) / maxRec) * 100}%`, background: corDaSerie(indice, tema) }} />
                        </span>
                        <span className="tabular w-20 shrink-0 text-right font-medium">{fmtCompacto(v.valor_recuperado, { moeda: true })}</span>
                      </span>
                    </td>
                    <td className="tabular border-b border-border/60 px-2 py-2.5 text-right font-medium">{fmtBRL(razao(v.valor_recuperado, v.acionamentos))}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </Secao>
  )
}

const pct = (v: number | null) => (v == null ? '' : +(v * 100).toFixed(2))
