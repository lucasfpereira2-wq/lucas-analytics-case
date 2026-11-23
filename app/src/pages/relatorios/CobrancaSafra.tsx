import { CalendarRange, Info, ShieldAlert, ThumbsDown, ThumbsUp, TrendingDown, UserMinus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { KpiCard } from '@/components/dados'
import { LayoutRelatorio } from '@/components/relatorio/LayoutRelatorio'
import { filtrar } from '@/lib/cubo'
import { useMeta, useRelatorio } from '@/lib/dados'
import { FILTROS_PADRAO, useFiltros, useFiltrosResolvidos } from '@/lib/filtros'
import { fmtCompacto, fmtMes, fmtNumero, fmtPct } from '@/lib/formato'
import { fmtPP } from './carteira/dados'
import { Alternador, Secao } from './carteira/ui'
import { CurvasSafra } from './safra/CurvasSafra'
import { construirModelo, quebraNoMob, ROTULO_INDICADOR, taxa, taxaAgregada, type Denominador } from './safra/dados'
import { MatrizSafra } from './safra/MatrizSafra'
import { QuebraRisco } from './safra/QuebraRisco'
import { SeletorSafras } from './safra/SeletorSafras'
import { TabelaComparacao } from './safra/TabelaComparacao'

const ID = 'cobranca-safra'
type IndicadorAtraso = 'over30' | 'over60' | 'over90'

/**
 * Cobrança: Safra, MOB e Cohort. O período seleciona as SAFRAS (mês da venda); a granularidade não se aplica.
 * KPIs → curvas de safra → matriz MOB → cohort de retenção → comparação de safras → onde está o risco.
 */
export default function CobrancaSafra() {
  const { dados, carregando } = useRelatorio(ID)
  const { dados: meta } = useMeta()
  const f = useFiltrosResolvidos({ dimCanal: 'canal' })

  // Análise de safra pede histórico longo: se o período está no padrão do portal (12 meses), abre em "todo o histórico"
  // e devolve o padrão ao sair, para não contaminar os outros relatórios.
  useEffect(() => {
    let marcou = false
    const id = window.setTimeout(() => {
      if (useFiltros.getState().preset === FILTROS_PADRAO.preset) {
        useFiltros.getState().definirPreset('tudo')
        marcou = true
      }
    }, 0)
    return () => {
      window.clearTimeout(id)
      if (marcou && useFiltros.getState().preset === 'tudo') useFiltros.getState().definirPreset(FILTROS_PADRAO.preset)
    }
  }, [])

  const [indicador, setIndicador] = useState<IndicadorAtraso>('over30')
  const [den, setDen] = useState<Denominador>('base')
  const [cohort, setCohort] = useState<'retencao' | 'cancel'>('retencao')
  const [mobQuebra, setMobQuebra] = useState<'6' | '12'>('6')
  const [selecao, setSelecao] = useState<string[] | null>(null)

  const cubo = dados?.cubos.safra_mob
  /** linhas do cubo para as safras do período; `sem` ignora o filtro de uma dimensão (quebras com cross-filter) */
  const selecionar = useMemo(() => {
    if (!cubo) return null
    const ini = f.periodo.inicio.slice(0, 7)
    const fim = f.periodo.fim.slice(0, 7)
    const safras = (cubo.dims.find((d) => d.nome === 'safra')?.valores ?? []).filter((s) => s >= ini && s <= fim)
    return (sem?: 'segmento' | 'canal') => {
      if (!safras.length) return filtrar(cubo, { dims: { safra: ['—'] } }, f.meta)
      return filtrar(
        cubo,
        {
          ...f.filtrosCubo, inicio: null, fim: null,
          segmentos: sem === 'segmento' ? [] : f.filtrosCubo.segmentos,
          dims: { canal: sem === 'canal' ? [] : f.canais, safra: safras },
        },
        f.meta,
      )
    }
  }, [cubo, f.filtrosCubo, f.canais, f.periodo.inicio, f.periodo.fim, f.meta])
  const linhas = useMemo(() => selecionar?.() ?? null, [selecionar])
  const modelo = useMemo(() => (cubo && linhas ? construirModelo(cubo, linhas) : null), [cubo, linhas])

  const destaque = useMemo(() => {
    const d = (dados?.extras?.safras_destaque as string[] | undefined) ?? []
    return d.filter((s) => modelo?.safras.includes(s))
  }, [dados, modelo])
  const selecionadas = useMemo(() => (selecao ?? destaque).filter((s) => modelo?.safras.includes(s)), [selecao, destaque, modelo])

  const kpi = useMemo(() => {
    if (!modelo) return null
    // safras maduras em um MOB: as que já passaram dele (o MOB está fechado); se não houver, aceita o MOB parcial
    const maduras = (mob: number) => {
      const fechadas = modelo.safras.filter((s) => modelo.maxMob[s] > mob)
      return fechadas.length ? fechadas : modelo.safras.filter((s) => modelo.maxMob[s] >= mob)
    }
    const m6 = maduras(6)
    const m12 = maduras(12)
    const o30 = taxaAgregada(modelo, 6, 'over30', 'base', m6)
    const o90 = taxaAgregada(modelo, 12, 'over90', 'base', m12)
    const canc = taxaAgregada(modelo, 12, 'cancel', 'base', m12)
    const porSafra = m6.map((s) => ({ s, v: taxa(modelo.celula(s, 6), 'over30') })).filter((x): x is { s: string; v: number } => x.v != null)
    const pior = porSafra.reduce<{ s: string; v: number } | null>((a, x) => (!a || x.v > a.v ? x : a), null)
    const melhor = porSafra.reduce<{ s: string; v: number } | null>((a, x) => (!a || x.v < a.v ? x : a), null)
    let cotas = 0
    for (const s of modelo.safras) cotas += modelo.celula(s, modelo.maxMob[s])?.base ?? 0
    return {
      m6, m12, o30, o90, canc, pior, melhor, cotas,
      spark30: porSafra.map((x) => x.v),
      spark90: m12.map((s) => taxa(modelo.celula(s, 12), 'over90')),
      sparkCanc: m12.map((s) => taxa(modelo.celula(s, 12), 'cancel')),
      sparkCotas: modelo.safras.map((s) => modelo.celula(s, modelo.maxMob[s])?.base ?? 0),
    }
  }, [modelo])

  const mobQ = Number(mobQuebra)
  const porSegmento = useMemo(() => (cubo && selecionar ? quebraNoMob(cubo, selecionar('segmento'), 'segmento', mobQ) : []), [cubo, selecionar, mobQ])
  const porCanal = useMemo(() => (cubo && selecionar ? quebraNoMob(cubo, selecionar('canal'), 'canal', mobQ) : []), [cubo, selecionar, mobQ])

  const alternarSegmento = (nome: string) => {
    const s = useFiltros.getState()
    s.definirSegmentos(s.segmentos.includes(nome) ? s.segmentos.filter((x) => x !== nome) : [...s.segmentos, nome])
  }
  const alternarCanal = (nome: string) => {
    const s = useFiltros.getState()
    s.definirCanais(s.canais.includes(nome) ? s.canais.filter((x) => x !== nome) : [...s.canais, nome])
  }
  const semSafras = !!modelo && modelo.safras.length === 0
  const nowrap = (t: string) => <span className="whitespace-nowrap">{t}</span>

  return (
    <LayoutRelatorio
      relatorio={ID}
      subtitulo="Qualidade de cada safra de vendas ao longo do tempo: curvas de atraso, matriz MOB e cohort de retenção."
      filtros={{ filtros: ['periodo', 'segmento', 'regional', 'uf', 'canal'], canal: { rotulo: 'Canal de venda', opcoes: meta?.canais_venda ?? [] } }}
      carregando={carregando}
      vazio={!dados || !modelo || semSafras}
      mensagemVazio={semSafras ? { titulo: 'Nenhuma safra no recorte', descricao: 'Não há vendas no período e nos filtros selecionados. Amplie o período para analisar mais safras.' } : undefined}
    >
      {modelo && kpi && (
        <>
          <p className="flex items-start gap-2 rounded-xl border border-border bg-card/70 px-3.5 py-2.5 text-[13px] leading-snug text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>
              <strong className="font-semibold text-foreground">Safra</strong> é o mês em que a cota foi vendida; <strong className="font-semibold text-foreground">MOB</strong> (months on book) é
              quantos meses se passaram desde a venda. O filtro de período escolhe as safras; comparar safras no mesmo MOB mostra se a qualidade da venda está melhorando ou piorando.
            </span>
          </p>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <KpiCard
              rotulo="Over 30 no MOB 6" icone={ShieldAlert} valor={nowrap(fmtPct(kpi.o30.taxa, 2))} sparkline={kpi.spark30}
              detalhe={kpi.o30.n ? `Média de ${kpi.o30.n} safras maduras (${fmtMes(kpi.m6[0])} a ${fmtMes(kpi.m6[kpi.m6.length - 1])})` : 'Nenhuma safra do filtro chegou ao MOB 6'}
              definicao="Cotas com mais de 30 dias de atraso no 6º mês após a venda, sobre as cotas vendidas. Média ponderada das safras que já passaram do MOB 6."
            />
            <KpiCard
              rotulo="Over 90 no MOB 12" icone={TrendingDown} valor={nowrap(fmtPct(kpi.o90.taxa, 2))} sparkline={kpi.spark90}
              detalhe={kpi.o90.n ? `Média de ${kpi.o90.n} safras maduras (${fmtMes(kpi.m12[0])} a ${fmtMes(kpi.m12[kpi.m12.length - 1])})` : 'Nenhuma safra do filtro chegou ao MOB 12'}
              definicao="Cotas com mais de 90 dias de atraso no 12º mês após a venda, sobre as cotas vendidas. Média ponderada das safras que já passaram do MOB 12."
            />
            <KpiCard
              rotulo="Cancelamento acumulado no MOB 12" icone={UserMinus} valor={nowrap(fmtPct(kpi.canc.taxa, 2))} sparkline={kpi.sparkCanc}
              detalhe={kpi.canc.n ? `Cotas canceladas até o 12º mês, em ${kpi.canc.n} safras maduras` : 'Nenhuma safra do filtro chegou ao MOB 12'}
              definicao="Cotas canceladas até o 12º mês após a venda, sobre as cotas vendidas na safra."
            />
            <KpiCard
              rotulo={`Pior safra no MOB 6${kpi.pior ? `: ${fmtMes(kpi.pior.s)}` : ''}`} icone={ThumbsDown} valor={nowrap(fmtPct(kpi.pior?.v, 2))}
              variacao={kpi.pior && kpi.o30.taxa != null ? kpi.pior.v - kpi.o30.taxa : null} variacaoTexto={fmtPP(kpi.pior?.v, kpi.o30.taxa, 1)} maiorE="pior" comparacao="vs média das safras maduras"
              detalhe={kpi.pior ? `Over 30 de ${fmtNumero(modelo.celula(kpi.pior.s, 6)?.over30)} em ${fmtNumero(modelo.celula(kpi.pior.s, 6)?.base)} cotas` : 'Sem safra madura no filtro'}
              definicao="Safra madura com o maior over 30 no MOB 6."
            />
            <KpiCard
              rotulo={`Melhor safra no MOB 6${kpi.melhor ? `: ${fmtMes(kpi.melhor.s)}` : ''}`} icone={ThumbsUp} valor={nowrap(fmtPct(kpi.melhor?.v, 2))}
              variacao={kpi.melhor && kpi.o30.taxa != null ? kpi.melhor.v - kpi.o30.taxa : null} variacaoTexto={fmtPP(kpi.melhor?.v, kpi.o30.taxa, 1)} maiorE="pior" comparacao="vs média das safras maduras"
              detalhe={kpi.melhor ? `Over 30 de ${fmtNumero(modelo.celula(kpi.melhor.s, 6)?.over30)} em ${fmtNumero(modelo.celula(kpi.melhor.s, 6)?.base)} cotas` : 'Sem safra madura no filtro'}
              definicao="Safra madura com o menor over 30 no MOB 6."
            />
            <KpiCard
              rotulo="Safras analisadas" icone={CalendarRange} valor={nowrap(`${modelo.safras.length} ${modelo.safras.length === 1 ? 'safra' : 'safras'}`)} sparkline={kpi.sparkCotas}
              detalhe={`${fmtCompacto(kpi.cotas)} cotas vendidas de ${fmtMes(modelo.safras[0])} a ${fmtMes(modelo.safras[modelo.safras.length - 1])}`}
              definicao="Safras (meses de venda) dentro do período filtrado e total de cotas vendidas nelas. O sparkline mostra as cotas vendidas por safra."
            />
          </div>

          <CurvasSafra
            modelo={modelo}
            indicador={indicador}
            den={den}
            selecionadas={selecionadas}
            controles={
              <>
                <Alternador rotulo="Indicador" valor={indicador} onChange={setIndicador} opcoes={[{ id: 'over30', rotulo: 'Over 30' }, { id: 'over60', rotulo: 'Over 60' }, { id: 'over90', rotulo: 'Over 90' }]} />
                <Alternador rotulo="Denominador" valor={den} onChange={setDen} opcoes={[{ id: 'base', rotulo: '% das cotas da safra' }, { id: 'ativas', rotulo: '% das cotas ativas' }]} />
                <span className="mx-1 hidden h-5 w-px bg-border lg:block" aria-hidden />
                <SeletorSafras safras={modelo.safras} selecionadas={selecionadas} onChange={setSelecao} />
              </>
            }
          />

          <MatrizSafra
            modelo={modelo}
            indicador={indicador}
            den={den}
            destacadas={selecionadas}
            nomeArquivo={`safra-matriz-mob-${indicador}`}
            titulo="Em que MOB cada safra começa a pesar?"
            subtitulo={`Matriz MOB: ${ROTULO_INDICADOR[indicador]} de cada safra (linha) em cada mês desde a venda (coluna), em % das ${den === 'base' ? 'cotas da safra' : 'cotas ativas'}. Leia na vertical para comparar safras no mesmo MOB.`}
            acoes={<Alternador className="mr-1" rotulo="Indicador" valor={indicador} onChange={setIndicador} opcoes={[{ id: 'over30', rotulo: 'Over 30' }, { id: 'over60', rotulo: 'Over 60' }, { id: 'over90', rotulo: 'Over 90' }]} />}
          />

          <MatrizSafra
            modelo={modelo}
            indicador={cohort}
            den="base"
            destacadas={selecionadas}
            nomeArquivo={`safra-cohort-${cohort === 'retencao' ? 'retencao' : 'cancelamento'}`}
            titulo={cohort === 'retencao' ? 'Quantas cotas de cada safra continuam ativas?' : 'Quanto de cada safra já foi cancelado?'}
            subtitulo={cohort === 'retencao' ? 'Cohort de retenção: % das cotas vendidas na safra que seguem ativas em cada MOB.' : 'Cohort de cancelamento: % acumulado das cotas da safra canceladas até cada MOB.'}
            acoes={<Alternador className="mr-1" rotulo="Visão do cohort" valor={cohort} onChange={setCohort} opcoes={[{ id: 'retencao', rotulo: 'Retenção' }, { id: 'cancel', rotulo: 'Cancelamento' }]} />}
          />

          <TabelaComparacao modelo={modelo} safras={selecionadas.length ? selecionadas : modelo.safras} />

          <Secao
            titulo="Onde está o risco"
            descricao="Mesmas safras, quebradas por segmento e por canal de venda em um MOB fixo."
            acoes={<Alternador rotulo="MOB de referência" valor={mobQuebra} onChange={setMobQuebra} opcoes={[{ id: '6', rotulo: 'MOB 6' }, { id: '12', rotulo: 'MOB 12' }]} />}
          >
            <div className="grid gap-4 xl:grid-cols-2">
              <QuebraRisco titulo="Qual segmento envelhece pior?" dimensao="Segmento" mob={mobQ} dados={porSegmento} selecionados={f.segmentos} onAlternar={alternarSegmento} nomeArquivo={`safra-risco-segmento-mob${mobQ}`} />
              <QuebraRisco titulo="Qual canal de venda traz as piores safras?" dimensao="Canal de venda" mob={mobQ} dados={porCanal} selecionados={f.canais} onAlternar={alternarCanal} nomeArquivo={`safra-risco-canal-mob${mobQ}`} />
            </div>
          </Secao>

        </>
      )}
    </LayoutRelatorio>
  )
}
