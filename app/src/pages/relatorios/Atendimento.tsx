import { Clock, Gauge, Headset, Hourglass, PhoneOff, Smile, ThumbsUp } from 'lucide-react'
import { useMemo } from 'react'
import { KpiCard } from '@/components/dados'
import { LayoutRelatorio } from '@/components/relatorio/LayoutRelatorio'
import { compararPeriodos, filtrar, razao, serieTemporal } from '@/lib/cubo'
import { useMeta, useRelatorio } from '@/lib/dados'
import { useFiltrosResolvidos, type FiltrosResolvidos } from '@/lib/filtros'
import { fmtCompacto, fmtNumero, fmtPct, variacao } from '@/lib/formato'
import type { DadosRelatorio } from '@/types/cubo'
import { BlocoCanais } from './atendimento/BlocoCanais'
import { BlocoHeatmap } from './atendimento/BlocoHeatmap'
import { BlocoMotivos } from './atendimento/BlocoMotivos'
import { BlocoNps } from './atendimento/BlocoNps'
import { BlocoSatisfacao } from './atendimento/BlocoSatisfacao'
import { BlocoVolume } from './atendimento/BlocoVolume'
import { Secao } from './atendimento/Comuns'
import { difPP, difPts, DIM_CANAL, fmtMMSS, MEDIDAS_NPS, partesNps } from './atendimento/util'

const ID = 'atendimento'
const MEDIDAS_CONTATOS = ['contatos', 'atendidos', 'abandonados', 'soma_tma_seg', 'soma_tme_seg', 'base_fcr', 'resolvidos_fcr']
const MEDIDAS_CSAT = ['respostas', 'satisfeitos']

/** Relatório de Atendimento ao Cliente: volume, tempos, abandono, FCR, motivos, perfil horário, NPS e CSAT. */
export default function Atendimento() {
  const { dados, carregando } = useRelatorio(ID)
  const { dados: meta } = useMeta()
  const f = useFiltrosResolvidos({ dimCanal: DIM_CANAL })
  const completo = !!dados && ['contatos', 'motivos', 'hora', 'nps', 'csat', 'detracao'].every((c) => dados.cubos[c])

  return (
    <LayoutRelatorio
      relatorio={ID}
      subtitulo="Quanto o cliente procura a administradora, por onde, quanto espera, o que resolve na primeira vez e como avalia o atendimento."
      filtros={{
        filtros: ['periodo', 'granularidade', 'canal', 'segmento', 'regional', 'uf'],
        canal: { rotulo: 'Canal', opcoes: meta?.canais_atendimento ?? [] },
      }}
      carregando={carregando}
      vazio={!completo}
    >
      {completo && dados && <Conteudo dados={dados} f={f} />}
    </LayoutRelatorio>
  )
}

function Conteudo({ dados, f }: { dados: DadosRelatorio; f: FiltrosResolvidos }) {
  const { contatos, motivos, hora, nps, csat, detracao } = dados.cubos

  // ---- KPIs: período atual × período anterior de mesmo tamanho (razões sempre de numerador/denominador)
  const kpi = useMemo(() => {
    const c = compararPeriodos(contatos, f.filtrosCubo, f.meta, MEDIDAS_CONTATOS)
    const de = (v: Record<string, number>) => ({
      contatos: v.contatos,
      atendidos: v.atendidos,
      abandonados: v.abandonados,
      tma: razao(v.soma_tma_seg, v.atendidos),
      tme: razao(v.soma_tme_seg, v.atendidos),
      abandono: razao(v.abandonados, v.contatos),
      fcr: razao(v.resolvidos_fcr, v.base_fcr),
    })
    const temBase = !!c.periodoAnterior && c.anterior.contatos > 0
    return { atual: de(c.atual), anterior: temBase ? de(c.anterior) : null }
  }, [contatos, f.filtrosCubo, f.meta])

  const serie = useMemo(() => {
    const s = serieTemporal(contatos, filtrar(contatos, f.filtrosCubo, f.meta), f.granularidade, MEDIDAS_CONTATOS, f.periodo)
    const div = (a: number[], b: number[]) => a.map((v, i) => (b[i] > 0 ? v / b[i] : null))
    return {
      contatos: s.valores.contatos,
      tma: div(s.valores.soma_tma_seg, s.valores.atendidos),
      tme: div(s.valores.soma_tme_seg, s.valores.atendidos),
      abandono: div(s.valores.abandonados, s.valores.contatos),
      fcr: div(s.valores.resolvidos_fcr, s.valores.base_fcr),
    }
  }, [contatos, f.filtrosCubo, f.meta, f.granularidade, f.periodo])

  const kpiNps = useMemo(() => {
    const c = compararPeriodos(nps, f.filtrosCubo, f.meta, MEDIDAS_NPS)
    const s = serieTemporal(nps, filtrar(nps, f.filtrosCubo, f.meta), f.granularidade, MEDIDAS_NPS, f.periodo)
    return {
      atual: partesNps(c.atual),
      anterior: c.periodoAnterior ? partesNps(c.anterior).nps : null,
      spark: s.buckets.map((_, i) => partesNps(Object.fromEntries(MEDIDAS_NPS.map((k) => [k, s.valores[k][i]]))).nps),
    }
  }, [nps, f.filtrosCubo, f.meta, f.granularidade, f.periodo])

  const kpiCsat = useMemo(() => {
    const c = compararPeriodos(csat, f.filtrosCubo, f.meta, MEDIDAS_CSAT)
    const s = serieTemporal(csat, filtrar(csat, f.filtrosCubo, f.meta), f.granularidade, MEDIDAS_CSAT, f.periodo)
    return {
      atual: razao(c.atual.satisfeitos, c.atual.respostas),
      anterior: c.periodoAnterior ? razao(c.anterior.satisfeitos, c.anterior.respostas) : null,
      respostas: c.atual.respostas,
      spark: s.valores.satisfeitos.map((v, i) => (s.valores.respostas[i] > 0 ? v / s.valores.respostas[i] : null)),
    }
  }, [csat, f.filtrosCubo, f.meta, f.granularidade, f.periodo])

  const a = kpi.atual
  const b = kpi.anterior
  const vAbandono = difPP(a.abandono, b?.abandono ?? null)
  const vFcr = difPP(a.fcr, b?.fcr ?? null)
  const vNps = difPts(kpiNps.atual.nps, kpiNps.anterior)
  const vCsat = difPP(kpiCsat.atual, kpiCsat.anterior)
  const irParaNps = () => document.getElementById('nps')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          className="sm:col-span-2"
          rotulo="Volume de contatos"
          icone={Headset}
          valor={fmtCompacto(a.contatos)}
          variacao={variacao(a.contatos, b?.contatos)}
          maiorE="neutro"
          sparkline={serie.contatos}
          detalhe={`${fmtNumero(a.contatos)} contatos · ${fmtCompacto(a.atendidos)} atendidos e ${fmtCompacto(a.abandonados)} abandonados`}
          definicao="Total de contatos recebidos em todos os canais de atendimento no período, atendidos ou não."
        />
        <KpiCard
          rotulo="TMA"
          icone={Clock}
          valor={fmtMMSS(a.tma)}
          variacao={variacao(a.tma, b?.tma)}
          maiorE="pior"
          sparkline={serie.tma}
          definicao="Tempo médio de atendimento (mm:ss): soma do tempo de atendimento dividida pelos contatos atendidos."
        />
        <KpiCard
          rotulo="TME"
          icone={Hourglass}
          valor={fmtMMSS(a.tme)}
          variacao={variacao(a.tme, b?.tme)}
          maiorE="pior"
          sparkline={serie.tme}
          definicao="Tempo médio de espera (mm:ss): soma do tempo em fila dividida pelos contatos atendidos."
        />
        <KpiCard
          rotulo="Taxa de abandono"
          icone={PhoneOff}
          valor={fmtPct(a.abandono)}
          variacao={vAbandono.variacao}
          variacaoTexto={vAbandono.texto}
          maiorE="pior"
          sparkline={serie.abandono}
          definicao="Contatos abandonados antes do atendimento divididos pelo total de contatos. Subir é ruim."
        />
        <KpiCard
          rotulo="FCR"
          icone={ThumbsUp}
          valor={fmtPct(a.fcr)}
          variacao={vFcr.variacao}
          variacaoTexto={vFcr.texto}
          sparkline={serie.fcr}
          definicao="First Contact Resolution: contatos resolvidos no primeiro contato divididos pelos contatos atendidos."
        />
        <KpiCard
          rotulo="NPS"
          icone={Gauge}
          valor={kpiNps.atual.nps == null ? '–' : fmtNumero(kpiNps.atual.nps, 0)}
          variacao={vNps.variacao}
          variacaoTexto={vNps.texto}
          sparkline={kpiNps.spark}
          onClick={irParaNps}
          definicao={`Net Promoter Score: % de promotores menos % de detratores (${fmtNumero(kpiNps.atual.respostas)} respostas no período).`}
        />
        <KpiCard
          rotulo="CSAT"
          icone={Smile}
          valor={fmtPct(kpiCsat.atual)}
          variacao={vCsat.variacao}
          variacaoTexto={vCsat.texto}
          sparkline={kpiCsat.spark}
          definicao={`Satisfação pós-atendimento: respostas com nota 4 ou 5 divididas pelo total de respostas (${fmtNumero(kpiCsat.respostas)} no período).`}
        />
      </div>

      <Secao titulo="Volume e canais" descricao="A tendência da demanda e o nível de serviço de cada canal. Clicar num canal nos comparativos filtra o relatório inteiro.">
        <BlocoVolume cubo={contatos} f={f} />
        <BlocoCanais cubo={contatos} f={f} />
      </Secao>

      <BlocoMotivos cubo={motivos} f={f} />

      <Secao titulo="Perfil horário" descricao="Quando a demanda chega e quando a fila não dá conta.">
        <BlocoHeatmap cubo={hora} f={f} />
      </Secao>

      <BlocoNps cubo={nps} f={f} />
      <BlocoSatisfacao detracao={detracao} csat={csat} f={f} />
    </>
  )
}
