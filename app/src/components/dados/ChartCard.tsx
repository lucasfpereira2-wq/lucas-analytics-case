import { Download, Image as IconeImagem, Maximize2, Minimize2 } from 'lucide-react'
import { useEffect, useState, type ReactNode, type RefObject } from 'react'
import { Button } from '@/components/ui/button'
import { Dica } from '@/components/ui/tooltip'
import { exportarCSV, type ColunaCSV } from '@/lib/exportar'
import { cn } from '@/lib/utils'
import { EmptyState } from './EmptyState'
import { SkeletonGrafico } from './Skeletons'

/** Compatível com EChartHandle, sem importar o ECharts aqui. */
interface AlvoPNG {
  exportarPNG: (nomeArquivo: string) => void
}

export interface DadosCSV {
  /** nome do arquivo (sem extensão) */
  nome: string
  colunas: (string | ColunaCSV<never>)[]
  linhas: unknown[]
}

export interface ChartCardProps {
  titulo: string
  subtitulo?: ReactNode
  /** conteúdo (normalmente um <EChart/>, mas pode ser tabela ou qualquer nó) */
  children: ReactNode
  /** habilita "Exportar CSV": objeto pronto ou função chamada no clique */
  csv?: DadosCSV | (() => DadosCSV)
  /** ref do <EChart/> para habilitar "Exportar PNG" */
  chartRef?: RefObject<AlvoPNG | null>
  /** nome do arquivo PNG (padrão: título do card) */
  nomeArquivo?: string
  /** habilita o botão de tela cheia (padrão true) */
  telaCheia?: boolean
  /** ações extras à esquerda dos botões padrão (ex.: seletor de métrica) */
  acoes?: ReactNode
  carregando?: boolean
  vazio?: boolean
  mensagemVazio?: string
  /** rodapé discreto (fonte do dado, nota metodológica) */
  rodape?: ReactNode
  /** altura mínima da área do gráfico nos estados de loading/vazio */
  alturaMinima?: number
  className?: string
  classNameConteudo?: string
}

function slug(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function ChartCard({
  titulo,
  subtitulo,
  children,
  csv,
  chartRef,
  nomeArquivo,
  telaCheia = true,
  acoes,
  carregando,
  vazio,
  mensagemVazio = 'Nenhum dado para os filtros selecionados.',
  rodape,
  alturaMinima = 260,
  className,
  classNameConteudo,
}: ChartCardProps) {
  const [cheia, setCheia] = useState(false)

  useEffect(() => {
    if (!cheia) return
    const fechar = (e: KeyboardEvent) => e.key === 'Escape' && setCheia(false)
    window.addEventListener('keydown', fechar)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', fechar)
      document.body.style.overflow = ''
    }
  }, [cheia])

  const baixarCSV = () => {
    if (!csv) return
    const d = typeof csv === 'function' ? csv() : csv
    exportarCSV(d.nome, d.colunas as string[], d.linhas as unknown[][])
  }
  const pronto = !carregando && !vazio

  return (
    <>
      {cheia && <div className="fixed inset-0 z-40 bg-marinho-950/60 backdrop-blur-[2px]" onClick={() => setCheia(false)} aria-hidden />}
      <section
        className={cn(
          'flex min-w-0 flex-col rounded-2xl border border-border bg-card shadow-card',
          cheia && 'fixed inset-3 z-50 shadow-elevada sm:inset-6',
          className,
        )}
        aria-label={titulo}
      >
        <header className="flex items-start gap-3 px-5 pt-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold leading-snug tracking-tight">{titulo}</h3>
            {subtitulo && <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{subtitulo}</p>}
          </div>
          <div className="-mr-2 -mt-1 flex shrink-0 items-center gap-0.5">
            {acoes}
            {csv && pronto && (
              <Dica texto="Exportar CSV">
                <Button variant="ghost" size="icon-sm" onClick={baixarCSV} aria-label="Exportar CSV">
                  <Download />
                </Button>
              </Dica>
            )}
            {chartRef && pronto && (
              <Dica texto="Exportar PNG">
                <Button variant="ghost" size="icon-sm" onClick={() => chartRef.current?.exportarPNG(nomeArquivo ?? slug(titulo))} aria-label="Exportar PNG">
                  <IconeImagem />
                </Button>
              </Dica>
            )}
            {telaCheia && (
              <Dica texto={cheia ? 'Sair da tela cheia (Esc)' : 'Tela cheia'}>
                <Button variant="ghost" size="icon-sm" onClick={() => setCheia((v) => !v)} aria-label={cheia ? 'Sair da tela cheia' : 'Tela cheia'}>
                  {cheia ? <Minimize2 /> : <Maximize2 />}
                </Button>
              </Dica>
            )}
          </div>
        </header>
        <div className={cn('min-h-0 min-w-0 flex-1 px-5 pb-4 pt-3', cheia && '[&>div[role=img]]:!h-full', classNameConteudo)}>
          {carregando ? (
            <SkeletonGrafico altura={alturaMinima} />
          ) : vazio ? (
            <div style={{ minHeight: alturaMinima }} className="grid">
              <EmptyState compacto titulo="Sem dados" descricao={mensagemVazio} />
            </div>
          ) : (
            children
          )}
        </div>
        {rodape && <footer className="border-t border-border px-5 py-2.5 text-xs text-muted-foreground">{rodape}</footer>}
      </section>
    </>
  )
}
