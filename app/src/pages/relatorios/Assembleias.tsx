import { Banknote, Boxes, CalendarCheck, Gauge, Gavel, PackageOpen, Percent, Trophy } from 'lucide-react'
import { useMemo } from 'react'
import { KpiCard } from '@/components/dados'
import { LayoutRelatorio } from '@/components/relatorio/LayoutRelatorio'
import { compararPeriodos, filtrar, periodoAnterior, razao, serieTemporal, serieTemporalPor } from '@/lib/cubo'
import { useRelatorio } from '@/lib/dados'
import { useFiltrosResolvidos, type FiltrosResolvidos } from '@/lib/filtros'
import { fmtCompacto, fmtData, fmtMes, fmtNumero, fmtPct } from '@/lib/formato'
import type { Cubo, DadosRelatorio } from '@/types/cubo'
import { CreditoLiberacao, Lances, OcupacaoGrupos, TendenciaContemplacoes } from './assembleias/Graficos'
import { LanceMedioPorGrupo, type Grupo } from './assembleias/Grupos'
import { variacaoPP } from './vendas/comum'

const ID = 'assembleias'

/**
 * Assembleias e Contemplações: KPIs → contemplações por modalidade (drill-down) → lances, liberação de crédito,
 * ocupação dos grupos e lance médio por grupo. Medidas de estoque (grupos, cotas) usam a última fotografia do período.
 */
export default function Assembleias() {
  const { dados, carregando } = useRelatorio(ID)
  const f = useFiltrosResolvidos()
  const pronto = !!dados?.cubos.contemplacoes && !!dados.cubos.lances && !!dados.cubos.liberacao && !!dados.cubos.grupos

  return (
    <LayoutRelatorio
      relatorio={ID}
      subtitulo="Contemplações por sorteio e lance, liberação de crédito e ocupação dos grupos."
      filtros={{ filtros: ['periodo', 'granularidade', 'segmento', 'regional', 'uf'] }}
      carregando={carregando}
      vazio={!pronto}
    >
      {pronto && dados && <Conteudo dados={dados} f={f} />}
    </LayoutRelatorio>
  )
}

function useIndicadores(cubos: Record<'contemplacoes' | 'lances' | 'liberacao' | 'grupos', Cubo>, f: FiltrosResolvidos) {
  return useMemo(() => {
    const g = f.granularidade
    const ant = periodoAnterior(f.periodo.inicio, f.periodo.fim)
    const temBase = ant.fim >= f.limites.inicio
    const cC = cubos.contemplacoes

    // contemplações: total e apenas modalidades de lance
    const modalidades = cC.dims.find((d) => d.nome === 'modalidade')?.valores ?? []
    const deLance = modalidades.filter((m) => m !== 'Sorteio')
    const filtrosLance = { ...f.filtrosCubo, dims: { ...f.filtrosCubo.dims, modalidade: deLance } }
    const todas = compararPeriodos(cC, f.filtrosCubo, f.meta, ['contemplacoes', 'credito_contemplado'])
    const lance = compararPeriodos(cC, filtrosLance, f.meta, ['contemplacoes', 'soma_lance_pct'])
    const sTodas = serieTemporal(cC, filtrar(cC, f.filtrosCubo, f.meta), g, ['contemplacoes'], f.periodo)
    const sLance = serieTemporal(cC, filtrar(cC, filtrosLance, f.meta), g, ['contemplacoes', 'soma_lance_pct'], f.periodo)
    const sMod = serieTemporalPor(cC, filtrar(cC, f.filtrosCubo, f.meta), g, 'modalidade', 'contemplacoes', f.periodo)

    const pctLance = razao(lance.atual.contemplacoes, todas.atual.contemplacoes)
    const pctLanceAnt = temBase ? razao(lance.anterior.contemplacoes, todas.anterior.contemplacoes) : null
    // soma_lance_pct está em centésimos de ponto percentual: ÷ contemplações ÷ 100 = lance médio em %
    const lanceMedio = razao(lance.atual.soma_lance_pct, lance.atual.contemplacoes * 100)
    const lanceMedioAnt = temBase ? razao(lance.anterior.soma_lance_pct, lance.anterior.contemplacoes * 100) : null

    // liberação
    const lib = compararPeriodos(cubos.liberacao, f.filtrosCubo, f.meta, ['valor_liberado', 'creditos_liberados'])
    const sLib = serieTemporal(cubos.liberacao, filtrar(cubos.liberacao, f.filtrosCubo, f.meta), g, ['valor_liberado'], f.periodo)

    // grupos (estoque mensal: última fotografia)
    const gr = compararPeriodos(cubos.grupos, f.filtrosCubo, f.meta)
    const sGr = serieTemporal(cubos.grupos, filtrar(cubos.grupos, f.filtrosCubo, f.meta), 'mes', undefined, f.periodo)
    const ocup = razao(gr.atual.cotas_ocupadas, gr.atual.cotas_capacidade)
    const ocupAnt = temBase ? razao(gr.anterior.cotas_ocupadas, gr.anterior.cotas_capacidade) : null

    return {
      contemplacoes: todas.atual.contemplacoes,
      varContemplacoes: todas.variacao.contemplacoes,
      creditoContemplado: todas.atual.credito_contemplado,
      pctLance,
      ppLance: variacaoPP(pctLance, pctLanceAnt),
      lanceMedio,
      ppLanceMedio: variacaoPP(lanceMedio === null ? null : lanceMedio / 100, lanceMedioAnt === null ? null : lanceMedioAnt / 100),
      liberado: lib.atual.valor_liberado,
      varLiberado: lib.variacao.valor_liberado,
      qtdLiberados: lib.atual.creditos_liberados,
      grupos: gr.atual.grupos_ativos,
      varGrupos: gr.variacao.grupos_ativos,
      ocup,
      ppOcup: variacaoPP(ocup, ocupAnt),
      ocupadas: gr.atual.cotas_ocupadas,
      capacidade: gr.atual.cotas_capacidade,
      disponiveis: gr.atual.cotas_disponiveis,
      varDisponiveis: gr.variacao.cotas_disponiveis,
      assembleias: gr.atual.assembleias_realizadas,
      fotografia: sGr.buckets.length ? sGr.buckets[sGr.buckets.length - 1] : null,
      modalidadeLider: [...sMod.series].sort((a, b) => b.total - a.total)[0]?.nome,
      spark: {
        contemplacoes: sTodas.valores.contemplacoes,
        pctLance: sTodas.buckets.map((_, i) => razao(sLance.valores.contemplacoes[i], sTodas.valores.contemplacoes[i])),
        lanceMedio: sLance.buckets.map((_, i) => razao(sLance.valores.soma_lance_pct[i], sLance.valores.contemplacoes[i] * 100)),
        liberado: sLib.valores.valor_liberado,
        grupos: sGr.valores.grupos_ativos,
        ocup: sGr.buckets.map((_, i) => razao(sGr.valores.cotas_ocupadas[i], sGr.valores.cotas_capacidade[i])),
        disponiveis: sGr.valores.cotas_disponiveis,
        assembleias: sGr.valores.assembleias_realizadas,
      },
      periodoAnterior: temBase ? ant : null,
    }
  }, [cubos, f.filtrosCubo, f.meta, f.periodo, f.granularidade, f.limites.inicio])
}

function Conteudo({ dados, f }: { dados: DadosRelatorio; f: FiltrosResolvidos }) {
  const cubos = dados.cubos as Record<'contemplacoes' | 'lances' | 'liberacao' | 'grupos', Cubo>
  const k = useIndicadores(cubos, f)
  const grupos = (dados.extras.grupos as Grupo[] | undefined) ?? []
  const totalGrupos = dados.extras.total_grupos as number | undefined
  const foto = k.fotografia ? `Posição de ${fmtMes(k.fotografia)}` : undefined

  return (
    <>
      <section aria-label="Indicadores principais" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          rotulo="Contemplações"
          icone={Trophy}
          valor={fmtCompacto(Math.round(k.contemplacoes))}
          variacao={k.varContemplacoes}
          sparkline={k.spark.contemplacoes}
          detalhe={`${fmtCompacto(k.creditoContemplado, { moeda: true })} em crédito contemplado`}
          definicao="Cotas contempladas nas assembleias do período, por sorteio ou por lance."
        />
        <KpiCard
          rotulo="Contemplações por lance"
          icone={Percent}
          valor={fmtPct(k.pctLance)}
          variacao={k.ppLance ? k.ppLance.valor / 100 : null}
          variacaoTexto={k.ppLance?.texto}
          maiorE="neutro"
          sparkline={k.spark.pctLance}
          detalhe={`Sorteio: ${fmtPct(k.pctLance === null ? null : 1 - k.pctLance)} das contemplações`}
          definicao="Participação das modalidades de lance (livre, fixo e embutido) no total de contemplações. O complemento é o sorteio."
        />
        <KpiCard
          rotulo="Lance médio vencedor"
          icone={Gavel}
          valor={fmtPct(k.lanceMedio, 1, { fracao: false })}
          variacao={k.ppLanceMedio ? k.ppLanceMedio.valor / 100 : null}
          variacaoTexto={k.ppLanceMedio?.texto}
          maiorE="neutro"
          sparkline={k.spark.lanceMedio}
          detalhe="Em % do crédito, só lances"
          definicao="Média dos lances vencedores em % do valor do crédito: soma dos lances ÷ contemplações por lance. Não inclui sorteio."
        />
        <KpiCard
          rotulo="Crédito liberado"
          icone={Banknote}
          valor={fmtCompacto(k.liberado, { moeda: true })}
          variacao={k.varLiberado}
          sparkline={k.spark.liberado}
          detalhe={`${fmtNumero(k.qtdLiberados)} créditos pagos`}
          definicao="Valor de crédito efetivamente liberado aos contemplados no período, pela data da liberação."
        />
        <KpiCard
          rotulo="Grupos ativos"
          icone={Boxes}
          valor={fmtNumero(Math.round(k.grupos))}
          variacao={k.varGrupos}
          maiorE="neutro"
          sparkline={k.spark.grupos}
          detalhe={foto}
          definicao="Grupos em andamento na última fotografia do período (medida de estoque: não se soma no tempo)."
        />
        <KpiCard
          rotulo="Taxa de ocupação"
          icone={Gauge}
          valor={fmtPct(k.ocup)}
          variacao={k.ppOcup ? k.ppOcup.valor / 100 : null}
          variacaoTexto={k.ppOcup?.texto}
          sparkline={k.spark.ocup}
          detalhe={`${fmtCompacto(k.ocupadas)} ocupadas de ${fmtCompacto(k.capacidade)} cotas`}
          definicao="Cotas ocupadas ÷ capacidade de cotas dos grupos ativos, na última fotografia do período."
        />
        <KpiCard
          rotulo="Cotas disponíveis"
          icone={PackageOpen}
          valor={fmtNumero(k.disponiveis)}
          variacao={k.varDisponiveis}
          maiorE="neutro"
          sparkline={k.spark.disponiveis}
          detalhe="Estoque para venda nos grupos"
          definicao="Cotas vagas nos grupos ativos (capacidade − ocupadas), na última fotografia do período."
        />
        <KpiCard
          rotulo="Assembleias realizadas"
          icone={CalendarCheck}
          valor={fmtNumero(k.assembleias)}
          sparkline={k.spark.assembleias}
          detalhe={`${fmtNumero(razao(k.contemplacoes, k.assembleias), 1)} contemplações por assembleia`}
          definicao="Assembleias realizadas pelos grupos nos meses do período (apuração mensal)."
        />
      </section>
      {k.periodoAnterior && (
        <p className="-mt-2 text-xs text-muted-foreground">
          Variações comparam com o período imediatamente anterior de mesmo tamanho ({fmtData(k.periodoAnterior.inicio)} a {fmtData(k.periodoAnterior.fim)}). Grupos, ocupação e cotas
          disponíveis comparam fotografias de fim de período.
        </p>
      )}

      <TendenciaContemplacoes f={f} cubo={cubos.contemplacoes} />

      <Lances f={f} cubo={cubos.lances} />

      <div className="grid gap-4 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <CreditoLiberacao f={f} cuboContemplacoes={cubos.contemplacoes} cuboLiberacao={cubos.liberacao} />
        </div>
        <div className="xl:col-span-2">
          <OcupacaoGrupos f={f} cubo={cubos.grupos} />
        </div>
      </div>

      <LanceMedioPorGrupo f={f} grupos={grupos} totalGrupos={totalGrupos} />
    </>
  )
}
