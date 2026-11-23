/** Peças compartilhadas pelas telas do Farol de Dados (catálogo e detalhe da tabela). */
import { Ban, CircleCheck, Clock, KeyRound, Minus, OctagonAlert, TriangleAlert, type LucideIcon } from 'lucide-react'
import { Fragment, createContext, useContext, type CSSProperties, type ReactNode } from 'react'
import { STATUS_INFO, TextoComTabelas } from '@/components/dados'
import { fmtData } from '@/lib/formato'
import { cn } from '@/lib/utils'
import type { Camada, Criticidade, Status, StatusExecucao, TabelaResumo } from '@/types/governanca'

export const ROTULO_CAMADA: Record<Camada, string> = { staging: 'Staging', core: 'Core', mart: 'Mart' }
export const ROTULO_CRITICIDADE: Record<Criticidade, string> = { alta: 'Alta', media: 'Média', baixa: 'Baixa' }
export const ORDEM_STATUS: Record<Status, number> = { vermelho: 0, amarelo: 1, verde: 2 }
export const ORDEM_CRITICIDADE: Record<Criticidade, number> = { alta: 0, media: 1, baixa: 2 }
export const ORDEM_CAMADA: Record<Camada, number> = { staging: 0, core: 1, mart: 2 }
export const SEM_DONO = 'Sem dono'

export const rotaTabela = (nome: string) => `/farol/${encodeURIComponent(nome)}`

/** Ordem padrão do Farol: críticas primeiro, depois atenção; dentro do status, a menos saudável antes. */
export function ordemPadrao(a: TabelaResumo, b: TabelaResumo): number {
  return ORDEM_STATUS[a.status] - ORDEM_STATUS[b.status] || a.saude - b.saude || a.nome.localeCompare(b.nome)
}

/**
 * Status de execução: aqui a cor é o próprio dado. Sucesso fica propositalmente mais suave para que
 * alerta, atraso e falha saltem; "atrasada" e "não executou" ganham hachura (não dependem só da cor).
 */
export const EXEC_INFO: Record<StatusExecucao, { rotulo: string; icone: LucideIcon; fundo: string; texto: string }> = {
  sucesso: { rotulo: 'Sucesso', icone: CircleCheck, fundo: 'color-mix(in srgb, var(--status-verde) 52%, transparent)', texto: 'text-status-verde-texto' },
  alerta: { rotulo: 'Concluída com alerta', icone: TriangleAlert, fundo: 'var(--status-amarelo)', texto: 'text-status-amarelo-texto' },
  atrasada: {
    rotulo: 'Atrasada',
    icone: Clock,
    fundo: 'repeating-linear-gradient(135deg, var(--status-amarelo) 0 3px, color-mix(in srgb, var(--status-amarelo) 30%, transparent) 3px 6px)',
    texto: 'text-status-amarelo-texto',
  },
  falha: { rotulo: 'Falha', icone: OctagonAlert, fundo: 'var(--status-vermelho)', texto: 'text-status-vermelho-texto' },
  nao_executou: {
    rotulo: 'Não executou',
    icone: Ban,
    fundo: 'repeating-linear-gradient(135deg, color-mix(in srgb, var(--status-vermelho) 85%, transparent) 0 2px, color-mix(in srgb, var(--status-vermelho) 14%, transparent) 2px 5px)',
    texto: 'text-status-vermelho-texto',
  },
  sem_agenda: { rotulo: 'Sem agenda no dia', icone: Minus, fundo: 'color-mix(in srgb, var(--muted-foreground) 13%, transparent)', texto: 'text-muted-foreground' },
}
export const ORDEM_EXEC: StatusExecucao[] = ['sucesso', 'alerta', 'atrasada', 'falha', 'nao_executou', 'sem_agenda']

export const estiloExec = (s: StatusExecucao): CSSProperties => ({ background: EXEC_INFO[s]?.fundo ?? EXEC_INFO.sem_agenda.fundo })

export function LegendaExecucoes({ className }: { className?: string }) {
  return (
    <ul className={cn('flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground', className)} aria-label="Legenda dos status de execução">
      {ORDEM_EXEC.map((s) => (
        <li key={s} className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-[3px]" style={estiloExec(s)} aria-hidden />
          {EXEC_INFO[s].rotulo}
        </li>
      ))}
    </ul>
  )
}

/** Mini-faixa das execuções (uma marca por dia, da mais antiga para a mais recente). */
export function FaixaExecucoes({ execucoes, dias, altura = 14, className }: { execucoes: StatusExecucao[]; dias?: string[]; altura?: number; className?: string }) {
  const falhas = execucoes.filter((e) => e === 'falha' || e === 'nao_executou').length
  return (
    <div
      className={cn('flex w-full gap-px', className)}
      role="img"
      aria-label={`Execuções dos últimos ${execucoes.length} dias: ${falhas} com falha`}
      style={{ height: altura }}
    >
      {execucoes.map((e, i) => (
        <span
          key={i}
          className="min-w-0 flex-1 first:rounded-l-[3px] last:rounded-r-[3px]"
          style={estiloExec(e)}
          title={dias?.[i] ? `${fmtData(dias[i])} · ${EXEC_INFO[e]?.rotulo ?? e}` : EXEC_INFO[e]?.rotulo}
        />
      ))}
    </div>
  )
}

/** Selo bem visível para tabela sem chave primária. */
export function SeloSemPK({ grande, className }: { grande?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md bg-status-vermelho font-bold uppercase tracking-wider text-white',
        grande ? 'px-2.5 py-1 text-xs' : 'px-1.5 py-0.5 text-[10px]',
        className,
      )}
      title="Tabela sem chave primária definida: não há garantia de unicidade dos registros"
    >
      <KeyRound className={grande ? 'size-3.5' : 'size-3'} aria-hidden />
      Sem PK
    </span>
  )
}

export function Etiqueta({ children, tom = 'neutro', className }: { children: ReactNode; tom?: 'neutro' | 'acento'; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[10.5px] font-medium',
        tom === 'acento' ? 'border-primary/30 bg-accent text-accent-foreground' : 'border-border bg-secondary text-muted-foreground',
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Ícone redondo do farol (tamanhos sm/md/lg). Sempre acompanhado de texto ou título. */
export function IconeFarol({ status, tamanho = 'md', pulsar, className }: { status: Status; tamanho?: 'sm' | 'md' | 'lg'; pulsar?: boolean; className?: string }) {
  const s = STATUS_INFO[status]
  const Icone = s.icone
  const caixa = tamanho === 'lg' ? 'size-14' : tamanho === 'md' ? 'size-8' : 'size-6'
  const ic = tamanho === 'lg' ? 'size-7' : tamanho === 'md' ? 'size-[18px]' : 'size-3.5'
  return (
    <span className={cn('relative grid shrink-0 place-items-center rounded-full', caixa, s.fundo, s.texto, className)} title={s.rotulo}>
      {pulsar && <span className={cn('absolute inset-0 rounded-full', s.ponto)} style={{ animation: 'farol-pulso 2.4s ease-out infinite' }} aria-hidden />}
      <Icone className={cn('relative', ic)} aria-hidden />
      <span className="sr-only">{s.rotulo}</span>
    </span>
  )
}

/** Texto com trechos entre crases em fonte de código, SEM links (para uso dentro de cards clicáveis). */
export function TextoCodigo({ texto, className }: { texto: string; className?: string }) {
  const partes = texto.split(/`([^`]+)`/g)
  return (
    <span className={className}>
      {partes.map((p, i) =>
        i % 2 === 0 ? (
          <Fragment key={i}>{p}</Fragment>
        ) : (
          <code key={i} className="rounded bg-foreground/[0.07] px-1 py-px font-mono text-[0.88em] font-medium">
            {p}
          </code>
        ),
      )}
    </span>
  )
}

/** Remove as crases (para tooltips, title e CSV). */
export const semCrases = (t: string) => t.replace(/`/g, '')

/**
 * Nomes das tabelas do catálogo. Com eles, só viram link os trechos entre crases que são tabelas de fato
 * (ids de rotina como `core_financeiro_parcelas` ficam apenas em fonte de código).
 */
export const TabelasConhecidas = createContext<string[] | undefined>(undefined)

export function TextoTabelas({ texto, className }: { texto: string; className?: string }) {
  const tabelas = useContext(TabelasConhecidas)
  return <TextoComTabelas texto={texto} tabelas={tabelas} className={className} />
}
