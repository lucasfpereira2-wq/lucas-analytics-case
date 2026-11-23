import { ArrowRight, ChevronDown, GitBranch, ShieldAlert, ShieldCheck, ShieldQuestion, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { useSelos } from '@/lib/dados'
import { fmtDataHora, fmtHoras } from '@/lib/formato'
import { cn } from '@/lib/utils'
import type { NivelSelo, Selo } from '@/types/governanca'
import { StatusBadge } from './StatusBadge'
import { TextoComTabelas } from './TextoComTabelas'

const NIVEL: Record<NivelSelo, { icone: LucideIcon; caixa: string; marca: string; texto: string; faixa: string }> = {
  confiavel: {
    icone: ShieldCheck,
    caixa: 'border-status-verde/35 bg-status-verde-fundo',
    marca: 'bg-status-verde text-white',
    texto: 'text-status-verde-texto',
    faixa: 'bg-status-verde',
  },
  atencao: {
    icone: ShieldAlert,
    caixa: 'border-status-amarelo/45 bg-status-amarelo-fundo',
    marca: 'bg-status-amarelo text-marinho-950',
    texto: 'text-status-amarelo-texto',
    faixa: 'bg-status-amarelo',
  },
  critico: {
    icone: ShieldAlert,
    caixa: 'border-status-vermelho/40 bg-status-vermelho-fundo',
    marca: 'bg-status-vermelho text-white',
    texto: 'text-status-vermelho-texto',
    faixa: 'bg-status-vermelho',
  },
}

export interface SeloConfiancaProps {
  /** id do relatório: vendas | cobranca-carteira | cobranca-safra | atendimento | assembleias */
  relatorio: string
  /** começa expandido (padrão: fechado; selos com problema mostram o botão "Ver detalhes") */
  expandido?: boolean
  className?: string
}

/**
 * Selo de Confiança: diz se os números de um relatório podem ser usados (exibido na página Impacto nos relatórios).
 * Deriva de governanca/selos.json (upstream do relatório na linhagem).
 */
export function SeloConfianca({ relatorio, expandido = false, className }: SeloConfiancaProps) {
  const { dados, carregando } = useSelos()
  const [aberto, setAberto] = useState(expandido)
  const selo: Selo | undefined = dados?.[relatorio]

  if (carregando) return <Skeleton className={cn('h-[52px] w-full rounded-xl', className)} />

  if (!selo) {
    return (
      <div className={cn('flex items-center gap-3 rounded-xl border border-dashed border-border bg-card/60 px-4 py-3 text-[13px] text-muted-foreground', className)} role="status">
        <ShieldQuestion className="size-4 shrink-0" aria-hidden />
        <span>
          <strong className="font-semibold text-foreground">Selo de confiança indisponível.</strong> Os dados de governança deste relatório ainda não foram gerados.
        </span>
      </div>
    )
  }

  const n = NIVEL[selo.nivel]
  const Icone = n.icone
  const temProblemas = selo.problemas.length > 0
  const destino = selo.tabela_principal ? `/farol/${encodeURIComponent(selo.tabela_principal)}` : '/farol'
  const idPainel = `selo-${relatorio}`

  return (
    <div className={cn('relative overflow-hidden rounded-xl border animate-entrar', n.caixa, className)} role={selo.nivel === 'confiavel' ? 'status' : 'alert'}>
      <span className={cn('absolute inset-y-0 left-0 w-1', n.faixa)} aria-hidden />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5 pl-5 pr-3">
        <span className={cn('relative grid size-8 shrink-0 place-items-center rounded-full', n.marca)}>
          {selo.nivel !== 'confiavel' && <span className={cn('absolute inset-0 rounded-full', n.faixa)} style={{ animation: 'farol-pulso 2.4s ease-out infinite' }} aria-hidden />}
          <Icone className="relative size-[18px]" aria-hidden />
        </span>
        <p className="min-w-0 flex-1 basis-72 text-[13.5px] leading-snug text-foreground">
          <strong className={cn('font-semibold', n.texto)}>{selo.titulo}</strong>
          <span className="text-foreground/50"> · </span>
          {selo.nivel === 'confiavel' && !selo.mensagem ? (
            <>atualizados há {fmtHoras(selo.horas_desde_atualizacao)}</>
          ) : (
            <TextoComTabelas texto={semTituloRepetido(selo.mensagem, selo.titulo)} tabelas={selo.tabelas_fonte.length ? [...selo.tabelas_fonte, ...selo.problemas.map((p) => p.tabela)] : undefined} />
          )}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <span className="hidden whitespace-nowrap px-1 text-xs text-foreground/60 lg:inline" title={`Última carga: ${fmtDataHora(selo.atualizado_em)}`}>
            Atualizado há {fmtHoras(selo.horas_desde_atualizacao)}
          </span>
          {(temProblemas || selo.tabelas_fonte.length > 0) && (
            <button
              type="button"
              onClick={() => setAberto((v) => !v)}
              aria-expanded={aberto}
              aria-controls={idPainel}
              className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-foreground/80 transition-colors hover:bg-foreground/[0.07]"
            >
              {aberto ? 'Ocultar detalhes' : temProblemas ? `Ver ${selo.problemas.length} ${selo.problemas.length === 1 ? 'problema' : 'problemas'}` : 'Ver origem'}
              <ChevronDown className={cn('size-3.5 transition-transform duration-200', aberto && 'rotate-180')} aria-hidden />
            </button>
          )}
        </div>
      </div>

      <div id={idPainel} className={cn('grid transition-[grid-template-rows] duration-300 ease-out', aberto ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden">
          <div className="space-y-3 border-t border-foreground/10 bg-card/70 px-5 py-4">
            {temProblemas ? (
              <ul className="space-y-2.5">
                {selo.problemas.map((p, i) => (
                  <li key={`${p.tabela}-${i}`} className="grid gap-x-4 gap-y-1 text-[13px] leading-snug sm:grid-cols-[minmax(0,15rem)_1fr]">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={p.status} tamanho="sm" />
                      <Link to={`/farol/${encodeURIComponent(p.tabela)}`} className="truncate font-mono text-xs font-medium text-foreground underline decoration-foreground/30 underline-offset-2 hover:decoration-foreground">
                        {p.tabela}
                      </Link>
                    </div>
                    <div>
                      <TextoComTabelas texto={p.texto} className="text-foreground/90" />
                      {p.impacto_estimado && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground/80">Impacto:</span> {p.impacto_estimado}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-foreground/80">Todas as tabelas de origem estão dentro do SLA e com os testes de qualidade aprovados.</p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-muted-foreground">
              <span>
                {selo.tabelas_fonte.length > 0 && <>{selo.tabelas_fonte.length} tabelas na origem deste relatório · </>}
                última carga em {fmtDataHora(selo.atualizado_em)}
              </span>
              <Link to={destino} className="inline-flex items-center gap-1.5 font-semibold text-foreground hover:text-primary">
                <GitBranch className="size-3.5" aria-hidden />
                Ver linhagem no Farol
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Evita "Dados confiáveis · Dados confiáveis, atualizados há 2h": remove o título quando a mensagem já começa com ele. */
function semTituloRepetido(mensagem: string, titulo: string): string {
  if (!mensagem.toLowerCase().startsWith(titulo.toLowerCase())) return mensagem
  const resto = mensagem.slice(titulo.length).replace(/^[\s,.:·-]+/, '')
  return resto ? resto.charAt(0).toUpperCase() + resto.slice(1) : mensagem
}
