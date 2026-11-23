import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { EmptyState } from '@/components/dados/EmptyState'
import { SkeletonRelatorio } from '@/components/dados/Skeletons'
import { CabecalhoPagina } from '@/components/layout/Pagina'
import { relatorioPorId } from '@/lib/relatorios'
import { cn } from '@/lib/utils'
import { BarraFiltros, type BarraFiltrosProps } from './BarraFiltros'

export interface LayoutRelatorioProps {
  /** id do relatório: liga o ícone/título padrão (o selo de confiança fica na página Impacto nos relatórios) */
  relatorio: string
  titulo?: string
  subtitulo?: ReactNode
  icone?: LucideIcon
  /** props da barra de filtros (quais filtros, opções de canal...). `false` esconde a barra */
  filtros?: BarraFiltrosProps | false
  /** ações no cabeçalho (ex.: exportar, link para o glossário) */
  acoes?: ReactNode
  /** mostra o esqueleto no lugar do conteúdo */
  carregando?: boolean
  /** mostra o estado vazio no lugar do conteúdo */
  vazio?: boolean
  mensagemVazio?: { titulo?: string; descricao?: ReactNode }
  children?: ReactNode
  className?: string
}

/**
 * Casca das páginas de relatório: cabeçalho, barra de filtros fixa e conteúdo
 * com estados de carregando/vazio.
 *
 *   <LayoutRelatorio relatorio="vendas" subtitulo="..." filtros={{ canal: { rotulo: 'Canal', opcoes } }}
 *                    carregando={carregando} vazio={!dados}> ...KPIs e gráficos... </LayoutRelatorio>
 */
export function LayoutRelatorio({ relatorio, titulo, subtitulo, icone, filtros, acoes, carregando, vazio, mensagemVazio, children, className }: LayoutRelatorioProps) {
  const info = relatorioPorId(relatorio)
  return (
    <div className={cn('mx-auto w-full max-w-[1600px]', className)}>
      <CabecalhoPagina titulo={titulo ?? info?.titulo ?? 'Relatório'} subtitulo={subtitulo ?? info?.descricao} icone={icone ?? info?.icone} acoes={acoes} />
      {filtros !== false && (
        <div className="sticky top-14 z-20 -mx-4 mt-4 border-b border-transparent bg-background/85 px-4 py-2.5 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <BarraFiltros {...filtros} />
        </div>
      )}
      <div className="mt-3 min-h-[40vh]">
        {carregando ? (
          <SkeletonRelatorio />
        ) : vazio ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/60">
            <EmptyState
              titulo={mensagemVazio?.titulo ?? 'Dados do relatório ainda não disponíveis'}
              descricao={mensagemVazio?.descricao ?? 'Os cubos deste relatório ainda não foram gerados neste ambiente. Assim que a carga for publicada, os indicadores aparecem aqui.'}
            />
          </div>
        ) : (
          <div className="animate-entrar space-y-5">{children}</div>
        )}
      </div>
    </div>
  )
}
