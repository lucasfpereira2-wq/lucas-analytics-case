import { ArrowRight, ChevronDown, GitBranch, ShieldAlert, ShieldCheck, Wrench } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EmptyState, STATUS_INFO, StatusBadge, statusDoSelo, TextoComTabelas } from '@/components/dados'
import { Pagina } from '@/components/layout/Pagina'
import { Skeleton } from '@/components/ui/skeleton'
import { useIncidentes, useSelos } from '@/lib/dados'
import { fmtDataHora, fmtHoras } from '@/lib/formato'
import { RELATORIOS, type ItemNavegacao } from '@/lib/relatorios'
import { cn } from '@/lib/utils'
import type { Incidente, NivelSelo, Selo } from '@/types/governanca'

const ROTULO_NIVEL: Record<NivelSelo, string> = { confiavel: 'Confiável', atencao: 'Atenção', critico: 'Problema crítico' }
const ORDEM_NIVEL: Record<NivelSelo, number> = { critico: 0, atencao: 1, confiavel: 2 }

interface Comparativo {
  metrica: string
  publicado: string
  correto: string
  diferenca: string
  rotuloPublicado?: string
  rotuloCorreto?: string
}

/** Valor de uma métrica do incidente cujo rótulo começa com o texto informado. */
function metrica(inc: Incidente, inicio: string): string | undefined {
  return inc.metricas.find((m) => m.rotulo.toLowerCase().startsWith(inicio.toLowerCase()))?.valor
}

/** "O que o relatório mostra × o que deveria mostrar", quando o incidente tem desvio quantificado. */
function comparativoDe(inc: Incidente): Comparativo | null {
  if (inc.id === 'INC-2031') {
    const par = metrica(inc, 'Recebimento de 16/11')?.split(/\s+x\s+/)
    if (!par || par.length !== 2) return null
    return { metrica: 'Recebimento de 16/11/2026', publicado: par[0], correto: par[1], diferenca: `${metrica(inc, 'Valor lançado') ?? ''} a mais (${metrica(inc, 'Recebimento superestimado') ?? ''})` }
  }
  if (inc.id === 'INC-2027') {
    const pub = metrica(inc, 'NPS divulgado')
    const cor = metrica(inc, 'NPS correto')
    if (!pub || !cor) return null
    return { metrica: 'NPS de outubro/2026', publicado: pub, correto: cor, diferenca: `${metrica(inc, 'Diferença') ?? ''} acima do real`, rotuloPublicado: 'Divulgado ao comitê' }
  }
  if (inc.id === 'INC-2033') {
    const pub = metrica(inc, 'Linhas carregadas')
    const esp = metrica(inc, 'Média das segundas')
    if (!pub || !esp) return null
    return { metrica: 'Propostas de 16/11/2026', publicado: pub, correto: `~${esp}`, diferenca: `${metrica(inc, 'Queda de volume') ?? ''} abaixo do esperado`, rotuloCorreto: 'Esperado' }
  }
  if (inc.id === 'INC-2032') {
    const n = metrica(inc, 'Contatos de voz não carregados')
    if (!n) return null
    return { metrica: 'Contatos de voz de 14 a 16/11/2026', publicado: '0', correto: `~${n}`, diferenca: 'Canal Voz sem dados por 3 dias', rotuloCorreto: 'Estimado' }
  }
  return null
}

/** Métricas de apoio do incidente, sem repetir o que o comparativo já mostra. */
const METRICAS_COM_COMPARATIVO: Record<string, number[]> = { 'INC-2031': [0, 1], 'INC-2027': [3], 'INC-2032': [0, 1], 'INC-2033': [] }
function metricasDe(inc: Incidente, temComparativo: boolean): Incidente['metricas'] {
  const indices = temComparativo ? METRICAS_COM_COMPARATIVO[inc.id] : undefined
  return indices ? indices.map((i) => inc.metricas[i]).filter(Boolean) : inc.metricas.slice(0, 4)
}

function Resumo({ selos }: { selos: Record<string, Selo> }) {
  const lista = Object.values(selos)
  const n = (nivel: NivelSelo) => lista.filter((s) => s.nivel === nivel).length
  const itens = [
    { rotulo: 'Relatórios com ressalva', valor: `${lista.filter((s) => s.nivel !== 'confiavel').length} de ${lista.length}`, detalhe: 'usam ao menos uma tabela com problema', classe: '' },
    { rotulo: 'Com problema crítico', valor: String(n('critico')), detalhe: 'número publicado diverge do correto', classe: 'border-l-4 border-l-status-vermelho' },
    { rotulo: 'Em atenção', valor: String(n('atencao')), detalhe: 'efeito localizado ou marginal', classe: 'border-l-4 border-l-status-amarelo' },
    { rotulo: 'Confiáveis', valor: String(n('confiavel')), detalhe: 'origem no SLA e com testes aprovados', classe: 'border-l-4 border-l-status-verde' },
  ]
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {itens.map((i) => (
        <div key={i.rotulo} className={cn('rounded-2xl border border-border bg-card px-5 py-4 shadow-card', i.classe)}>
          <p className="text-[13px] font-medium text-muted-foreground">{i.rotulo}</p>
          <p className="tabular mt-1 text-3xl font-semibold leading-none tracking-tight">{i.valor}</p>
          <p className="mt-2 text-xs text-muted-foreground">{i.detalhe}</p>
        </div>
      ))}
    </div>
  )
}

function BlocoComparativo({ c }: { c: Comparativo }) {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{c.metrica}</p>
      <div className="mt-2.5 flex items-end gap-x-4">
        <div>
          <p className="text-xs text-muted-foreground">{c.rotuloPublicado ?? 'No relatório'}</p>
          <p className="tabular mt-0.5 whitespace-nowrap text-xl font-semibold leading-none tracking-tight">{c.publicado}</p>
        </div>
        <ArrowRight className="mb-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div>
          <p className="text-xs text-muted-foreground">{c.rotuloCorreto ?? 'Correto'}</p>
          <p className="tabular mt-0.5 whitespace-nowrap text-xl font-semibold leading-none tracking-tight text-primary">{c.correto}</p>
        </div>
      </div>
      <p className="mt-3 text-[13px] font-medium text-foreground/80">{c.diferenca}</p>
    </div>
  )
}

function ProblemaPrincipal({ inc, efeito }: { inc: Incidente; efeito?: string }) {
  const comp = comparativoDe(inc)
  const sev = inc.severidade === 'critico' ? 'vermelho' : 'amarelo'
  return (
    <article className="grid gap-4 border-t border-border px-5 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <StatusBadge status={sev} rotulo={inc.severidade === 'critico' ? 'Crítico' : inc.severidade === 'alto' ? 'Alto' : 'Médio'} tamanho="sm" />
          <span className="font-mono text-xs text-muted-foreground">{inc.id}</span>
          <Link to={`/farol/${encodeURIComponent(inc.tabela)}`} className="rounded-md bg-foreground/[0.07] px-1.5 py-px font-mono text-[12.5px] font-medium underline decoration-current/40 underline-offset-2 hover:bg-foreground/[0.14]">
            {inc.tabela}
          </Link>
        </div>
        <h3 className="mt-2 text-[15px] font-semibold tracking-tight">{inc.titulo}</h3>
        {efeito && <p className="mt-1 text-sm font-medium text-foreground/90">{efeito}.</p>}
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          <TextoComTabelas texto={inc.impacto_negocio} />
        </p>
        <p className="mt-3 flex items-start gap-2 text-[13px] leading-relaxed text-muted-foreground">
          <Wrench className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            <strong className="font-semibold text-foreground">Ação recomendada:</strong> <TextoComTabelas texto={inc.acao_recomendada} />
          </span>
        </p>
        <Link to={`/farol/${encodeURIComponent(inc.tabela)}`} className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline">
          <GitBranch className="size-3.5" aria-hidden />
          Ver a tabela e a linhagem no Farol
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
      <div className="min-w-0 space-y-3">
        {comp && <BlocoComparativo c={comp} />}
        <dl className="grid grid-cols-2 gap-2">
          {metricasDe(inc, !!comp).map((m) => (
            <div key={m.rotulo} className="rounded-lg border border-border bg-card px-3 py-2">
              <dt className="text-[11px] leading-tight text-muted-foreground">{m.rotulo}</dt>
              <dd className="tabular mt-0.5 text-sm font-semibold">
                <TextoComTabelas texto={m.valor} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </article>
  )
}

function CartaoRelatorio({ nav, selo, incidentes, destaque }: { nav: ItemNavegacao; selo: Selo; incidentes: Incidente[]; destaque: boolean }) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    if (destaque) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [destaque])

  const status = statusDoSelo(selo.nivel)
  const Icone = nav.icone
  const Escudo = selo.nivel === 'confiavel' ? ShieldCheck : ShieldAlert
  // problemas com efeito declarado neste relatório (incidente que cita o relatório), na ordem de prioridade
  const principais = incidentes.filter((i) => i.relatorios_afetados.some((r) => r.id === selo.relatorio))
  const idsPrincipais = new Set(principais.map((i) => i.id))
  const outros = selo.problemas.filter((p) => !p.incidente || !idsPrincipais.has(p.incidente))

  return (
    <section
      ref={ref}
      id={`rel-${selo.relatorio}`}
      aria-label={`Impacto em ${nav.titulo}`}
      className={cn('scroll-mt-20 overflow-hidden rounded-2xl border bg-card shadow-card transition-shadow', destaque ? 'border-primary ring-2 ring-primary/25' : 'border-border')}
    >
      <header className={cn('flex flex-wrap items-start gap-x-4 gap-y-3 px-5 py-4', STATUS_INFO[status].fundo)}>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-card text-foreground shadow-card">
          <Icone className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 basis-80">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h2 className="text-lg font-semibold tracking-tight">{nav.titulo}</h2>
            <StatusBadge status={status} rotulo={ROTULO_NIVEL[selo.nivel]} />
          </div>
          <p className="mt-1.5 flex items-start gap-2 text-sm leading-relaxed text-foreground/90">
            <Escudo className={cn('mt-0.5 size-4 shrink-0', STATUS_INFO[status].texto)} aria-hidden />
            <span>
              <TextoComTabelas texto={selo.mensagem} />
            </span>
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Última carga do relatório: {fmtDataHora(selo.atualizado_em)} (há {fmtHoras(selo.horas_desde_atualizacao)}) · {selo.tabelas_fonte.length} tabelas na origem
          </p>
        </div>
        <Link to={nav.rota} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[13px] font-semibold shadow-card transition-colors hover:border-primary/50 hover:text-primary">
          Abrir relatório
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </header>

      {principais.map((inc) => (
        <ProblemaPrincipal key={inc.id} inc={inc} efeito={inc.relatorios_afetados.find((r) => r.id === selo.relatorio)?.efeito} />
      ))}

      {outros.length > 0 && (
        <details className="group border-t border-border">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 text-[13px] font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
            Outras {outros.length} {outros.length === 1 ? 'tabela da origem com ressalva' : 'tabelas da origem com ressalva'}, sem efeito direto nos indicadores
          </summary>
          <ul className="divide-y divide-border border-t border-border">
            {outros.map((p) => (
              <li key={p.tabela} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-2.5 text-[13px]">
                <StatusBadge status={p.status} tamanho="sm" />
                <Link to={`/farol/${encodeURIComponent(p.tabela)}`} className="font-mono text-[12.5px] font-medium underline decoration-current/40 underline-offset-2 hover:text-primary">
                  {p.tabela}
                </Link>
                <span className="min-w-0 flex-1 basis-64 text-muted-foreground">
                  <TextoComTabelas texto={p.texto} />
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}

/**
 * Impacto nos relatórios: onde os problemas de dados chegam. Os relatórios do case ficam limpos;
 * é aqui que o selo de confiança de cada um aparece, com a tabela causadora e o desvio estimado.
 */
export default function ImpactoRelatorios() {
  const { dados: selos, carregando } = useSelos()
  const { dados: incidentes } = useIncidentes()
  const [params] = useSearchParams()
  const alvo = params.get('relatorio')

  const ordenados = useMemo(
    () =>
      RELATORIOS.filter((r) => r.relatorio && selos?.[r.relatorio]).sort(
        (a, b) => ORDEM_NIVEL[selos![a.relatorio!].nivel] - ORDEM_NIVEL[selos![b.relatorio!].nivel],
      ),
    [selos],
  )

  return (
    <Pagina
      titulo="Impacto nos relatórios"
      subtitulo="Os relatórios do case mostram os números como foram publicados. Esta página mostra o que há por trás de cada um: qual tabela tem problema, o que o relatório exibe hoje e qual seria o número correto."
      icone={ShieldAlert}
    >
      {carregando ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : !selos ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60">
          <EmptyState titulo="Selos de confiança ainda não disponíveis" descricao="Os dados de governança não foram gerados neste ambiente." />
        </div>
      ) : (
        <>
          <Resumo selos={selos} />
          <p className="text-[13px] text-muted-foreground">
            O selo de cada relatório é derivado da linhagem: ele herda o estado das tabelas que o alimentam. Ordenado do mais grave para o íntegro.
          </p>
          {ordenados.map((r) => (
            <CartaoRelatorio key={r.rota} nav={r} selo={selos[r.relatorio!]} incidentes={incidentes ?? []} destaque={alvo === r.relatorio} />
          ))}
        </>
      )}
    </Pagina>
  )
}
