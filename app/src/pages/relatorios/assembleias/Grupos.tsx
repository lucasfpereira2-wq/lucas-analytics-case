import { useMemo, useRef, useState } from 'react'
import { ChartCard } from '@/components/dados'
import { EChart, type EChartHandle, type EChartsOption } from '@/components/dados/EChart'
import type { FiltrosResolvidos } from '@/lib/filtros'
import { fmtMes, fmtNumero, fmtPct } from '@/lib/formato'
import { useTema } from '@/lib/tema'
import { corDaSerie, tokensGrafico } from '@/lib/tema-echarts'
import { regionaisAtivas, tip } from '../vendas/comum'
import { TabelaDados, type ColunaTabela } from '../vendas/TabelaDados'

export interface Grupo {
  grupo: string
  segmento: string
  regional: string
  prazo_meses: number
  participantes: number
  ocupacao_pct: number
  lance_medio_pct: number
  contemplados: number
  inicio: string
}

const pontos = (v: number | null | undefined, casas = 1) => fmtPct(v, casas, { fracao: false })

/** Dispersão ocupação × lance médio por grupo e tabela pesquisável; clicar num ponto localiza o grupo na tabela. */
export function LanceMedioPorGrupo({ f, grupos, totalGrupos }: { f: FiltrosResolvidos; grupos: Grupo[]; totalGrupos?: number }) {
  const ref = useRef<EChartHandle>(null)
  const tema = useTema((s) => s.tema)
  const [busca, setBusca] = useState('')

  const lista = useMemo(() => {
    const regs = regionaisAtivas(f.regionais, f.ufs, f.meta)
    return grupos.filter((g) => (!f.segmentos.length || f.segmentos.includes(g.segmento)) && (regs.size === 0 || regs.has(g.regional)))
  }, [grupos, f.segmentos, f.regionais, f.ufs, f.meta])

  const resumo = useMemo(() => {
    const part = lista.reduce((a, g) => a + g.participantes, 0)
    // médias ponderadas pelos participantes (não é média simples de percentuais)
    const lance = part ? lista.reduce((a, g) => a + g.lance_medio_pct * g.participantes, 0) / part : null
    const ocup = part ? lista.reduce((a, g) => a + g.ocupacao_pct * g.participantes, 0) / part : null
    return { part, lance, ocup }
  }, [lista])

  const segmentos = f.meta?.segmentos ?? [...new Set(grupos.map((g) => g.segmento))]

  const option = useMemo<EChartsOption>(() => {
    const t = tokensGrafico(tema)
    const maxPart = Math.max(...lista.map((g) => g.participantes), 1)
    const presentes = segmentos.filter((s) => lista.some((g) => g.segmento === s))
    return {
      legend: { data: presentes },
      grid: { left: 8, right: 28, top: 56, bottom: 28, containLabel: true },
      tooltip: {
        trigger: 'item',
        formatter: (p: unknown) => {
          const g = (p as { data?: { grupo?: Grupo } }).data?.grupo
          if (!g) return ''
          return tip(
            `Grupo ${g.grupo}`,
            [
              { rotulo: 'Segmento', valor: g.segmento, cor: corDaSerie(segmentos.indexOf(g.segmento), tema) },
              { rotulo: 'Regional', valor: g.regional },
              { rotulo: 'Lance médio vencedor', valor: pontos(g.lance_medio_pct), forte: true },
              { rotulo: 'Taxa de ocupação', valor: pontos(g.ocupacao_pct) },
              { rotulo: 'Participantes', valor: fmtNumero(g.participantes) },
              { rotulo: 'Contemplados', valor: `${fmtNumero(g.contemplados)} · ${fmtPct(g.participantes ? g.contemplados / g.participantes : null)}` },
              { rotulo: 'Prazo do grupo', valor: `${fmtNumero(g.prazo_meses)} meses` },
              { rotulo: 'Início', valor: fmtMes(g.inicio) },
            ],
            'Clique para localizar o grupo na tabela.',
          )
        },
      },
      xAxis: {
        type: 'value',
        scale: true,
        name: 'Taxa de ocupação do grupo',
        nameLocation: 'middle',
        nameGap: 28,
        max: 100,
        axisLabel: { formatter: (v: number) => pontos(v, 0) },
        splitLine: { show: false },
      },
      yAxis: { type: 'value', scale: true, name: 'Lance médio vencedor', nameLocation: 'end', nameTextStyle: { align: 'left' }, axisLabel: { formatter: (v: number) => pontos(v, 0) } },
      series: presentes.map((s, k) => ({
        name: s,
        type: 'scatter' as const,
        clip: false,
        itemStyle: { color: corDaSerie(segmentos.indexOf(s), tema), opacity: 0.78, borderColor: t.superficie, borderWidth: 1.5 },
        emphasis: { focus: 'series' as const, itemStyle: { opacity: 1, borderColor: t.texto, borderWidth: 1.5 } },
        symbolSize: (_: unknown, p: unknown) => 6 + 16 * Math.sqrt(((p as { data: { grupo: Grupo } }).data.grupo.participantes) / maxPart),
        data: lista.filter((g) => g.segmento === s).map((g) => ({ value: [g.ocupacao_pct, g.lance_medio_pct], grupo: g })),
        ...(k === 0 && resumo.lance !== null && resumo.ocup !== null
          ? {
              markLine: {
                silent: true,
                symbol: 'none',
                lineStyle: { color: t.textoSecundario, type: [4, 4] as number[], width: 1 },
                label: { color: t.textoSecundario, fontSize: 10 },
                data: [
                  { yAxis: resumo.lance, label: { formatter: `média ${pontos(resumo.lance)}`, position: 'insideStartTop' as const } },
                  { xAxis: resumo.ocup, label: { formatter: `média ${pontos(resumo.ocup)}`, position: 'end' as const } },
                ],
              },
            }
          : {}),
      })),
    }
  }, [lista, resumo, segmentos, tema])

  const colunas = useMemo<ColunaTabela<Grupo>[]>(
    () => [
      { id: 'grupo', titulo: 'Grupo', valor: (g) => g.grupo, celula: (g) => <span className="font-medium">{g.grupo}</span> },
      {
        id: 'segmento',
        titulo: 'Segmento',
        valor: (g) => g.segmento,
        celula: (g) => (
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-sm" style={{ background: corDaSerie(segmentos.indexOf(g.segmento), tema) }} aria-hidden />
            {g.segmento}
          </span>
        ),
      },
      { id: 'regional', titulo: 'Regional', valor: (g) => g.regional },
      { id: 'participantes', titulo: 'Partic.', valor: (g) => g.participantes, alinhar: 'direita', celula: (g) => fmtNumero(g.participantes) },
      { id: 'ocupacao', titulo: 'Ocupação', valor: (g) => g.ocupacao_pct, alinhar: 'direita', celula: (g) => pontos(g.ocupacao_pct) },
      { id: 'lance', titulo: 'Lance médio', valor: (g) => g.lance_medio_pct, alinhar: 'direita', celula: (g) => <span className="font-medium">{pontos(g.lance_medio_pct)}</span> },
    ],
    [segmentos, tema],
  )

  const amostra = totalGrupos && totalGrupos > grupos.length ? `Amostra de ${fmtNumero(grupos.length)} dos ${fmtNumero(totalGrupos)} grupos ativos.` : undefined
  const csv = () => ({
    nome: 'assembleias-grupos',
    colunas: ['Grupo', 'Segmento', 'Regional', 'Participantes', 'Ocupação (%)', 'Lance médio (%)', 'Contemplados', 'Prazo (meses)', 'Início'],
    linhas: lista.map((g) => [g.grupo, g.segmento, g.regional, g.participantes, g.ocupacao_pct, g.lance_medio_pct, g.contemplados, g.prazo_meses, g.inicio]),
  })

  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <ChartCard
        className="xl:col-span-5"
        titulo="Grupos mais cheios exigem lances maiores?"
        subtitulo={`Cada ponto é um grupo: ocupação × lance médio vencedor; o tamanho indica os participantes · ${fmtNumero(lista.length)} grupos`}
        chartRef={ref}
        nomeArquivo="assembleias-lance-por-grupo"
        vazio={lista.length === 0}
        csv={csv}
        rodape={amostra ? `${amostra} Linhas tracejadas: médias ponderadas pelos participantes.` : 'Linhas tracejadas: médias ponderadas pelos participantes.'}
      >
        <EChart
          ref={ref}
          altura={420}
          option={option}
          descricao="Dispersão entre taxa de ocupação e lance médio vencedor por grupo"
          onEvents={{
            click: (p) => {
              const g = (p as { data?: { grupo?: Grupo } }).data?.grupo
              if (g) setBusca(g.grupo)
            },
          }}
        />
      </ChartCard>
      <ChartCard
        className="xl:col-span-7"
        titulo="Quais grupos têm o lance médio mais alto?"
        subtitulo={`Lance médio ponderado de ${pontos(resumo.lance)} e ocupação de ${pontos(resumo.ocup)} nos grupos listados`}
        vazio={lista.length === 0}
        csv={csv}
        rodape={amostra}
      >
        <TabelaDados
          linhas={lista}
          colunas={colunas}
          chave={(g) => g.grupo}
          textoBusca={(g) => `${g.grupo} ${g.segmento} ${g.regional}`}
          placeholderBusca="Buscar grupo, segmento ou regional"
          ordenacaoInicial={{ id: 'lance', desc: true }}
          nomeItens="grupos"
          porPagina={9}
          busca={busca}
          aoBuscar={setBusca}
          destacar={(g) => busca.trim().toUpperCase() === g.grupo}
        />
      </ChartCard>
    </div>
  )
}
