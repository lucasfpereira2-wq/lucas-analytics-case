import { CircleCheck, OctagonAlert, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { NivelSelo, Status } from '@/types/governanca'
import { cn } from '@/lib/utils'

/** Aparência de cada status: sempre ícone + rótulo, nunca só a cor. */
// eslint-disable-next-line react/only-export-components
export const STATUS_INFO: Record<Status, { rotulo: string; icone: LucideIcon; texto: string; fundo: string; ponto: string; borda: string }> = {
  verde: { rotulo: 'Saudável', icone: CircleCheck, texto: 'text-status-verde-texto', fundo: 'bg-status-verde-fundo', ponto: 'bg-status-verde', borda: 'border-status-verde/35' },
  amarelo: { rotulo: 'Atenção', icone: TriangleAlert, texto: 'text-status-amarelo-texto', fundo: 'bg-status-amarelo-fundo', ponto: 'bg-status-amarelo', borda: 'border-status-amarelo/40' },
  vermelho: { rotulo: 'Crítico', icone: OctagonAlert, texto: 'text-status-vermelho-texto', fundo: 'bg-status-vermelho-fundo', ponto: 'bg-status-vermelho', borda: 'border-status-vermelho/35' },
}

// eslint-disable-next-line react/only-export-components
export function statusDoSelo(nivel: NivelSelo): Status {
  return nivel === 'confiavel' ? 'verde' : nivel === 'atencao' ? 'amarelo' : 'vermelho'
}

export interface StatusBadgeProps {
  status: Status
  /** sobrescreve o rótulo padrão (Saudável / Atenção / Crítico) */
  rotulo?: string
  tamanho?: 'sm' | 'md'
  /** só borda, sem fundo colorido (para tabelas densas) */
  discreto?: boolean
  className?: string
}

export function StatusBadge({ status, rotulo, tamanho = 'md', discreto, className }: StatusBadgeProps) {
  const s = STATUS_INFO[status]
  const Icone = s.icone
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-medium',
        s.texto,
        s.borda,
        discreto ? 'bg-transparent' : s.fundo,
        tamanho === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        className,
      )}
    >
      <Icone className={tamanho === 'sm' ? 'size-3' : 'size-3.5'} aria-hidden />
      {rotulo ?? s.rotulo}
    </span>
  )
}

export interface StatusDotProps {
  status: Status
  /** anel pulsante (use com parcimônia: itens que pedem atenção) */
  pulsar?: boolean
  tamanho?: number
  className?: string
  /** texto para leitores de tela; padrão = rótulo do status */
  titulo?: string
}

/** Ponto de status compacto. O significado também vai em texto acessível (title/sr-only). */
export function StatusDot({ status, pulsar, tamanho = 8, className, titulo }: StatusDotProps) {
  const s = STATUS_INFO[status]
  return (
    <span className={cn('relative inline-flex shrink-0', className)} style={{ width: tamanho, height: tamanho }} title={titulo ?? s.rotulo}>
      {pulsar && <span className={cn('absolute inset-0 rounded-full', s.ponto)} style={{ animation: 'farol-pulso 2.2s ease-out infinite' }} />}
      <span className={cn('relative inline-block size-full rounded-full', s.ponto)} />
      <span className="sr-only">{titulo ?? s.rotulo}</span>
    </span>
  )
}
