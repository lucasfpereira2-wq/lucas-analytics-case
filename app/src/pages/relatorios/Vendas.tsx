import { Banknote, CircleX, Filter, Receipt, ShoppingBag, Target } from 'lucide-react'
import { useMemo } from 'react'
import { KpiCard } from '@/components/dados'
import { LayoutRelatorio } from '@/components/relatorio/LayoutRelatorio'
import { agrupar, compararPeriodos, filtrar, periodoAnterior, razao, serieTemporal, type Granularidade } from '@/lib/cubo'
import { useMeta, useRelatorio } from '@/lib/dados'
import { useFiltrosResolvidos, type FiltrosResolvidos } from '@/lib/filtros'
import { fmtBRL, fmtCompacto, fmtData, fmtNumero, fmtPct, variacao } from '@/lib/formato'
import type { Cubo, DadosRelatorio } from '@/types/cubo'
import { intervaloDoBucket, proRata, variacaoPP } from './vendas/comum'
import { Cancelamentos, FunilComercial, MetaPorRegional, MixCanal, MixSegmento } from './vendas/Detalhes'
import { MapaVendas } from './vendas/MapaUF'
import { RankingVendedores, type Vendedor } from './vendas/RankingVendedores'
import { TendenciaVendas } from './vendas/Tendencia'

const ID = 'vendas'

/**
 * Vendas / Comercial: KPIs → tendência com drill-down → metas, funil, mix, mapa por UF, ranking de vendedores e cancelamentos.
 * Razões (ticket, atingimento, conversão) são sempre calculadas de numerador e denominador depois dos filtros.
 */
export default function Vendas() {
  const { dados, carregando } = useRelatorio(ID)
  const { dados: meta } = useMeta()
  const f = useFiltrosResolvidos({ dimCanal: 'canal' })
  const pronto = !!dados?.cubos.vendas && !!dados.cubos.metas && !!dados.cubos.funil && !!dados.cubos.cancelamentos

  return (
    <LayoutRelatorio
      relatorio={ID}
      subtitulo="Produção comercial, metas, funil de conversão e cancelamentos por segmento, canal e região."
      filtros={{ filtros: ['periodo', 'granularidade', 'segmento', 'regional', 'uf', 'canal'], canal: { rotulo: 'Canal de venda', opcoes: meta?.canais_venda ?? [] } }}
      carregando={carregando}
      vazio={!pronto}
    >
      {pronto && dados && <Conteudo dados={dados} f={f} />}
    </LayoutRelatorio>
  )
}

function useIndicadores(dados: DadosRelatorio, f: FiltrosResolvidos) {
  const cV = dados.cubos.vendas
  const cM = dados.cubos.metas
  const cF = dados.cubos.funil
  const cC = dados.cubos.cancelamentos

  return useMemo(() => {
    const g: Granularidade = f.granularidade
    const { inicio, fim } = f.periodo
    const ant = periodoAnterior(inicio, fim)
    const temBase = ant.fim >= f.limites.inicio

    // vendas
    const lV = filtrar(cV, f.filtrosCubo, f.meta)
    const compV = compararPeriodos(cV, f.filtrosCubo, f.meta, ['cotas_vendidas', 'credito_vendido'])
    const sV = serieTemporal(cV, lV, g, ['cotas_vendidas', 'credito_vendido'], f.periodo)
    const ticket = razao(compV.atual.credito_vendido, compV.atual.cotas_vendidas)
    const ticketAnt = razao(compV.anterior.credito_vendido, compV.anterior.cotas_vendidas)

    // meta proporcional aos dias (metas são mensais, mês cheio)
    const metaPorMes = new Map<string, number>()
    for (const gr of agrupar(cM, filtrar(cM, { ...f.filtrosCubo, inicio: null, fim: null }, f.meta), ['mes'], ['meta_credito'])) {
      metaPorMes.set(gr.chave[0], gr.valores.meta_credito)
    }
    const metaPeriodo = proRata(metaPorMes, inicio, fim)
    const ating = razao(compV.atual.credito_vendido, metaPeriodo)
    const atingAnt = temBase ? razao(compV.anterior.credito_vendido, proRata(metaPorMes, ant.inicio, ant.fim)) : null
    const sAting = sV.buckets.map((b, i) => {
      const iv = intervaloDoBucket(b, g, f.periodo)
      return razao(sV.valores.credito_vendido[i], proRata(metaPorMes, iv.inicio, iv.fim))
    })

    // funil
    const compF = compararPeriodos(cF, f.filtrosCubo, f.meta, ['leads', 'contratos'])
    const sF = serieTemporal(cF, filtrar(cF, f.filtrosCubo, f.meta), g, ['leads', 'contratos'], f.periodo)
    const conv = razao(compF.atual.contratos, compF.atual.leads)
    const convAnt = temBase ? razao(compF.anterior.contratos, compF.anterior.leads) : null

    // cancelamentos
    const compC = compararPeriodos(cC, f.filtrosCubo, f.meta, ['cotas_canceladas'])
    const sC = serieTemporal(cC, filtrar(cC, f.filtrosCubo, f.meta), g, ['cotas_canceladas'], f.periodo)
    const txCancel = razao(compC.atual.cotas_canceladas, compV.atual.cotas_vendidas)

    return {
      metaPorMes,
      cotas: compV.atual.cotas_vendidas,
      credito: compV.atual.credito_vendido,
      varCotas: compV.variacao.cotas_vendidas,
      varCredito: compV.variacao.credito_vendido,
      ticket,
      varTicket: variacao(ticket, ticketAnt),
      metaPeriodo,
      ating,
      ppAting: variacaoPP(ating, atingAnt),
      conv,
      ppConv: variacaoPP(conv, convAnt, 2),
      leads: compF.atual.leads,
      contratos: compF.atual.contratos,
      canceladas: compC.atual.cotas_canceladas,
      varCanceladas: compC.variacao.cotas_canceladas,
      txCancel,
      spark: {
        cotas: sV.valores.cotas_vendidas,
        credito: sV.valores.credito_vendido,
        ticket: sV.buckets.map((_, i) => razao(sV.valores.credito_vendido[i], sV.valores.cotas_vendidas[i])),
        ating: sAting,
        conv: sF.buckets.map((_, i) => razao(sF.valores.contratos[i], sF.valores.leads[i])),
        canceladas: sC.valores.cotas_canceladas,
      },
      comparacao: compV.periodoAnterior && temBase ? `vs ${fmtData(compV.periodoAnterior.inicio)} a ${fmtData(compV.periodoAnterior.fim)}` : undefined,
    }
  }, [cV, cM, cF, cC, f.filtrosCubo, f.meta, f.periodo, f.granularidade, f.limites.inicio])
}

function Conteudo({ dados, f }: { dados: DadosRelatorio; f: FiltrosResolvidos }) {
  const cubos = dados.cubos as Record<'vendas' | 'metas' | 'funil' | 'cancelamentos', Cubo>
  const k = useIndicadores(dados, f)
  const vendedores = (dados.extras.vendedores as Vendedor[] | undefined) ?? []
  const notas = dados.extras.notas as { metas?: string } | undefined

  return (
    <>
      <section aria-label="Indicadores principais" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 min-[1800px]:grid-cols-6">
        <KpiCard
          rotulo="Cotas vendidas"
          icone={ShoppingBag}
          valor={fmtCompacto(Math.round(k.cotas))}
          variacao={k.varCotas}
          comparacao="vs período anterior"
          sparkline={k.spark.cotas}
          detalhe={`${fmtNumero(k.cotas)} contratos de adesão efetivados`}
          definicao="Quantidade de cotas com contrato de adesão efetivado no período, pela data da venda."
        />
        <KpiCard
          rotulo="Crédito comercializado"
          icone={Banknote}
          valor={fmtCompacto(k.credito, { moeda: true, casas: 2 })}
          variacao={k.varCredito}
          sparkline={k.spark.credito}
          detalhe={`Meta proporcional do período: ${fmtCompacto(k.metaPeriodo, { moeda: true, casas: 2 })}`}
          definicao="Soma do valor de crédito das cotas vendidas no período."
        />
        <KpiCard
          rotulo="Ticket médio"
          icone={Receipt}
          valor={fmtBRL(k.ticket, 0)}
          variacao={k.varTicket}
          sparkline={k.spark.ticket}
          detalhe="Crédito comercializado ÷ cotas vendidas"
          definicao="Valor médio de crédito por cota vendida. Calculado depois dos filtros (crédito ÷ cotas), nunca como média de médias."
        />
        <KpiCard
          rotulo="Meta vs realizado"
          icone={Target}
          valor={fmtPct(k.ating)}
          variacao={k.ppAting ? k.ppAting.valor / 100 : null}
          variacaoTexto={k.ppAting?.texto}
          sparkline={k.spark.ating}
          detalhe={
            k.credito >= k.metaPeriodo
              ? `${fmtCompacto(k.credito - k.metaPeriodo, { moeda: true })} acima da meta proporcional`
              : `${fmtCompacto(k.metaPeriodo - k.credito, { moeda: true })} abaixo da meta proporcional`
          }
          definicao={`Crédito comercializado ÷ meta de crédito do período. As metas são mensais e entram proporcionalmente aos dias corridos do período. ${notas?.metas ?? ''}`}
        />
        <KpiCard
          rotulo="Conversão do funil"
          icone={Filter}
          valor={fmtPct(k.conv, 2)}
          variacao={k.ppConv ? k.ppConv.valor / 100 : null}
          variacaoTexto={k.ppConv?.texto}
          sparkline={k.spark.conv}
          detalhe={`${fmtCompacto(k.contratos)} contratos de ${fmtCompacto(k.leads)} leads`}
          definicao="Contratos ÷ leads do período. Mede a eficiência de ponta a ponta do funil comercial."
        />
        <KpiCard
          rotulo="Cancelamentos"
          icone={CircleX}
          valor={fmtCompacto(Math.round(k.canceladas))}
          variacao={k.varCanceladas}
          maiorE="pior"
          sparkline={k.spark.canceladas}
          detalhe={`${fmtPct(k.txCancel)} das cotas vendidas no período`}
          definicao="Cotas canceladas no período, pela data do cancelamento. O percentual compara com as cotas vendidas no mesmo período."
        />
      </section>
      {k.comparacao && <p className="-mt-2 text-xs text-muted-foreground">Variações comparam com o período imediatamente anterior de mesmo tamanho ({k.comparacao.replace('vs ', '')}).</p>}

      <TendenciaVendas cubo={cubos.vendas} f={f} metaPorMes={k.metaPorMes} />

      <div className="grid gap-4 xl:grid-cols-2">
        <MetaPorRegional f={f} cuboVendas={cubos.vendas} cuboMetas={cubos.metas} />
        <FunilComercial f={f} cubo={cubos.funil} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <MixSegmento f={f} cubo={cubos.vendas} />
        <MixCanal f={f} cubo={cubos.vendas} />
      </div>

      <MapaVendas f={f} cubo={cubos.vendas} />

      <RankingVendedores f={f} cubo={cubos.vendas} vendedores={vendedores} />

      <Cancelamentos f={f} cubo={cubos.cancelamentos} cuboVendas={cubos.vendas} />
    </>
  )
}
