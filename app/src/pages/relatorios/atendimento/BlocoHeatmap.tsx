import { useMemo, useRef, useState } from 'react'
import { ChartCard } from '@/components/dados'
import { EChart, type EChartHandle } from '@/components/dados/EChart'
import { agrupar, filtrar, razao } from '@/lib/cubo'
import type { FiltrosResolvidos } from '@/lib/filtros'
import { fmtCompacto, fmtMes, fmtNumero, fmtPct } from '@/lib/formato'
import type { Cubo } from '@/types/cubo'
import { Alternador } from './Comuns'
import { mesesDoPeriodo, opcao, pctCSV, tooltipHTML, useTokens } from './util'

type Visao = 'volume' | 'abandono'
const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

interface Celula {
  dia: string
  hora: string
  contatos: number
  abandonados: number
}

/** Heatmap hora × dia da semana, com alternador volume / taxa de abandono. O cubo `hora` é mensal. */
export function BlocoHeatmap({ cubo, f }: { cubo: Cubo; f: FiltrosResolvidos }) {
  const ref = useRef<EChartHandle>(null)
  const { t } = useTokens()
  const [visao, setVisao] = useState<Visao>('volume')
  const meses = mesesDoPeriodo(f)

  const { celulas, horas, dias } = useMemo(() => {
    const linhas = filtrar(cubo, f.filtrosCubo, f.meta)
    const grupos = agrupar(cubo, linhas, ['dia_semana', 'hora'], ['contatos', 'abandonados'])
    const celulas: Celula[] = grupos.map((g) => ({ dia: g.chave[0], hora: g.chave[1], contatos: g.valores.contatos, abandonados: g.valores.abandonados }))
    const horas = [...new Set(celulas.map((c) => c.hora))].sort()
    // segunda a domingo, na ordem do calendário brasileiro de trabalho
    const dias = DIAS.filter((d) => celulas.some((c) => c.dia === d))
    return { celulas, horas, dias }
  }, [cubo, f.filtrosCubo, f.meta])

  const valorDe = (c: Celula) => (visao === 'volume' ? c.contatos : (razao(c.abandonados, c.contatos) ?? 0))
  const extremos = useMemo(() => {
    const comVolume = celulas.filter((c) => c.contatos > 0)
    if (!comVolume.length) return null
    const ord = [...comVolume].sort((a, b) => valorDe(b) - valorDe(a))
    return { pico: ord[0], vale: ord[ord.length - 1], min: valorDe(ord[ord.length - 1]), max: valorDe(ord[0]) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celulas, visao])

  const fmt = (v: number) => (visao === 'volume' ? fmtCompacto(v) : fmtPct(v))

  const option = useMemo(
    () =>
      opcao({
        grid: { left: 4, right: 12, top: 6, bottom: 54, containLabel: true },
        tooltip: {
          trigger: 'item',
          formatter: (p: { data: [number, number, number] }) => {
            const hora = horas[p.data[0]]
            const dia = dias[p.data[1]]
            const c = celulas.find((x) => x.dia === dia && x.hora === hora)
            if (!c) return ''
            return tooltipHTML(`${dia}, das ${hora}h às ${String((Number(hora) + 1) % 24).padStart(2, '0')}h`, [
              { nome: 'Contatos', valor: fmtNumero(c.contatos) },
              { nome: 'Abandonados', valor: fmtNumero(c.abandonados) },
              { nome: 'Taxa de abandono', valor: fmtPct(razao(c.abandonados, c.contatos)) },
            ])
          },
        },
        xAxis: {
          type: 'category',
          data: horas.map((h) => `${h}h`),
          splitArea: { show: false },
          axisLine: { show: false },
          axisLabel: { interval: 0, fontSize: 11 },
        },
        yAxis: { type: 'category', data: dias, inverse: true, axisLine: { show: false }, axisLabel: { color: t.texto, fontSize: 12 } },
        visualMap: {
          type: 'continuous',
          min: visao === 'volume' ? 0 : (extremos?.min ?? 0),
          max: extremos?.max ?? 1,
          calculable: false,
          orient: 'horizontal',
          left: 'center',
          bottom: 4,
          itemWidth: 10,
          itemHeight: 220,
          text: [fmt(extremos?.max ?? 0), fmt(visao === 'volume' ? 0 : (extremos?.min ?? 0))],
          inRange: { color: t.sequencial },
          textStyle: { color: t.textoSecundario, fontSize: 11 },
        },
        series: [
          {
            type: 'heatmap',
            name: visao === 'volume' ? 'Contatos' : 'Taxa de abandono',
            data: celulas
              .filter((c) => c.contatos > 0)
              .map((c) => [horas.indexOf(c.hora), dias.indexOf(c.dia), visao === 'volume' ? c.contatos : (razao(c.abandonados, c.contatos) ?? 0)]),
            itemStyle: { borderColor: t.superficie, borderWidth: 2, borderRadius: 4 },
            emphasis: { itemStyle: { borderColor: t.texto, borderWidth: 1 } },
          },
        ],
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [celulas, horas, dias, visao, extremos, t],
  )

  const periodoMeses = meses.primeiro === meses.ultimo ? fmtMes(meses.primeiro) : `${fmtMes(meses.primeiro)} a ${fmtMes(meses.ultimo)}`
  const rotuloCelula = (c: Celula) => `${c.dia.toLowerCase()} às ${c.hora}h`

  return (
    <ChartCard
      titulo={visao === 'volume' ? 'Em que horários a operação precisa estar mais dimensionada?' : 'Em que horários o cliente mais desiste de esperar?'}
      subtitulo={`Perfil de contatos por hora e dia da semana · ${visao === 'volume' ? 'volume de contatos' : 'taxa de abandono'} · base mensal: considera os meses que intersectam o período (${periodoMeses})`}
      chartRef={ref}
      nomeArquivo="perfil-de-contatos-por-hora-e-dia-da-semana"
      vazio={!celulas.length}
      acoes={
        <Alternador
          className="mr-1"
          rotulo="Métrica do heatmap"
          valor={visao}
          aoMudar={setVisao}
          opcoes={[
            { id: 'volume', rotulo: 'Volume' },
            { id: 'abandono', rotulo: 'Taxa de abandono' },
          ]}
        />
      }
      csv={() => ({
        nome: 'perfil-de-contatos-por-hora-e-dia-da-semana',
        colunas: ['Dia da semana', 'Hora', 'Contatos', 'Abandonados', 'Taxa de abandono (%)'],
        linhas: dias.flatMap((d) =>
          horas.map((h) => {
            const c = celulas.find((x) => x.dia === d && x.hora === h)
            return [d, `${h}h`, Math.round(c?.contatos ?? 0), Math.round(c?.abandonados ?? 0), pctCSV(razao(c?.abandonados, c?.contatos))]
          }),
        ),
      })}
      rodape={
        extremos ? (
          <span>
            <strong className="font-semibold text-foreground">{visao === 'volume' ? 'Pico' : 'Maior abandono'}:</strong> {rotuloCelula(extremos.pico)} ({fmt(extremos.max)}
            {visao === 'volume' ? ' contatos' : ''}). <strong className="font-semibold text-foreground">{visao === 'volume' ? 'Menor movimento' : 'Menor abandono'}:</strong>{' '}
            {rotuloCelula(extremos.vale)} ({fmt(extremos.min)}
            {visao === 'volume' ? ' contatos' : ''}).
          </span>
        ) : undefined
      }
    >
      <EChart ref={ref} option={option} altura={330} descricao="Perfil de contatos por hora e dia da semana" />
    </ChartCard>
  )
}
