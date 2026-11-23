import { ArrowRight, Milestone, Radar, Workflow, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { STATUS_INFO, StatusBadge, statusDoSelo, TextoComTabelas } from '@/components/dados'
import { Dica } from '@/components/ui/tooltip'
import { fmtHoras, fmtNumero } from '@/lib/formato'
import { RELATORIOS } from '@/lib/relatorios'
import { cn } from '@/lib/utils'
import type { Saude, Selo, Status } from '@/types/governanca'

const ROTULO_SELO: Record<Selo['nivel'], string> = { confiavel: 'Confiável', atencao: 'Atenção', critico: 'Problema crítico' }

/** Primeiras frases da mensagem do selo (ponto final seguido de maiúscula), para caber no card. */
function primeirasFrases(texto: string, n: number): string {
  const frases = texto.split(/(?<=[.!?])\s+(?=[A-ZÀ-Ú])/)
  return frases.slice(0, n).join(' ').trim()
}

/** Os relatórios e o nível de confiança de cada um (atalho para os relatórios). */
export function ConfiancaRelatorios({ selos }: { selos: Record<string, Selo> | null }) {
  return (
    <section id="confianca" aria-label="Confiança dos relatórios" className="flex w-full min-w-0 scroll-mt-20 flex-col rounded-2xl border border-border bg-card shadow-card">
      <header className="px-5 pb-3 pt-4">
        <h2 className="text-base font-semibold tracking-tight">Confiança dos relatórios</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">O selo de cada relatório deriva das tabelas que o alimentam. Clique para ver o impacto.</p>
      </header>
      <ul className="flex flex-1 flex-col divide-y divide-border border-t border-border">
        {RELATORIOS.map((r) => {
          const selo = r.relatorio ? selos?.[r.relatorio] : undefined
          const Icone = r.icone
          const status = selo ? statusDoSelo(selo.nivel) : null
          return (
            <li key={r.rota} className="relative flex flex-1 flex-col justify-center px-5 py-3.5 transition-colors hover:bg-secondary/50">
              {status && <span className={cn('absolute inset-y-3 left-0 w-[3px] rounded-r-full', STATUS_INFO[status].ponto)} aria-hidden />}
              <div className="flex items-center gap-2.5">
                <Icone className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <Link to={`/impactos?relatorio=${r.relatorio}`} className="min-w-0 truncate text-sm font-semibold tracking-tight after:absolute after:inset-0 hover:text-primary">
                  {r.titulo}
                </Link>
                {selo && status ? <StatusBadge status={status} rotulo={ROTULO_SELO[selo.nivel]} tamanho="sm" className="ml-auto" /> : <span className="ml-auto text-xs text-muted-foreground">Selo indisponível</span>}
              </div>
              {selo && (
                <p className="relative mt-1.5 line-clamp-5 text-[13px] leading-snug text-muted-foreground">
                  <TextoComTabelas texto={primeirasFrases(selo.mensagem, selo.nivel === 'confiavel' ? 1 : 2)} tabelas={[...selo.tabelas_fonte, ...selo.problemas.map((p) => p.tabela)]} />
                </p>
              )}
              {selo && (
                <p className="mt-1.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    Atualizado há {fmtHoras(selo.horas_desde_atualizacao)}
                    {selo.problemas.length > 0 && <> · {selo.problemas.length} {selo.problemas.length === 1 ? 'ressalva' : 'ressalvas'}</>}
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-primary">
                    Ver impacto
                    <ArrowRight className="size-3.5" aria-hidden />
                  </span>
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

const ORDEM: Status[] = ['verde', 'amarelo', 'vermelho']

/** Saúde por domínio: barra do índice (0 a 100, cor de identidade) e a distribuição do farol. Pior primeiro. */
export function SaudeDominios({ saude }: { saude: Saude }) {
  const dominios = [...saude.por_dominio].sort((a, b) => a.indice - b.indice)
  return (
    <section aria-label="Saúde por domínio" className="min-w-0 rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Saúde por domínio</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Índice de 0 a 100 e distribuição do farol das tabelas. Do pior para o melhor.</p>
        </div>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {ORDEM.map((s) => {
            const I = STATUS_INFO[s].icone
            return (
              <li key={s} className="inline-flex items-center gap-1">
                <I className={cn('size-3.5', STATUS_INFO[s].texto)} aria-hidden />
                {STATUS_INFO[s].rotulo}
              </li>
            )
          })}
        </ul>
      </div>
      <div className="mt-4 grid grid-cols-[minmax(7rem,11rem)_minmax(0,1fr)_3rem_minmax(6rem,9.5rem)] items-center gap-x-4 gap-y-1 text-[13px]">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Domínio</span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Índice de saúde</span>
        <span />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tabelas por status</span>
        {dominios.map((d) => (
          <Link
            key={d.dominio}
            to={`/farol?dominio=${encodeURIComponent(d.dominio)}`}
            title={`${d.dominio}: índice ${fmtNumero(d.indice, 1)} · ${d.verde} saudáveis, ${d.amarelo} em atenção, ${d.vermelho} críticas`}
            className="group col-span-4 -mx-2 grid grid-cols-subgrid items-center rounded-lg px-2 py-1.5 transition-colors hover:bg-secondary"
          >
            <span className="truncate font-medium group-hover:text-primary">{d.dominio}</span>
            <span className="h-2.5 rounded-full bg-muted">
              <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, d.indice))}%` }} />
            </span>
            <span className="tabular text-right font-semibold">{fmtNumero(d.indice, 1)}</span>
            <span className="flex items-center gap-2">
              <span className="flex h-2.5 min-w-0 flex-1 gap-0.5" aria-hidden>
                {ORDEM.map((s) => d[s] > 0 && <span key={s} className={cn('h-full rounded-[3px]', STATUS_INFO[s].ponto)} style={{ flexGrow: d[s], flexBasis: 0 }} />)}
              </span>
              <span className="tabular w-[4.25rem] shrink-0 text-right text-xs text-muted-foreground">
                {d.verde} · {d.amarelo} · {d.vermelho}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

/** Dimensões de qualidade em barras (valores muito próximos para um radar ser legível). */
export function DimensoesQualidade({ saude }: { saude: Saude }) {
  const pior = saude.dimensoes.reduce((a, b) => (b.indice < a.indice ? b : a), saude.dimensoes[0])
  return (
    <section aria-label="Dimensões de qualidade" className="flex w-full min-w-0 flex-col rounded-2xl border border-border bg-card p-5 shadow-card">
      <h2 className="text-base font-semibold tracking-tight">Dimensões de qualidade</h2>
      <p className="mt-0.5 text-[13px] text-muted-foreground">
        {pior ? (
          <>
            Ponto mais fraco hoje: <span className="font-semibold text-foreground">{pior.nome}</span> ({fmtNumero(pior.indice, 1)}).
          </>
        ) : (
          'Nota de 0 a 100 por dimensão.'
        )}
      </p>
      <ul className="mt-4 flex flex-1 flex-col justify-between gap-3.5">
        {saude.dimensoes.map((d) => (
          <li key={d.nome}>
            <Dica texto={d.descricao} lado="left">
              <div tabIndex={0} className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="font-medium">{d.nome}</span>
                  <span className="tabular font-semibold">{fmtNumero(d.indice, 1)}</span>
                </div>
                <div className="mt-1.5 h-2.5 rounded-full bg-muted">
                  <div className={cn('h-full rounded-full', d === pior ? 'bg-marinho-700 dark:bg-serie-1' : 'bg-primary')} style={{ width: `${Math.max(0, Math.min(100, d.indice))}%` }} />
                </div>
              </div>
            </Dica>
          </li>
        ))}
      </ul>
    </section>
  )
}

const ATALHOS: { rota: string; titulo: string; texto: string; icone: LucideIcon }[] = [
  { rota: '/farol', titulo: 'Farol de Dados', texto: 'O status de cada tabela, com testes, execuções e linhagem até os relatórios.', icone: Radar },
  { rota: '/rotinas', titulo: 'Rotinas', texto: 'Pipelines de carga: o que rodou, o que falhou hoje e os erros que se repetem.', icone: Workflow },
  { rota: '/plano-90-dias', titulo: 'Plano de 90 dias', texto: 'Como levar o índice de saúde de volta acima de 90 com dono, teste e alerta.', icone: Milestone },
]

export function Atalhos() {
  return (
    <nav aria-label="Atalhos" className="grid gap-4 md:grid-cols-3">
      {ATALHOS.map((a) => (
        <Link
          key={a.rota}
          to={a.rota}
          className="group flex items-start gap-3.5 rounded-2xl border border-border bg-card p-5 shadow-card transition-[box-shadow,border-color,transform] duration-200 hover:-translate-y-px hover:border-primary/40 hover:shadow-elevada"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
            <a.icone className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
              {a.titulo}
              <ArrowRight className="size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
            </span>
            <span className="mt-1 block text-[13px] leading-snug text-muted-foreground">{a.texto}</span>
          </span>
        </Link>
      ))}
    </nav>
  )
}
