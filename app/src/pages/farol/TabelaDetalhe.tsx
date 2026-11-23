import {
  ArrowLeft,
  CalendarClock,
  Columns3,
  FileBarChart,
  FlaskConical,
  GitBranch,
  Rows3,
  SearchX,
  Timer,
  UserRoundX,
  Workflow,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EmptyState, STATUS_INFO } from '@/components/dados'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCatalogo, useIncidentes, useLinhagem, useMeta, useSelos, useTabelaDetalhe } from '@/lib/dados'
import { fmtNumero } from '@/lib/formato'
import { cn } from '@/lib/utils'
import type { TabelaDetalhe as Detalhe } from '@/types/governanca'
import { Etiqueta, IconeFarol, ROTULO_CAMADA, ROTULO_CRITICIDADE, SeloSemPK, TabelasConhecidas, TextoTabelas, rotaTabela } from './componentes/comum'
import { Execucoes } from './componentes/detalhe/Execucoes'
import { LinhagemFluxo } from './componentes/detalhe/Linhagem'
import { Amostra, BannerIncidente, Frescor, RelatoriosImpactados, Schema, Secao, Testes } from './componentes/detalhe/Secoes'

type IdSecao = 'frescor' | 'execucoes' | 'testes' | 'schema' | 'linhagem' | 'amostra' | 'relatorios'
const SECOES: Record<IdSecao, { titulo: string; icone: LucideIcon }> = {
  frescor: { titulo: 'Frescor', icone: Timer },
  execucoes: { titulo: 'Execuções (30 dias)', icone: CalendarClock },
  testes: { titulo: 'Testes de qualidade', icone: FlaskConical },
  schema: { titulo: 'Schema', icone: Columns3 },
  linhagem: { titulo: 'Linhagem', icone: GitBranch },
  amostra: { titulo: 'Amostra de dados', icone: Rows3 },
  relatorios: { titulo: 'Relatórios impactados', icone: FileBarChart },
}

/** A seção mais relevante vem primeiro: o que explica o status da tabela. */
function ordemDasSecoes(t: Detalhe): IdSecao[] {
  const ultima = [...t.execucoes].reverse().find((e) => e.status !== 'sem_agenda')
  const frescorRuim = t.atraso_horas > 0 || t.testes.some((x) => x.regra === 'frescor' && x.resultado !== 'ok') || ultima?.status === 'falha' || ultima?.status === 'nao_executou'
  const volumeRuim = !!ultima?.anomalia_volume || t.testes.some((x) => x.regra === 'volume' && x.resultado !== 'ok')
  const testesRuins = t.testes_falhando + t.testes_alerta > 0
  if (frescorRuim) return ['frescor', 'execucoes', 'linhagem', 'testes', 'amostra', 'schema', 'relatorios']
  if (t.testes_falhando > 0) return ['testes', 'amostra', 'linhagem', 'execucoes', 'frescor', 'schema', 'relatorios']
  if (volumeRuim) return ['execucoes', 'testes', 'linhagem', 'frescor', 'amostra', 'schema', 'relatorios']
  if (testesRuins) return ['testes', 'amostra', 'linhagem', 'frescor', 'execucoes', 'schema', 'relatorios']
  return ['frescor', 'execucoes', 'testes', 'linhagem', 'schema', 'amostra', 'relatorios']
}

function Meta({ rotulo, children, destaque }: { rotulo: string; children: ReactNode; destaque?: boolean }) {
  return (
    <div className={cn('min-w-0 rounded-xl border px-3.5 py-2.5', destaque ? 'border-status-amarelo/50 bg-status-amarelo-fundo' : 'border-border bg-card')}>
      <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{rotulo}</dt>
      <dd className="mt-0.5 truncate text-[13.5px] font-semibold">{children}</dd>
    </div>
  )
}

function Voltar() {
  return (
    <Link to="/farol" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-primary">
      <ArrowLeft className="size-4" aria-hidden />
      Farol de Dados
    </Link>
  )
}

export default function TabelaDetalhe() {
  const { tabela = '' } = useParams()
  const { dados: t, carregando, erro } = useTabelaDetalhe(tabela || null)
  const { dados: catalogo } = useCatalogo()
  const { dados: linhagem, carregando: carregandoLinhagem } = useLinhagem()
  const { dados: incidentes } = useIncidentes()
  const { dados: selos } = useSelos()
  const { dados: meta } = useMeta()

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [tabela])

  const nomes = useMemo(() => catalogo?.tabelas.map((x) => x.nome), [catalogo])
  const conhecidas = useMemo(() => new Set(nomes ?? []), [nomes])
  const ligados = useMemo(() => {
    if (!t || !incidentes) return []
    return incidentes.filter((i) => t.incidentes.includes(i.id)).sort((a, b) => Number(b.tabela === t.nome) - Number(a.tabela === t.nome) || a.prioridade - b.prioridade)
  }, [t, incidentes])
  const ordem = useMemo(() => (t ? ordemDasSecoes(t) : []), [t])

  if (carregando) {
    return (
      <div className="mx-auto w-full max-w-[1600px] space-y-5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    )
  }

  if (!t) {
    const sugestoes = (catalogo?.tabelas ?? []).filter((x) => tabela && (x.nome.includes(tabela.toLowerCase()) || tabela.toLowerCase().includes(x.nome.replace(/^(stg|dim|fato|mart)_/, '')))).slice(0, 4)
    return (
      <div className="mx-auto w-full max-w-[1600px] space-y-5">
        <Voltar />
        <div className="rounded-2xl border border-dashed border-border bg-card/60">
          <EmptyState
            icone={SearchX}
            titulo={erro && !erro.ausente ? 'Não foi possível carregar a tabela' : 'Tabela não encontrada'}
            descricao={
              <>
                Não existe uma tabela chamada <code className="rounded bg-foreground/[0.07] px-1.5 py-px font-mono text-[0.9em]">{tabela}</code> no catálogo do Farol de Dados.
                {sugestoes.length > 0 && (
                  <span className="mt-3 flex flex-wrap justify-center gap-2">
                    {sugestoes.map((s) => (
                      <Link key={s.nome} to={rotaTabela(s.nome)} className="rounded-md border border-border bg-card px-2 py-1 font-mono text-xs font-medium text-foreground hover:border-primary/60 hover:text-primary">
                        {s.nome}
                      </Link>
                    ))}
                  </span>
                )}
              </>
            }
            acao={
              <Button asChild variant="outline" size="sm">
                <Link to="/farol">
                  <ArrowLeft aria-hidden />
                  Voltar ao Farol de Dados
                </Link>
              </Button>
            }
          />
        </div>
      </div>
    )
  }

  const s = STATUS_INFO[t.status]
  const tags = t.tags.filter((x) => !/^sem (pk|dono)$/i.test(x))

  const conteudo: Record<IdSecao, { descricao: ReactNode; no: ReactNode }> = {
    frescor: { descricao: 'Última carga comparada ao combinado (frequência e SLA)', no: <Frescor t={t} /> },
    execucoes: { descricao: 'Linhas carregadas por dia vs. volume esperado, com anomalias marcadas', no: <Execucoes execucoes={t.execucoes} /> },
    testes: {
      descricao: (
        <>
          {t.testes_total} testes · {t.testes_falhando} falhando · {t.testes_alerta} em alerta
        </>
      ),
      no: <Testes testes={t.testes} />,
    },
    schema: {
      descricao: `${t.colunas.length} colunas · ${t.colunas.filter((c) => c.pii).length} com dado pessoal · ${t.tem_pk ? `chave primária: ${t.colunas.filter((c) => c.pk).map((c) => c.nome).join(', ') || 'definida'}` : 'sem chave primária'}`,
      no: <Schema colunas={t.colunas} tabelasConhecidas={conhecidas} />,
    },
    linhagem: {
      descricao: 'De onde o dado vem e quais tabelas e relatórios dependem dele',
      no: linhagem ? <LinhagemFluxo key={t.nome} linhagem={linhagem} tabela={t.nome} /> : carregandoLinhagem ? <Skeleton className="h-96 rounded-xl" /> : <EmptyState compacto titulo="Linhagem indisponível" descricao="O grafo de linhagem ainda não foi gerado." />,
    },
    amostra: { descricao: 'Linhas de exemplo, com os registros problemáticos destacados', no: <Amostra amostra={t.amostra} /> },
    relatorios: { descricao: 'Relatórios do case que consomem esta tabela, com o Selo de Confiança de cada um', no: <RelatoriosImpactados ids={t.relatorios_impactados} selos={selos} meta={meta} status={t.status} /> },
  }

  return (
    <TabelasConhecidas.Provider value={nomes}>
    <div className="mx-auto w-full max-w-[1600px] animate-entrar space-y-5">
      <Voltar />

      {/* cabeçalho */}
      <header className={cn('relative overflow-hidden rounded-2xl border bg-card shadow-card', t.status === 'verde' ? 'border-border' : s.borda)}>
        <span className={cn('absolute inset-x-0 top-0 h-1.5', s.ponto)} aria-hidden />
        <div className="p-5 pt-6 sm:p-6 sm:pt-7">
          <div className="flex flex-wrap items-start gap-4">
            <IconeFarol status={t.status} tamanho="lg" pulsar={t.status === 'vermelho'} />
            <div className="min-w-0 flex-1 basis-72">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h1 className="break-all font-mono text-2xl font-semibold leading-tight tracking-tight">{t.nome}</h1>
                {!t.tem_pk && <SeloSemPK grande />}
                {tags.map((tag) => (
                  <Etiqueta key={tag} tom={tag === 'PII' || tag === 'LGPD' ? 'acento' : 'neutro'} className="text-[11px]">
                    {tag === 'PII' ? 'Contém dado pessoal (PII)' : tag}
                  </Etiqueta>
                ))}
              </div>
              <p className={cn('mt-1.5 text-[15px] font-semibold leading-snug', s.texto)}>
                {s.rotulo}
                <span className="font-medium text-foreground">
                  {' · '}
                  <TextoTabelas texto={t.motivo_status} />
                </span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-5 rounded-xl border border-border bg-background px-4 py-2.5">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Saúde</p>
                <p className="tabular text-2xl font-semibold leading-tight">
                  {fmtNumero(t.saude, 0)}
                  <span className="text-sm font-medium text-muted-foreground"> /100</span>
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Linhas</p>
                <p className="tabular text-2xl font-semibold leading-tight">{fmtNumero(t.linhas)}</p>
              </div>
            </div>
          </div>

          <p className="mt-4 max-w-5xl text-[13.5px] leading-relaxed text-muted-foreground">
            <TextoTabelas texto={t.descricao_longa || t.descricao} />
          </p>

          <dl className="mt-4 grid gap-2.5 grid-cols-2 md:grid-cols-4 2xl:grid-cols-8">
            <Meta rotulo="Dono" destaque={!t.dono}>
              {t.dono ? (
                <span title={t.dono_area ? `${t.dono} · ${t.dono_area}` : undefined}>
                  {t.dono}
                  {t.dono_area && <span className="block truncate text-xs font-normal text-muted-foreground">{t.dono_area}</span>}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-status-amarelo-texto">
                  <UserRoundX className="size-4" aria-hidden />
                  Sem dono definido
                </span>
              )}
            </Meta>
            <Meta rotulo="Domínio">{t.dominio}</Meta>
            <Meta rotulo="Camada">{ROTULO_CAMADA[t.camada]}</Meta>
            <Meta rotulo="Criticidade">{ROTULO_CRITICIDADE[t.criticidade]}</Meta>
            <Meta rotulo="Frequência">
              <span className="capitalize">{t.frequencia}</span>
            </Meta>
            <Meta rotulo="SLA">{fmtNumero(t.sla_horas)} horas</Meta>
            <Meta rotulo="Pipeline">
              <Link to={`/rotinas?pipeline=${encodeURIComponent(t.pipeline)}`} className="inline-flex max-w-full items-center gap-1.5 font-mono text-[12.5px] text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary" title={`Abrir a rotina ${t.pipeline}`}>
                <Workflow className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{t.pipeline}</span>
              </Link>
            </Meta>
            <Meta rotulo="Fonte">{t.fonte ?? <span className="font-normal text-muted-foreground">Tabelas internas</span>}</Meta>
          </dl>
        </div>
      </header>

      {ligados.map((i) => (
        <BannerIncidente key={i.id} incidente={i} tabela={t.nome} />
      ))}

      {/* navegação por âncoras */}
      <nav className="scroll-fino sticky top-14 z-20 -mx-1 flex gap-1 overflow-x-auto rounded-xl border border-border bg-background/90 p-1 backdrop-blur-md" aria-label="Seções da tabela">
        {ordem.map((id, i) => {
          const Icone = SECOES[id].icone
          const alerta = (id === 'testes' && t.testes_falhando > 0) || (id === 'frescor' && t.atraso_horas > 0)
          return (
            <button
              key={id}
              type="button"
              onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className={cn('inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors hover:bg-secondary hover:text-foreground', i === 0 ? 'bg-accent text-accent-foreground' : 'text-muted-foreground')}
            >
              <Icone className="size-3.5" aria-hidden />
              {SECOES[id].titulo}
              {id === 'testes' && t.testes_falhando > 0 && <span className="tabular rounded-full bg-status-vermelho px-1.5 text-[10.5px] font-bold leading-4 text-white">{t.testes_falhando}</span>}
              {alerta && id !== 'testes' && <span className="size-1.5 rounded-full bg-status-vermelho" aria-label="com problema" />}
            </button>
          )
        })}
      </nav>

      {ordem.map((id) => (
        <Secao key={id} id={id} titulo={SECOES[id].titulo} icone={SECOES[id].icone} descricao={conteudo[id].descricao}>
          {conteudo[id].no}
        </Secao>
      ))}
    </div>
    </TabelasConhecidas.Provider>
  )
}
