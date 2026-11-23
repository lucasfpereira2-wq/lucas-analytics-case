import { ArrowDownRight, ArrowUpRight, Info, Minus, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Dica } from '@/components/ui/tooltip'
import { fmtPct } from '@/lib/formato'
import { cn } from '@/lib/utils'
import { Sparkline } from './Sparkline'

export interface KpiCardProps {
  rotulo: string
  /** valor já formatado (use fmtMedida/fmtCompacto) */
  valor: ReactNode
  /** variação relativa vs período anterior, em fração (0.082 = +8,2%). null/undefined = sem comparação */
  variacao?: number | null
  /** quando a variação é em pontos percentuais (ex.: inadimplência), informe o texto pronto: "+0,4 p.p." */
  variacaoTexto?: string
  /** semântica da cor: 'melhor' = subir é bom (padrão); 'pior' = subir é ruim; 'neutro' = sem juízo */
  maiorE?: 'melhor' | 'pior' | 'neutro'
  /** texto ao lado da variação (padrão: "vs período anterior") */
  comparacao?: string
  /** série para o minigráfico */
  sparkline?: (number | null | undefined)[]
  /** definição da métrica (tooltip no ícone de informação) */
  definicao?: ReactNode
  icone?: LucideIcon
  /** linha auxiliar abaixo do valor (ex.: "Meta: R$ 1,3 bi") */
  detalhe?: ReactNode
  carregando?: boolean
  onClick?: () => void
  className?: string
}

export function KpiCard({
  rotulo,
  valor,
  variacao,
  variacaoTexto,
  maiorE = 'melhor',
  comparacao = 'vs período anterior',
  sparkline,
  definicao,
  icone: Icone,
  detalhe,
  carregando,
  onClick,
  className,
}: KpiCardProps) {
  const temVar = typeof variacao === 'number' && Number.isFinite(variacao)
  const estavel = temVar && Math.abs(variacao as number) < 0.0005
  const subiu = temVar && (variacao as number) > 0
  const bom = maiorE === 'neutro' || estavel ? null : subiu === (maiorE === 'melhor')
  const Seta = estavel ? Minus : subiu ? ArrowUpRight : ArrowDownRight
  const corVar = bom === null ? 'text-muted-foreground bg-muted' : bom ? 'text-status-verde-texto bg-status-verde-fundo' : 'text-status-vermelho-texto bg-status-vermelho-fundo'
  const Tag = onClick ? 'button' : 'div'

  return (
    <Tag
      onClick={onClick}
      className={cn(
        'group relative flex flex-col rounded-2xl border border-border bg-card p-5 text-left shadow-card transition-[box-shadow,border-color,transform] duration-200',
        onClick && 'hover:-translate-y-px hover:border-primary/40 hover:shadow-elevada',
        className,
      )}
    >
      <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
        {Icone && <Icone className="size-4 text-primary" aria-hidden />}
        <span className="truncate">{rotulo}</span>
        {definicao && (
          <Dica texto={definicao}>
            <span tabIndex={0} role="img" aria-label={`Definição de ${rotulo}`} className="ml-auto rounded-full text-muted-foreground/70 transition-colors hover:text-foreground">
              <Info className="size-3.5" />
            </span>
          </Dica>
        )}
      </div>

      {carregando ? (
        <>
          <Skeleton className="mt-3 h-8 w-32" />
          <Skeleton className="mt-3 h-4 w-40" />
        </>
      ) : (
        <>
          <div className="mt-2 flex items-end justify-between gap-3">
            <span className="tabular text-[28px] font-semibold leading-none tracking-tight">{valor}</span>
            {sparkline && sparkline.length > 1 && <Sparkline dados={sparkline} className="shrink-0" />}
          </div>
          <div className="mt-3 flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            {temVar || variacaoTexto ? (
              <>
                <span className={cn('tabular inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold', corVar)}>
                  <Seta className="size-3.5" aria-hidden />
                  {variacaoTexto ?? fmtPct(variacao as number, 1, { sinal: true })}
                </span>
                <span className="text-muted-foreground">{comparacao}</span>
              </>
            ) : (
              <span className="text-muted-foreground">{detalhe ?? 'Sem base de comparação'}</span>
            )}
          </div>
          {detalhe && (temVar || variacaoTexto) && <p className="mt-1.5 text-xs text-muted-foreground">{detalhe}</p>}
        </>
      )}
    </Tag>
  )
}
