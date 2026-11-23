import { useMemo, useRef } from 'react'
import { ChartCard } from '@/components/dados'
import { EChart, type EChartHandle } from '@/components/dados/EChart'
import { agrupar, filtrar, serieTemporal, totais } from '@/lib/cubo'
import type { FiltrosResolvidos } from '@/lib/filtros'
import { fmtData, fmtMes, fmtNumero, fmtPct } from '@/lib/formato'
import { corDaSerie } from '@/lib/tema-echarts'
import type { Cubo } from '@/types/cubo'
import { BarrasH, Secao, type ItemBarra } from './Comuns'
import { DIM_CANAL, MEDIDAS_NPS, mesesDoPeriodo, opcao, partesNps, semCanal, tooltipHTML, useAlternarCanal, useTokens } from './util'

const nps0 = (v: number | null) => (v == null ? '–' : fmtNumero(v, 0))
const nps1 = (v: number | null) => (v == null ? '–' : fmtNumero(v, 1))
const arred1 = (v: number | null) => (v == null ? '' : Math.round(v * 10) / 10)

/** NPS: número do período com composição, evolução mensal e quebras por canal e segmento. */
export function BlocoNps({ cubo, f }: { cubo: Cubo; f: FiltrosResolvidos }) {
  const refComp = useRef<EChartHandle>(null)
  const refEvo = useRef<EChartHandle>(null)
  const refCanal = useRef<EChartHandle>(null)
  const refSeg = useRef<EChartHandle>(null)
  const { tema, t } = useTokens()
  const alternarCanal = useAlternarCanal()
  const ordemCanais = useMemo(() => cubo.dims.find((d) => d.nome === DIM_CANAL)?.valores ?? [], [cubo])
  const meses = mesesDoPeriodo(f)

  // cores da composição: tons da paleta do tema (nada de verde/amarelo/vermelho, reservados a status)
  const cores = useMemo(() => ({ promotores: t.series[0], neutros: t.outros, detratores: t.series[2] }), [t])

  // período filtrado
  const linhas = useMemo(() => filtrar(cubo, f.filtrosCubo, f.meta), [cubo, f.filtrosCubo, f.meta])
  const atual = useMemo(() => partesNps(totais(cubo, linhas, MEDIDAS_NPS)), [cubo, linhas])

  // evolução mensal: meses inteiros que intersectam o período
  const evolucao = useMemo(() => {
    const periodo = { inicio: meses.inicio, fim: meses.fim }
    const s = serieTemporal(cubo, filtrar(cubo, { ...f.filtrosCubo, ...periodo }, f.meta), 'mes', MEDIDAS_NPS, periodo)
    const pontos = s.buckets.map((_, i) => partesNps(Object.fromEntries(MEDIDAS_NPS.map((k) => [k, s.valores[k][i]]))))
    return { buckets: s.buckets, rotulos: s.rotulos, pontos }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cubo, f.filtrosCubo, f.meta, meses.inicio, meses.fim])

  const optionEvolucao = useMemo(() => {
    const validos = evolucao.pontos.map((p) => p.nps).filter((v): v is number => v != null)
    const minimo = validos.length ? Math.floor((Math.min(...validos) - 4) / 5) * 5 : 0
    const maximo = validos.length ? Math.ceil((Math.max(...validos) + 3) / 5) * 5 : 100
    const ultimo = evolucao.pontos.length - 1
    return opcao({
      grid: { left: 8, right: 28, top: 20, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        formatter: (params: { dataIndex: number }[]) => {
          const i = params[0]?.dataIndex
          const p = i == null ? undefined : evolucao.pontos[i]
          if (i == null || !p) return ''
          return tooltipHTML(evolucao.rotulos[i] ?? '', [
            { nome: 'NPS', valor: nps1(p.nps), cor: t.series[0] },
            { nome: 'Promotores', valor: p.respostas ? fmtPct(p.promotores / p.respostas) : '–', separar: true },
            { nome: 'Detratores', valor: p.respostas ? fmtPct(p.detratores / p.respostas) : '–' },
            { nome: 'Respostas', valor: fmtNumero(p.respostas) },
          ])
        },
      },
      xAxis: { type: 'category', data: evolucao.rotulos, boundaryGap: false },
      yAxis: { type: 'value', min: minimo, max: maximo, axisLabel: { formatter: (v: number) => fmtNumero(v, 0) } },
      series: [
        {
          type: 'line',
          name: 'NPS',
          data: evolucao.pontos.map((p) => (p.nps == null ? null : Math.round(p.nps * 10) / 10)),
          itemStyle: { color: t.series[0] },
          lineStyle: { width: 2 },
          showSymbol: true,
          symbolSize: 6,
          // rótulo direto só no último mês
          label: {
            show: true,
            position: 'top',
            distance: 7,
            color: t.texto,
            fontSize: 12,
            fontWeight: 700,
            formatter: (p: { dataIndex: number; value: number | null }) => (p.dataIndex === ultimo && p.value != null ? fmtNumero(p.value, 0) : ''),
          },
          emphasis: { focus: 'none' },
        },
      ],
    })
  }, [evolucao, t])

  const optionComposicao = useMemo(() => {
    const partes: { nome: string; valor: number; cor: string }[] = [
      { nome: 'Promotores', valor: atual.promotores, cor: cores.promotores },
      { nome: 'Neutros', valor: atual.neutros, cor: cores.neutros },
      { nome: 'Detratores', valor: atual.detratores, cor: cores.detratores },
    ]
    return opcao({
      grid: { left: 0, right: 0, top: 0, bottom: 0, containLabel: false },
      tooltip: {
        trigger: 'item',
        formatter: (p: { seriesName: string; color: string; data: { bruto: number } }) =>
          tooltipHTML('Composição do NPS', [
            { nome: p.seriesName, cor: p.color, valor: fmtNumero(p.data.bruto), nota: atual.respostas ? fmtPct(p.data.bruto / atual.respostas) : undefined },
            { nome: 'Respostas', valor: fmtNumero(atual.respostas), separar: true },
          ]),
      },
      xAxis: { type: 'value', max: 1, show: false },
      yAxis: { type: 'category', data: ['Composição'], show: false },
      series: partes.map((p, i) => ({
        type: 'bar',
        name: p.nome,
        stack: 'nps',
        barWidth: 34,
        itemStyle: {
          color: p.cor,
          borderColor: t.superficie,
          borderWidth: 1,
          borderRadius: i === 0 ? [6, 0, 0, 6] : i === partes.length - 1 ? [0, 6, 6, 0] : 0,
        },
        emphasis: { focus: 'none' },
        label: {
          show: atual.respostas > 0 && p.valor / atual.respostas >= 0.07,
          position: 'inside',
          color: '#FFFFFF',
          fontSize: 12,
          fontWeight: 600,
          formatter: () => fmtPct(p.valor / atual.respostas, 0),
        },
        data: [{ value: atual.respostas ? p.valor / atual.respostas : 0, bruto: p.valor }],
      })),
    })
  }, [atual, cores, t])

  // por canal (sem o filtro de canal: o canal filtrado fica em destaque) e por segmento
  const itensCanal: ItemBarra[] = useMemo(() => {
    const grupos = agrupar(cubo, filtrar(cubo, semCanal(f.filtrosCubo), f.meta), [DIM_CANAL], MEDIDAS_NPS)
    return grupos
      .map((g) => {
        const p = partesNps(g.valores)
        const cor = corDaSerie(ordemCanais.indexOf(g.chave[0]), tema)
        return {
          nome: g.chave[0],
          valor: p.nps,
          cor,
          detalhes: [
            { nome: 'NPS', valor: nps1(p.nps), cor },
            { nome: 'Respostas', valor: fmtNumero(p.respostas) },
          ],
        }
      })
      .filter((i) => i.valor != null)
      .sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0))
  }, [cubo, f.filtrosCubo, f.meta, ordemCanais, tema])

  const itensSegmento: ItemBarra[] = useMemo(() => {
    return agrupar(cubo, linhas, ['segmento'], MEDIDAS_NPS)
      .map((g) => {
        const p = partesNps(g.valores)
        return {
          nome: g.chave[0],
          valor: p.nps,
          cor: t.series[0],
          detalhes: [
            { nome: 'NPS', valor: nps1(p.nps), cor: t.series[0] },
            { nome: 'Respostas', valor: fmtNumero(p.respostas) },
          ],
        }
      })
      .filter((i) => i.valor != null)
      .sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0))
  }, [cubo, linhas, t])

  const legenda = [
    { nome: 'Promotores', nota: 'notas 9 e 10', valor: atual.promotores, cor: cores.promotores },
    { nome: 'Neutros', nota: 'notas 7 e 8', valor: atual.neutros, cor: cores.neutros },
    { nome: 'Detratores', nota: 'notas 0 a 6', valor: atual.detratores, cor: cores.detratores },
  ]

  return (
    <Secao id="nps" titulo="NPS e satisfação" descricao="A lealdade declarada pelo cliente depois do atendimento e o que está por trás dela.">
      <div className="grid gap-4 xl:grid-cols-5">
        <ChartCard
          className="xl:col-span-2"
          titulo="Qual é o NPS do período e do que ele é feito?"
          subtitulo={`NPS · ${fmtData(f.periodo.inicio)} a ${fmtData(f.periodo.fim)}`}
          chartRef={refComp}
          nomeArquivo="nps-composicao"
          vazio={atual.respostas <= 0}
          csv={() => ({
            nome: 'nps-composicao',
            colunas: ['NPS', 'Promotores', 'Neutros', 'Detratores', 'Respostas'],
            linhas: [[arred1(atual.nps), Math.round(atual.promotores), Math.round(atual.neutros), Math.round(atual.detratores), Math.round(atual.respostas)]],
          })}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-baseline gap-2">
              <span className="tabular text-6xl font-semibold leading-none tracking-tight">{nps0(atual.nps)}</span>
              <span className="text-sm text-muted-foreground">pontos</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">NPS = % de promotores − % de detratores · {fmtNumero(atual.respostas)} respostas</p>
            <div className="mt-5">
              <EChart ref={refComp} option={optionComposicao} altura={40} descricao="Composição do NPS: promotores, neutros e detratores" />
            </div>
            <ul className="mt-4 grid grid-cols-3 gap-3">
              {legenda.map((l) => (
                <li key={l.nome} className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: l.cor }} aria-hidden />
                    <span className="truncate">{l.nome}</span>
                  </div>
                  <div className="tabular mt-1 text-lg font-semibold leading-none">{atual.respostas ? fmtPct(l.valor / atual.respostas) : '–'}</div>
                  <div className="mt-1 truncate text-[11px] text-muted-foreground">
                    {fmtNumero(l.valor)} · {l.nota}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </ChartCard>

        <ChartCard
          className="xl:col-span-3"
          titulo="Como o NPS evoluiu mês a mês?"
          subtitulo={`Evolução mensal do NPS · meses inteiros que intersectam o período (${fmtMes(meses.primeiro)} a ${fmtMes(meses.ultimo)})`}
          chartRef={refEvo}
          nomeArquivo="nps-evolucao-mensal"
          vazio={!evolucao.buckets.length}
          csv={() => ({
            nome: 'nps-evolucao-mensal',
            colunas: ['Mês', 'NPS', 'Promotores', 'Neutros', 'Detratores', 'Respostas'],
            linhas: evolucao.buckets.map((b, i) => {
              const p = evolucao.pontos[i]
              return [b, arred1(p.nps), Math.round(p.promotores), Math.round(p.neutros), Math.round(p.detratores), Math.round(p.respostas)]
            }),
          })}
        >
          <EChart ref={refEvo} option={optionEvolucao} altura={300} descricao="Evolução mensal do NPS" />
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          titulo="Em quais canais o cliente sai mais satisfeito?"
          subtitulo={`NPS por canal · clique para filtrar${f.canais.length ? ` · em destaque: ${f.canais.join(', ')}` : ''}`}
          chartRef={refCanal}
          nomeArquivo="nps-por-canal"
          vazio={!itensCanal.length}
          csv={() => ({ nome: 'nps-por-canal', colunas: ['Canal', 'NPS'], linhas: itensCanal.map((i) => [i.nome, arred1(i.valor)]) })}
        >
          <BarrasH
            ref={refCanal}
            itens={itensCanal}
            fmt={(v) => fmtNumero(v, 0)}
            selecionados={f.canais}
            aoClicar={alternarCanal}
            rodapeTooltip="Clique para filtrar o relatório por este canal (clique de novo para remover)."
            descricao="NPS por canal de atendimento"
          />
        </ChartCard>
        <ChartCard
          titulo="Quais segmentos de consórcio avaliam melhor o atendimento?"
          subtitulo="NPS por segmento"
          chartRef={refSeg}
          nomeArquivo="nps-por-segmento"
          vazio={!itensSegmento.length}
          csv={() => ({ nome: 'nps-por-segmento', colunas: ['Segmento', 'NPS'], linhas: itensSegmento.map((i) => [i.nome, arred1(i.valor)]) })}
        >
          <BarrasH ref={refSeg} itens={itensSegmento} fmt={(v) => fmtNumero(v, 0)} altura={244} descricao="NPS por segmento" />
        </ChartCard>
      </div>
    </Secao>
  )
}
