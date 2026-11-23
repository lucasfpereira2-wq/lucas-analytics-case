import { useMemo, useRef, useState } from 'react'
import { ChartCard } from '@/components/dados'
import { EChart, type EChartHandle } from '@/components/dados/EChart'
import { agrupar, filtrar, ordenarPor, razao, serieTemporalPor } from '@/lib/cubo'
import type { FiltrosResolvidos } from '@/lib/filtros'
import { fmtCompacto, fmtNumero, fmtPct } from '@/lib/formato'
import { corDaSerie } from '@/lib/tema-echarts'
import type { Cubo } from '@/types/cubo'
import { cn } from '@/lib/utils'
import { BarrasH, ChipFiltro, Secao, type ItemBarra } from './Comuns'
import { DIM_CANAL, fmtEixo, fmtMMSS, opcao, pctCSV, tooltipHTML, useTokens, type LinhaTooltip } from './util'

interface LinhaMotivo {
  motivo: string
  contatos: number
  participacao: number
  acumulado: number
  tma: number | null
  fcr: number | null
}

const NOME_G = { mes: 'mês', semana: 'semana', dia: 'dia' } as const

/** Pareto de motivos de contato + tabela (volume, participação, TMA, FCR) + detalhes filtrados pelo motivo clicado. */
export function BlocoMotivos({ cubo, f }: { cubo: Cubo; f: FiltrosResolvidos }) {
  const refPareto = useRef<EChartHandle>(null)
  const refEvolucao = useRef<EChartHandle>(null)
  const refCanal = useRef<EChartHandle>(null)
  const { tema, t } = useTokens()
  const [motivoSel, setMotivoSel] = useState<string | null>(null)
  const ordemCanais = useMemo(() => cubo.dims.find((d) => d.nome === DIM_CANAL)?.valores ?? [], [cubo])

  // ~140 mil linhas: uma varredura por mudança de filtro global
  const linhas = useMemo(() => filtrar(cubo, f.filtrosCubo, f.meta), [cubo, f.filtrosCubo, f.meta])

  const tabela: LinhaMotivo[] = useMemo(() => {
    const grupos = ordenarPor(agrupar(cubo, linhas, ['motivo'], ['contatos', 'soma_tma_seg', 'resolvidos_fcr']), 'contatos')
    const total = grupos.reduce((s, g) => s + g.valores.contatos, 0)
    let acc = 0
    return grupos
      .filter((g) => g.valores.contatos > 0)
      .map((g) => {
        acc += g.valores.contatos
        return {
          motivo: g.chave[0],
          contatos: g.valores.contatos,
          participacao: total ? g.valores.contatos / total : 0,
          acumulado: total ? acc / total : 0,
          tma: razao(g.valores.soma_tma_seg, g.valores.contatos),
          fcr: razao(g.valores.resolvidos_fcr, g.valores.contatos),
        }
      })
  }, [cubo, linhas])

  const selecionado = motivoSel && tabela.some((l) => l.motivo === motivoSel) ? motivoSel : null
  const alternarMotivo = (m: string) => setMotivoSel((atual) => (atual === m ? null : m))

  // detalhe: mesmo filtro global + motivo clicado (filtro local)
  const linhasDetalhe = useMemo(
    () => (selecionado ? filtrar(cubo, { ...f.filtrosCubo, dims: { ...f.filtrosCubo.dims, motivo: [selecionado] } }, f.meta) : linhas),
    [cubo, f.filtrosCubo, f.meta, selecionado, linhas],
  )
  const evolucao = useMemo(
    () => serieTemporalPor(cubo, linhasDetalhe, f.granularidade, DIM_CANAL, 'contatos', f.periodo),
    [cubo, linhasDetalhe, f.granularidade, f.periodo],
  )
  const porCanal: ItemBarra[] = useMemo(
    () =>
      agrupar(cubo, linhasDetalhe, [DIM_CANAL], ['contatos', 'soma_tma_seg', 'resolvidos_fcr'])
        .filter((g) => g.valores.contatos > 0)
        .map((g) => {
          const cor = corDaSerie(ordemCanais.indexOf(g.chave[0]), tema)
          const fcr = razao(g.valores.resolvidos_fcr, g.valores.contatos)
          return {
            nome: g.chave[0],
            valor: fcr,
            cor,
            detalhes: [
              { nome: 'Resolução no 1º contato', valor: fmtPct(fcr), cor },
              { nome: 'Tempo médio', valor: fmtMMSS(razao(g.valores.soma_tma_seg, g.valores.contatos)) },
              { nome: 'Contatos', valor: fmtNumero(g.valores.contatos) },
            ],
          }
        })
        .sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0)),
    [cubo, linhasDetalhe, ordemCanais, tema],
  )

  const top3 = tabela.slice(0, 3).reduce((s, l) => s + l.participacao, 0)

  const optionPareto = useMemo(
    () =>
      opcao({
        legend: { top: 0, left: 0, selectedMode: true },
        grid: { left: 28, right: 16, top: 40, bottom: 4, containLabel: true },
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          formatter: (params: { dataIndex: number }[]) => {
            const l = tabela[params[0]?.dataIndex]
            if (!l) return ''
            const ls: LinhaTooltip[] = [
              { nome: 'Contatos', valor: fmtNumero(l.contatos), cor: t.series[0] },
              { nome: 'Participação', valor: fmtPct(l.participacao) },
              { nome: 'Acumulado', valor: fmtPct(l.acumulado), cor: t.series[1] },
              { nome: 'Tempo médio (TMA)', valor: fmtMMSS(l.tma), separar: true },
              { nome: 'Resolução no 1º contato', valor: fmtPct(l.fcr) },
            ]
            return tooltipHTML(l.motivo, ls, 'Clique para filtrar os gráficos de detalhe por este motivo.')
          },
        },
        xAxis: {
          type: 'category',
          data: tabela.map((l) => l.motivo),
          axisLabel: { interval: 0, rotate: 32, fontSize: 11, hideOverlap: false, margin: 12 },
        },
        yAxis: { type: 'value', max: 1, axisLabel: { formatter: (v: number) => fmtPct(v, 0) } },
        series: [
          {
            type: 'bar',
            name: 'Participação no volume',
            cursor: 'pointer',
            barMaxWidth: 46,
            barCategoryGap: '30%',
            itemStyle: { color: t.series[0] },
            data: tabela.map((l, i) => ({
              value: l.participacao,
              itemStyle: { opacity: selecionado && selecionado !== l.motivo ? 0.28 : 1 },
              // o primeiro ponto da linha acumulada coincide com o topo da primeira barra: afasta o rótulo
              label: i === 0 ? { offset: [-12, -8] } : undefined,
            })),
            label: {
              show: true,
              position: 'top',
              color: t.texto,
              fontSize: 11,
              fontWeight: 600,
              formatter: (p: { value: number }) => fmtPct(p.value, 1),
            },
          },
          {
            type: 'line',
            name: 'Participação acumulada',
            data: tabela.map((l) => l.acumulado),
            itemStyle: { color: t.series[1] },
            lineStyle: { width: 2 },
            showSymbol: true,
            symbolSize: 7,
            z: 5,
            markLine: {
              silent: true,
              symbol: 'none',
              lineStyle: { color: t.textoSecundario, type: 'dashed', width: 1 },
              label: { formatter: '80% do volume', position: 'insideStartTop', color: t.textoSecundario, fontSize: 11 },
              data: [{ yAxis: 0.8 }],
            },
          },
        ],
      }),
    [tabela, selecionado, t],
  )

  const optionEvolucao = useMemo(() => {
    const denso = evolucao.buckets.length > 45
    return opcao({
      legend: { top: 0, left: 0 },
      grid: { left: 8, right: 16, top: 40, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: { dataIndex: number; seriesName: string; value: number; color: string }[]) => {
          if (!params.length) return ''
          const total = params.reduce((s, p) => s + (p.value ?? 0), 0)
          const ls: LinhaTooltip[] = params.map((p) => ({ nome: p.seriesName, cor: p.color, valor: fmtNumero(p.value), nota: total ? fmtPct(p.value / total, 0) : undefined }))
          ls.push({ nome: 'Total', valor: fmtNumero(total), separar: true })
          return tooltipHTML(evolucao.rotulos[params[0].dataIndex] ?? '', ls)
        },
      },
      xAxis: { type: 'category', data: evolucao.rotulos },
      yAxis: { type: 'value', axisLabel: { formatter: (v: number) => fmtEixo(v) } },
      series: evolucao.series.map((s) => ({
        type: 'bar',
        name: s.nome,
        stack: 'canais',
        barMaxWidth: 36,
        barCategoryGap: denso ? '18%' : '32%',
        itemStyle: { color: corDaSerie(ordemCanais.indexOf(s.nome), tema), borderRadius: 0, borderColor: t.superficie, borderWidth: denso ? 0 : 1 },
        emphasis: { focus: 'none' },
        data: s.valores,
      })),
    })
  }, [evolucao, ordemCanais, tema, t])

  const alvo = selecionado ? `"${selecionado}"` : 'todos os motivos'

  return (
    <Secao
      id="motivos"
      titulo="Motivos de contato"
      descricao="O que leva o cliente a procurar o atendimento, quanto tempo consome e quanto se resolve na primeira vez."
      acoes={selecionado ? <ChipFiltro rotulo={`Motivo: ${selecionado}`} aoRemover={() => setMotivoSel(null)} /> : undefined}
    >
      <div className="grid gap-4 xl:grid-cols-5">
        <ChartCard
          className="xl:col-span-3"
          titulo="Quais motivos concentram a demanda do atendimento?"
          subtitulo={`Pareto dos motivos de contato · os 3 principais somam ${fmtPct(top3, 0)} do volume`}
          chartRef={refPareto}
          nomeArquivo="pareto-motivos-de-contato"
          vazio={!tabela.length}
          csv={() => ({
            nome: 'motivos-de-contato',
            colunas: ['Motivo', 'Contatos', 'Participação (%)', 'Acumulado (%)', 'TMA (s)', 'Resolução no primeiro contato (%)'],
            linhas: tabela.map((l) => [l.motivo, Math.round(l.contatos), pctCSV(l.participacao), pctCSV(l.acumulado), l.tma == null ? '' : Math.round(l.tma), pctCSV(l.fcr)]),
          })}
        >
          <EChart
            ref={refPareto}
            option={optionPareto}
            altura={475}
            descricao="Pareto dos motivos de contato: participação por motivo e participação acumulada"
            onEvents={{ click: (p) => alternarMotivo((p as { name: string }).name) }}
          />
        </ChartCard>

        <ChartCard
          className="xl:col-span-2"
          titulo="Quanto custa e quanto resolve cada motivo?"
          subtitulo="Volume, participação, TMA e resolução no primeiro contato · clique numa linha para filtrar"
          vazio={!tabela.length}
          csv={() => ({
            nome: 'motivos-de-contato-indicadores',
            colunas: ['Motivo', 'Contatos', 'Participação (%)', 'TMA (s)', 'Resolução no primeiro contato (%)'],
            linhas: tabela.map((l) => [l.motivo, Math.round(l.contatos), pctCSV(l.participacao), l.tma == null ? '' : Math.round(l.tma), pctCSV(l.fcr)]),
          })}
          rodape="Por motivo, TMA e resolução dividem pelo total de contatos (abandonos contam com tempo zero e sem resolução)."
        >
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[420px] border-separate border-spacing-0 text-[13px]">
              <thead>
                <tr className="text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 pb-2 font-medium">Motivo</th>
                  <th className="px-2 pb-2 text-right font-medium">Volume</th>
                  <th className="px-2 pb-2 text-right font-medium">Part.</th>
                  <th className="px-2 pb-2 text-right font-medium">TMA</th>
                  <th className="px-2 pb-2 text-right font-medium">FCR</th>
                </tr>
              </thead>
              <tbody>
                {tabela.map((l) => {
                  const ativo = selecionado === l.motivo
                  return (
                    <tr
                      key={l.motivo}
                      onClick={() => alternarMotivo(l.motivo)}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), alternarMotivo(l.motivo))}
                      tabIndex={0}
                      aria-selected={ativo}
                      className={cn(
                        'cursor-pointer outline-none transition-colors hover:bg-muted/70 focus-visible:bg-muted/70',
                        ativo && 'bg-primary/10 hover:bg-primary/15',
                        selecionado && !ativo && 'text-muted-foreground',
                      )}
                    >
                      <td className="rounded-l-lg border-t border-border/60 px-2 py-[7px]">
                        <div className="font-medium leading-tight">{l.motivo}</div>
                        <div className="mt-1 h-1 w-full max-w-40 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-serie-1" style={{ width: `${Math.max(2, (l.participacao / (tabela[0]?.participacao || 1)) * 100)}%`, opacity: selecionado && !ativo ? 0.35 : 1 }} />
                        </div>
                      </td>
                      <td className="tabular whitespace-nowrap border-t border-border/60 px-2 py-[7px] text-right">{fmtCompacto(l.contatos)}</td>
                      <td className="tabular border-t border-border/60 px-2 py-[7px] text-right">{fmtPct(l.participacao)}</td>
                      <td className="tabular border-t border-border/60 px-2 py-[7px] text-right">{fmtMMSS(l.tma)}</td>
                      <td className="tabular rounded-r-lg border-t border-border/60 px-2 py-[7px] text-right">{fmtPct(l.fcr)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <ChartCard
          className="xl:col-span-3"
          titulo={selecionado ? `Como evolui a demanda por "${selecionado}"?` : 'Como evolui a demanda, somando todos os motivos?'}
          subtitulo={`Contatos de ${alvo} por canal, por ${NOME_G[f.granularidade]}${selecionado ? '' : ' · clique num motivo acima para detalhar'}`}
          chartRef={refEvolucao}
          nomeArquivo="evolucao-do-motivo-por-canal"
          vazio={!evolucao.series.length}
          csv={() => ({
            nome: 'evolucao-do-motivo-por-canal',
            colunas: ['Período', ...evolucao.series.map((s) => s.nome)],
            linhas: evolucao.buckets.map((b, i) => [b, ...evolucao.series.map((s) => Math.round(s.valores[i]))]),
          })}
        >
          <EChart ref={refEvolucao} option={optionEvolucao} altura={280} descricao={`Evolução dos contatos de ${alvo} por canal`} />
        </ChartCard>
        <ChartCard
          className="xl:col-span-2"
          titulo={selecionado ? `Em que canal "${selecionado}" se resolve na primeira vez?` : 'Em que canal os motivos se resolvem na primeira vez?'}
          subtitulo={`Resolução no primeiro contato por canal · ${alvo}`}
          chartRef={refCanal}
          nomeArquivo="resolucao-do-motivo-por-canal"
          vazio={!porCanal.length}
          csv={() => ({
            nome: 'resolucao-do-motivo-por-canal',
            colunas: ['Canal', 'Resolução no primeiro contato (%)'],
            linhas: porCanal.map((i) => [i.nome, pctCSV(i.valor)]),
          })}
        >
          <BarrasH ref={refCanal} itens={porCanal} fmt={(v) => fmtPct(v)} altura={280} descricao={`Resolução no primeiro contato por canal para ${alvo}`} />
        </ChartCard>
      </div>
    </Secao>
  )
}
