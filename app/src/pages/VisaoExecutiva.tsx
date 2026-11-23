import { LayoutDashboard, Radar } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState, SkeletonGrafico, SkeletonKpi } from '@/components/dados'
import { Pagina } from '@/components/layout/Pagina'
import { Button } from '@/components/ui/button'
import { useIncidentes, useMeta, useSaude, useSelos } from '@/lib/dados'
import { LinhaIndicadores } from './visao/Indicadores'
import { PainelIndice } from './visao/Indice'
import { Atalhos, ConfiancaRelatorios, DimensoesQualidade, SaudeDominios } from './visao/Paineis'
import { TopProblemas } from './visao/Problemas'

/** Visão Executiva: o estado dos dados hoje e os problemas que afetam o negócio, em uma tela. */
export default function VisaoExecutiva() {
  const { dados: saude, carregando } = useSaude()
  const { dados: incidentes, carregando: carregandoInc } = useIncidentes()
  const { dados: selos } = useSelos()
  const { dados: meta } = useMeta()

  return (
    <Pagina
      titulo="Visão Executiva"
      subtitulo="A saúde dos dados e dos relatórios de uma administradora fictícia em uma única tela."
      icone={LayoutDashboard}
      acoes={
        <Button asChild variant="outline" size="sm">
          <Link to="/farol">
            <Radar />
            Abrir o Farol de Dados
          </Link>
        </Button>
      }
    >
      {carregando ? (
        <>
          <SkeletonGrafico altura={200} />
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <SkeletonKpi key={i} />
            ))}
          </div>
        </>
      ) : !saude ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60">
          <EmptyState titulo="Dados de governança ainda não disponíveis" descricao="O índice de saúde aparece aqui assim que o motor de governança gerar os arquivos de dados." />
        </div>
      ) : (
        <>
          <PainelIndice saude={saude} dataReferencia={meta?.data_referencia} />
          <LinhaIndicadores saude={saude} />
        </>
      )}

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-8">
          {incidentes?.length ? (
            <TopProblemas incidentes={incidentes} />
          ) : carregandoInc ? (
            <SkeletonGrafico altura={420} />
          ) : (
            <div className="h-full rounded-2xl border border-dashed border-border bg-card/60">
              <EmptyState titulo="Nenhum incidente aberto" descricao="Quando houver problemas de dados com impacto no negócio, eles aparecem aqui por prioridade." />
            </div>
          )}
        </div>
        <div className="flex min-w-0 xl:col-span-4">
          <ConfiancaRelatorios selos={selos} />
        </div>
      </div>

      {saude && (
        <div className="grid gap-5 xl:grid-cols-12">
          <div className="min-w-0 xl:col-span-8">
            <SaudeDominios saude={saude} />
          </div>
          <div className="flex min-w-0 xl:col-span-4">
            <DimensoesQualidade saude={saude} />
          </div>
        </div>
      )}

      <Atalhos />
    </Pagina>
  )
}
