import { useMemo, useRef, type ReactNode } from 'react'
import { ChartCard } from '@/components/dados'
import { EChart, type EChartHandle, type EChartsOption } from '@/components/dados/EChart'
import { fmtMes, fmtNumero, fmtPct } from '@/lib/formato'
import { useTema } from '@/lib/tema'
import { tokensGrafico } from '@/lib/tema-echarts'
import { rampaDeLinhas } from '../carteira/cores'
import { LegendaEscala } from '../carteira/ui'
import { denominador, numerador, parcial, ROTULO_INDICADOR, taxa, taxaAgregada, type Denominador, type Indicador, type ModeloSafras } from './dados'

const NOME_MEDIA = 'Média das safras'

/** Curvas de safra: % do indicador por MOB, uma linha por safra mensal. */
export function CurvasSafra({
  modelo,
  indicador,
  den,
  selecionadas,
  controles,
}: {
  modelo: ModeloSafras
  indicador: Indicador
  den: Denominador
  /** safras em comparação; vazio = todas (escala sequencial) */
  selecionadas: string[]
  controles: ReactNode
}) {
  const ref = useRef<EChartHandle>(null)
  const tema = useTema((s) => s.tema)
  const { safras, mobs } = modelo
  const sel = useMemo(() => selecionadas.filter((s) => safras.includes(s)), [selecionadas, safras])
  const categorico = sel.length > 0 && sel.length <= 6

  const option = useMemo<EChartsOption>(() => {
    const t = tokensGrafico(tema)
    const rampa = rampaDeLinhas(safras.length, tema)
    const emFoco = new Set(sel.length ? sel : safras)
    const cinza = tema === 'escuro' ? '#2A4A68' : '#D3DCE5'
    const cor = (s: string) => {
      if (!emFoco.has(s)) return cinza
      if (categorico) return t.series[sel.indexOf(s)]
      return rampa[safras.indexOf(s)]
    }
    const media = mobs.map((m) => {
      const a = taxaAgregada(modelo, m, indicador, den)
      return a.n >= 3 && a.taxa != null ? +(a.taxa * 100).toFixed(3) : null
    })
    const ordem = [...safras].sort((a, b) => Number(emFoco.has(a)) - Number(emFoco.has(b)))
    return {
      legend: categorico ? { data: [...sel.map((s) => fmtMes(s)), NOME_MEDIA] } : { data: [NOME_MEDIA] },
      grid: { left: 8, right: 20, top: 40, bottom: 26, containLabel: true },
      tooltip: {
        trigger: 'axis',
        formatter: (params: unknown) => {
          const lista = params as { dataIndex: number }[]
          const mob = mobs[lista[0]?.dataIndex ?? 0]
          const linhas = safras
            .filter((s) => emFoco.has(s))
            .map((s) => ({ s, c: modelo.celula(s, mob), v: taxa(modelo.celula(s, mob), indicador, den) }))
            .filter((x) => x.v != null)
            .sort((a, b) => (b.v as number) - (a.v as number))
          const limite = 12
          const med = taxaAgregada(modelo, mob, indicador, den)
          const html = linhas
            .slice(0, limite)
            .map(
              ({ s, c, v }) => `<div style="display:flex;justify-content:space-between;gap:18px;line-height:1.65">
                <span style="opacity:.9"><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${cor(s)};margin-right:6px"></span>${fmtMes(s)}${parcial(modelo, s, mob) ? ' <span style="opacity:.6">(parcial)</span>' : ''}</span>
                <span style="font-variant-numeric:tabular-nums"><strong>${fmtPct(v, 2)}</strong> <span style="opacity:.6">${c ? `${fmtNumero(numerador(c, indicador))} de ${fmtNumero(denominador(c, indicador, den))}` : ''}</span></span></div>`,
            )
            .join('')
          return `<div style="min-width:250px"><div style="font-weight:600">MOB ${mob} · ${ROTULO_INDICADOR[indicador]}</div>
            <div style="opacity:.65;font-size:11px;margin-bottom:6px">${mob} ${mob === 1 ? 'mês' : 'meses'} depois da venda · % sobre ${den === 'base' ? 'cotas da safra' : 'cotas ativas'}</div>
            ${html || '<div style="opacity:.7">Nenhuma safra em comparação chegou a este MOB.</div>'}
            ${linhas.length > limite ? `<div style="opacity:.6;font-size:11px;margin-top:2px">e mais ${linhas.length - limite} safras</div>` : ''}
            <div style="display:flex;justify-content:space-between;gap:18px;margin-top:5px;padding-top:5px;border-top:1px solid rgba(128,150,170,.3)"><span style="opacity:.8">Média de ${med.n} safras</span><strong>${fmtPct(med.taxa, 2)}</strong></div></div>`
        },
      },
      xAxis: { type: 'category', data: mobs.map(String), boundaryGap: false, name: 'MOB (meses desde a venda)', nameLocation: 'middle', nameGap: 28, nameTextStyle: { color: t.textoSecundario, fontSize: 11 } },
      yAxis: { type: 'value', axisLabel: { formatter: (v: number) => fmtPct(v, v % 1 ? 1 : 0, { fracao: false }) } },
      series: [
        ...ordem.map((s) => {
          const foco = emFoco.has(s)
          return {
            type: 'line' as const, name: fmtMes(s), color: cor(s), z: foco ? 3 : 1,
            data: mobs.map((m) => { const v = taxa(modelo.celula(s, m), indicador, den); return v == null ? null : +(v * 100).toFixed(3) }),
            lineStyle: { width: !foco ? 1 : categorico ? 2.5 : 1.75, color: cor(s) }, itemStyle: { color: cor(s) },
            showSymbol: false, symbolSize: 6, connectNulls: false, silent: !foco,
            emphasis: { focus: 'series' as const, lineStyle: { width: 3 } },
          }
        }),
        { type: 'line', name: NOME_MEDIA, data: media, color: t.textoSecundario, z: 4, showSymbol: false, lineStyle: { width: 1.5, type: [4, 4], color: t.textoSecundario }, emphasis: { disabled: true } },
      ],
    }
  }, [modelo, safras, mobs, indicador, den, sel, categorico, tema])

  const rampa = rampaDeLinhas(Math.max(2, safras.length), tema)
  return (
    <ChartCard
      titulo="Como cada safra envelhece?"
      subtitulo={`${ROTULO_INDICADOR[indicador]} por MOB, em % das ${den === 'base' ? 'cotas vendidas na safra' : 'cotas ainda ativas'}. Uma linha por safra mensal; curvas mais altas e inclinadas indicam safras de pior qualidade.`}
      chartRef={ref}
      nomeArquivo={`safra-curvas-${indicador}`}
      vazio={!safras.length}
      mensagemVazio="Nenhuma safra vendida no período selecionado."
      csv={() => ({
        nome: `safra-curvas-${indicador}`,
        colunas: ['Safra', 'MOB', `${ROTULO_INDICADOR[indicador]} (%)`, 'Cotas no indicador', den === 'base' ? 'Cotas da safra' : 'Cotas ativas', 'MOB parcial'],
        linhas: safras.flatMap((s) =>
          mobs.flatMap((m) => {
            const c = modelo.celula(s, m)
            const v = taxa(c, indicador, den)
            return c && v != null ? [[s, m, +(v * 100).toFixed(3), Math.round(numerador(c, indicador)), Math.round(denominador(c, indicador, den)), parcial(modelo, s, m) ? 'sim' : 'não']] : []
          }),
        ),
      })}
      rodape={
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
          <span>
            {sel.length === 0
              ? `${safras.length} safras, da mais antiga (clara) à mais recente (escura).`
              : categorico
                ? `${sel.length} ${sel.length === 1 ? 'safra em destaque' : 'safras em destaque'}; as demais ficam em cinza.`
                : `${sel.length} safras em comparação (da mais antiga à mais recente); as demais ficam em cinza.`}{' '}
            O último ponto de cada curva é parcial.
          </span>
          {!categorico && <LegendaEscala className="ml-auto" cores={rampa} minimo={fmtMes(safras[0])} maximo={fmtMes(safras[safras.length - 1])} />}
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">{controles}</div>
      <EChart ref={ref} altura={400} option={option} descricao={`Curvas de ${ROTULO_INDICADOR[indicador]} por MOB para cada safra`} />
    </ChartCard>
  )
}
