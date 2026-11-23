import { ArrowDownRight, HeartPulse, XCircle } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChartCard } from '@/components/dados'
import { EChart, type EChartHandle, type EChartsOption } from '@/components/dados/EChart'
import { agrupar, filtrar, type FiltrosCubo, type MetaCubo } from '@/lib/cubo'
import { fmtMes, fmtNumero, fmtPct } from '@/lib/formato'
import { useTema } from '@/lib/tema'
import { tokensGrafico } from '@/lib/tema-echarts'
import type { Cubo } from '@/types/cubo'
import { corNaRampa, textoSobre } from './cores'
import { Alternador, LegendaEscala } from './ui'

type Base = 'cotas' | 'saldo'

/** Roll rate: de onde saíram e para onde foram as cotas entre dois fins de mês. Cada linha soma 100%. */
export function RollRate({ cubo, filtrosBase, meta, periodo }: { cubo: Cubo; filtrosBase: FiltrosCubo; meta: MetaCubo | null; periodo: { inicio: string; fim: string } }) {
  const ref = useRef<EChartHandle>(null)
  const tema = useTema((s) => s.tema)
  const [base, setBase] = useState<Base>('cotas')

  // meses fechados com transição no cubo (o mês parcial não entra)
  const meses = useMemo(() => {
    const dMes = cubo.dims.find((d) => d.nome === 'mes')
    const presentes = new Set<string>()
    for (const i of cubo.colunas.mes) presentes.add(dMes?.valores[i] ?? '')
    return [...presentes].filter(Boolean).sort()
  }, [cubo])
  const noPeriodo = useMemo(() => meses.filter((m) => m >= periodo.inicio.slice(0, 7) && m <= periodo.fim.slice(0, 7)), [meses, periodo.inicio, periodo.fim])
  const padrao = noPeriodo[noPeriodo.length - 1] ?? meses[meses.length - 1] ?? ''
  const [mes, setMes] = useState(padrao)
  useEffect(() => setMes(padrao), [padrao])

  const origens = cubo.dims.find((d) => d.nome === 'faixa_origem')?.valores ?? []
  const destinos = cubo.dims.find((d) => d.nome === 'faixa_destino')?.valores ?? []

  const matriz = useMemo(() => {
    const linhas = filtrar(cubo, { ...filtrosBase, inicio: `${mes}-01`, fim: `${mes}-28` }, meta)
    const m = new Map<string, number>()
    const totalOrigem = new Map<string, number>()
    for (const g of agrupar(cubo, linhas, ['faixa_origem', 'faixa_destino'], [base])) {
      m.set(`${g.chave[0]}|${g.chave[1]}`, g.valores[base])
      totalOrigem.set(g.chave[0], (totalOrigem.get(g.chave[0]) ?? 0) + g.valores[base])
    }
    const pct = (o: string, d: string) => {
      const t = totalOrigem.get(o) ?? 0
      return t > 0 ? (m.get(`${o}|${d}`) ?? 0) / t : null
    }
    // indicadores-síntese
    let atrasadas = 0
    let curadas = 0
    let pioraram = 0
    let canceladas = 0
    let total = 0
    for (const o of origens) {
      const io = origens.indexOf(o)
      for (const d of destinos) {
        const v = m.get(`${o}|${d}`) ?? 0
        total += v
        if (d === 'Cancelada') canceladas += v
        else if (destinos.indexOf(d) > io) pioraram += v
        if (o !== 'Em dia') {
          atrasadas += v
          if (d === 'Em dia') curadas += v
        }
      }
    }
    return { valor: (o: string, d: string) => m.get(`${o}|${d}`) ?? 0, pct, totalOrigem, cura: atrasadas ? curadas / atrasadas : null, piora: total ? pioraram / total : null, cancel: total ? canceladas / total : null, total }
  }, [cubo, filtrosBase, meta, mes, base, origens, destinos])

  const option = useMemo<EChartsOption>(() => {
    const t = tokensGrafico(tema)
    const dados: { value: number[]; itemStyle: Record<string, unknown>; label: Record<string, unknown> }[] = []
    origens.forEach((o, io) => {
      destinos.forEach((d, id) => {
        const p = matriz.pct(o, d)
        if (p == null) return
        const cor = corNaRampa(Math.sqrt(p), t.sequencial)
        const piora = d !== 'Cancelada' && id === io + 1
        const cura = o !== 'Em dia' && d === 'Em dia'
        dados.push({
          value: [id, io, +(p * 100).toFixed(2), Math.sqrt(p)],
          itemStyle: { ...(piora ? { borderColor: t.texto, borderWidth: 2 } : cura ? { borderColor: t.destaque, borderWidth: 2, borderType: 'dashed' } : {}) },
          label: { color: textoSobre(cor), fontWeight: piora || cura ? 700 : 500 },
        })
      })
    })
    return {
      grid: { left: 8, right: 12, top: 34, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'item',
        formatter: (p: unknown) => {
          const v = (p as { value: [number, number, number] }).value
          const o = origens[v[1]]
          const d = destinos[v[0]]
          const tipo = d === 'Cancelada' ? 'Cancelamento' : v[0] === v[1] ? 'Permanência na faixa' : v[0] > v[1] ? 'Piora (rolagem)' : d === 'Em dia' ? 'Cura' : 'Melhora parcial'
          return `<div style="min-width:210px"><div style="font-weight:600">${o} → ${d}</div><div style="opacity:.65;font-size:11px;margin-bottom:6px">${tipo} · ${fmtMes(mes)}</div>
            <div style="display:flex;justify-content:space-between;gap:20px;line-height:1.7"><span style="opacity:.8">% da faixa de origem</span><strong>${fmtPct(v[2], 1, { fracao: false })}</strong></div>
            <div style="display:flex;justify-content:space-between;gap:20px;line-height:1.7"><span style="opacity:.8">${base === 'cotas' ? 'Cotas' : 'Saldo (R$)'}</span><strong>${fmtNumero(matriz.valor(o, d))}</strong></div>
            <div style="display:flex;justify-content:space-between;gap:20px;line-height:1.7"><span style="opacity:.8">Total na origem</span><strong>${fmtNumero(matriz.totalOrigem.get(o) ?? 0)}</strong></div></div>`
        },
      },
      xAxis: { type: 'category', position: 'top', data: destinos, name: 'Faixa de destino (fim do mês)', nameLocation: 'middle', nameGap: 26, nameTextStyle: { color: t.textoSecundario, fontSize: 11 }, axisLine: { show: false }, axisLabel: { color: t.texto, fontSize: 12, interval: 0 }, splitArea: { show: false } },
      yAxis: { type: 'category', inverse: true, data: origens, axisLine: { show: false }, axisLabel: { color: t.texto, fontSize: 12 } },
      // escala em raiz quadrada: realça as transições pequenas (a permanência costuma passar de 80%)
      visualMap: { show: false, min: 0, max: 1, dimension: 3, inRange: { color: t.sequencial } },
      series: [
        {
          type: 'heatmap', name: 'Roll rate', data: dados,
          label: { show: true, fontSize: 12, formatter: (p: { value: unknown }) => fmtPct((p.value as number[])[2], 1, { fracao: false }) },
          itemStyle: { borderColor: t.superficie, borderWidth: 3, borderRadius: 6 },
          emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,23,43,.25)' } },
        },
      ],
    }
  }, [matriz, origens, destinos, tema, mes, base])

  const t = tokensGrafico(tema)
  return (
    <ChartCard
      titulo="Para onde rolaram as cotas de cada faixa?"
      subtitulo={`Roll rate de ${fmtMes(mes)}: posição no fim do mês anterior (linhas) × posição no fim do mês (colunas). Cada linha soma 100%.`}
      chartRef={ref}
      nomeArquivo={`carteira-roll-rate-${mes}`}
      vazio={!meses.length || matriz.total === 0}
      acoes={
        <div className="mr-1 flex flex-wrap items-center justify-end gap-2">
          <Alternador rotulo="Base do cálculo" valor={base} onChange={setBase} opcoes={[{ id: 'cotas', rotulo: 'Cotas' }, { id: 'saldo', rotulo: 'Saldo' }]} />
          <label className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card pl-2.5 pr-1 text-xs">
            <span className="text-muted-foreground">Mês</span>
            <select value={mes} onChange={(e) => setMes(e.target.value)} className="h-full cursor-pointer rounded-md bg-transparent pr-1 text-xs font-medium text-foreground outline-none" aria-label="Mês do roll rate">
              {[...meses].reverse().map((m) => (
                <option key={m} value={m} className="bg-card text-foreground">
                  {fmtMes(m)}
                  {noPeriodo.includes(m) ? '' : ' (fora do período)'}
                </option>
              ))}
            </select>
          </label>
        </div>
      }
      csv={() => ({
        nome: `carteira-roll-rate-${mes}`,
        colunas: ['Faixa de origem', ...destinos.map((d) => `${d} (%)`), base === 'cotas' ? 'Cotas na origem' : 'Saldo na origem (R$)'],
        linhas: origens.map((o) => [o, ...destinos.map((d) => { const p = matriz.pct(o, d); return p == null ? '' : +(p * 100).toFixed(2) }), Math.round(matriz.totalOrigem.get(o) ?? 0)]),
      })}
      rodape={
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded-[4px] border-2" style={{ borderColor: t.texto }} aria-hidden /> Piora: rolagem para a faixa seguinte
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded-[4px] border-2 border-dashed" style={{ borderColor: t.destaque }} aria-hidden /> Cura: volta para "Em dia"
          </span>
          <LegendaEscala className="ml-auto" cores={t.sequencial} minimo="0%" maximo="100%" />
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <EChart ref={ref} altura={330} option={option} descricao="Matriz de roll rate por faixa de origem e destino" />
        <div className="grid grid-cols-3 gap-3 self-center lg:grid-cols-1">
          <Sintese icone={HeartPulse} rotulo="Taxa de cura" valor={fmtPct(matriz.cura)} detalhe="das cotas em atraso voltaram para em dia" />
          <Sintese icone={ArrowDownRight} rotulo="Piora de faixa" valor={fmtPct(matriz.piora)} detalhe={`${base === 'cotas' ? 'das cotas' : 'do saldo'} migraram para faixa pior`} />
          <Sintese icone={XCircle} rotulo="Cancelamento" valor={fmtPct(matriz.cancel, 2)} detalhe={`${base === 'cotas' ? 'das cotas' : 'do saldo'} terminaram o mês canceladas`} />
        </div>
      </div>
    </ChartCard>
  )
}

function Sintese({ icone: Icone, rotulo, valor, detalhe }: { icone: typeof HeartPulse; rotulo: string; valor: string; detalhe: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 px-3.5 py-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icone className="size-3.5 text-primary" aria-hidden />
        {rotulo}
      </div>
      <div className="tabular mt-1 text-xl font-semibold leading-tight tracking-tight">{valor}</div>
      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{detalhe}</p>
    </div>
  )
}
