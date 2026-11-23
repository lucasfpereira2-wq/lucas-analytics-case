/** Seções do detalhe da tabela que não dependem de biblioteca de gráfico: frescor, testes, schema, amostra e relatórios. */
import { ArrowRight, Check, ChevronRight, CircleCheck, Code2, KeyRound, Link2, OctagonAlert, ShieldAlert, Siren, TriangleAlert, type LucideIcon } from 'lucide-react'
import { Fragment, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, STATUS_INFO, StatusBadge, statusDoSelo } from '@/components/dados'
import { fmtDataHora, fmtHoras, fmtNumero, fmtRelativo } from '@/lib/formato'
import { obterDataReferencia } from '@/lib/referencia'
import { relatorioPorId } from '@/lib/relatorios'
import { cn } from '@/lib/utils'
import type { Coluna, Incidente, Meta, RegraQualidade, ResultadoTeste, Selo, Status, TabelaDetalhe, TesteQualidade } from '@/types/governanca'
import { Etiqueta, TextoTabelas, rotaTabela } from '../comum'

// ---------------------------------------------------------------------------------------------
export function Secao({ id, titulo, icone: Icone, descricao, acoes, children }: { id: string; titulo: string; icone: LucideIcon; descricao?: ReactNode; acoes?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="scroll-mt-32 rounded-2xl border border-border bg-card shadow-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
            <Icone className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id={`${id}-titulo`} className="text-[15px] font-semibold leading-tight tracking-tight">
              {titulo}
            </h2>
            {descricao && <p className="mt-0.5 text-xs text-muted-foreground">{descricao}</p>}
          </div>
        </div>
        {acoes}
      </header>
      <div className="p-5">{children}</div>
    </section>
  )
}

// ---------------------------------------------------------------------------------------------
const RESULTADO: Record<ResultadoTeste, { status: Status; rotulo: string }> = {
  falha: { status: 'vermelho', rotulo: 'Falhou' },
  alerta: { status: 'amarelo', rotulo: 'Alerta' },
  ok: { status: 'verde', rotulo: 'Aprovado' },
}
const SITUACAO: Record<Incidente['situacao'], string> = { aberto: 'Aberto', em_analise: 'Em análise', mitigado: 'Mitigado' }
const SEVERIDADE_INC: Record<Incidente['severidade'], { rotulo: string; status: Status }> = {
  critico: { rotulo: 'Crítico', status: 'vermelho' },
  alto: { rotulo: 'Alto', status: 'vermelho' },
  medio: { rotulo: 'Médio', status: 'amarelo' },
}

/** Banner do incidente ligado à tabela: título, impacto de negócio e ação recomendada. */
export function BannerIncidente({ incidente, tabela }: { incidente: Incidente; tabela: string }) {
  const sev = SEVERIDADE_INC[incidente.severidade] ?? SEVERIDADE_INC.medio
  const s = STATUS_INFO[sev.status]
  const origem = incidente.tabela === tabela
  return (
    <aside className={cn('relative overflow-hidden rounded-2xl border', s.borda, s.fundo)} role="alert" aria-label={`Incidente ${incidente.id}`}>
      <span className={cn('absolute inset-y-0 left-0 w-1.5', s.ponto)} aria-hidden />
      <div className="py-4 pl-6 pr-5">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <span className={cn('grid size-8 place-items-center rounded-full text-white', s.ponto)}>
            <Siren className="size-4" aria-hidden />
          </span>
          <span className="tabular text-xs font-semibold text-foreground/70">{incidente.id}</span>
          <StatusBadge status={sev.status} rotulo={`Severidade: ${sev.rotulo}`} tamanho="sm" discreto />
          <Etiqueta className="border-foreground/15 bg-card/60 text-foreground/80">{SITUACAO[incidente.situacao] ?? incidente.situacao}</Etiqueta>
          <span className="text-xs text-foreground/65">
            detectado {fmtRelativo(incidente.detectado_em)} ({fmtDataHora(incidente.detectado_em)})
          </span>
        </div>
        <h2 className="mt-2.5 text-lg font-semibold leading-snug tracking-tight">{incidente.titulo}</h2>
        {!origem && (
          <p className="mt-1 text-[13px] text-foreground/75">
            Esta tabela está a jusante do incidente. Origem: <TextoTabelas texto={`\`${incidente.tabela}\``} />
          </p>
        )}
        <div className="mt-3 grid gap-x-8 gap-y-3 lg:grid-cols-2">
          <div>
            <p className={cn('text-[11px] font-semibold uppercase tracking-wider', s.texto)}>Impacto no negócio</p>
            <p className="mt-1 text-[14.5px] font-medium leading-relaxed text-foreground">
              <TextoTabelas texto={incidente.impacto_negocio} />
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">Ação recomendada</p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-foreground/90">
              <TextoTabelas texto={incidente.acao_recomendada} />
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-foreground/70">
              <span className="font-semibold">Causa raiz:</span> <TextoTabelas texto={incidente.causa_raiz} />
            </p>
          </div>
        </div>
        {incidente.metricas.length > 0 && (
          <dl className="mt-4 flex flex-wrap gap-2">
            {incidente.metricas.map((m) => (
              <div key={m.rotulo} className="rounded-lg border border-foreground/10 bg-card/70 px-3 py-1.5">
                <dt className="text-[11px] text-muted-foreground">{m.rotulo}</dt>
                <dd className="tabular text-sm font-semibold">{m.valor}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </aside>
  )
}

// ---------------------------------------------------------------------------------------------
const horas = (h: number) => (h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : `${fmtNumero(h, h < 10 && h % 1 !== 0 ? 1 : 0)}h`)

function Item({ rotulo, valor, detalhe, alerta }: { rotulo: string; valor: ReactNode; detalhe?: ReactNode; alerta?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{rotulo}</dt>
      <dd className={cn('tabular mt-1 text-xl font-semibold leading-tight tracking-tight', alerta && 'text-status-vermelho-texto')}>{valor}</dd>
      {detalhe && <dd className="mt-0.5 text-xs text-muted-foreground">{detalhe}</dd>}
    </div>
  )
}

/** Frescor: última carga vs. o esperado, atraso em horas e barra do SLA. */
export function Frescor({ t }: { t: TabelaDetalhe }) {
  const ref = new Date(obterDataReferencia()).getTime()
  const idade = t.ultima_carga ? Math.max(0, (ref - new Date(t.ultima_carga).getTime()) / 3_600_000) : null
  const sla = t.sla_horas
  const atraso = t.atraso_horas
  const fora = atraso > 0
  // consumo do SLA: com atraso declarado, vale SLA + atraso (a carga pode ter terminado tarde e já estar "nova")
  const consumo = fora ? sla + atraso : Math.min(idade ?? 0, sla)
  const escala = Math.max(sla * 1.25, consumo * 1.08)
  const pctSla = (sla / escala) * 100
  const pctDentro = (Math.min(consumo, sla) / escala) * 100
  const pctFora = fora ? (atraso / escala) * 100 : 0
  const atrasoContinua = fora && idade !== null && idade > sla

  const frase = !t.ultima_carga
    ? 'Nenhuma carga registrada para esta tabela.'
    : atrasoContinua
      ? `Dado parado há ${fmtHoras(idade)}: ${horas(atraso)} além do SLA de ${horas(sla)}.`
      : fora
        ? `A última carga terminou ${horas(atraso)} depois do prazo do SLA de ${horas(sla)}.`
        : `Dentro do SLA: última carga há ${horas(idade ?? 0)}, para um limite de ${horas(sla)}.`

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-center">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
        <Item rotulo="Última carga" valor={t.ultima_carga ? fmtRelativo(t.ultima_carga) : '–'} detalhe={t.ultima_carga ? fmtDataHora(t.ultima_carga) : 'sem registro'} alerta={atrasoContinua} />
        <Item rotulo="Esperado" valor={<span className="capitalize">{t.frequencia}</span>} detalhe={`SLA de ${horas(sla)}`} />
        <Item rotulo="Idade do dado" valor={idade === null ? '–' : horas(idade)} detalhe={idade !== null && idade >= 48 ? `cerca de ${fmtHoras(idade)}` : 'desde a última carga'} alerta={atrasoContinua} />
        <Item rotulo="Atraso além do SLA" valor={fora ? horas(atraso) : 'Nenhum'} detalhe={fora ? 'fora do combinado' : 'dentro do combinado'} alerta={fora} />
      </dl>
      <div>
        <div className="flex items-center gap-2 text-[13.5px] font-medium">
          {fora ? <OctagonAlert className="size-4 shrink-0 text-status-vermelho-texto" aria-hidden /> : <CircleCheck className="size-4 shrink-0 text-status-verde-texto" aria-hidden />}
          {frase}
        </div>
        <div className="relative mt-7" role="img" aria-label={frase}>
          <div className="flex h-3.5 overflow-hidden rounded-full bg-secondary">
            <span className="h-full bg-primary" style={{ width: `${pctDentro}%` }} />
            {fora && <span className="h-full bg-status-vermelho" style={{ width: `${pctFora}%`, marginLeft: 2 }} />}
          </div>
          <span className="absolute -top-5 bottom-0 w-px bg-foreground/70" style={{ left: `${pctSla}%` }} aria-hidden />
          <span className={cn('tabular absolute -top-[22px] whitespace-nowrap text-[11px] font-semibold text-foreground', pctSla > 70 ? '-translate-x-full pr-1.5' : 'pl-1.5')} style={{ left: `${pctSla}%` }}>
            SLA {horas(sla)}
          </span>
        </div>
        <div className="tabular mt-1.5 flex justify-between text-[11px] text-muted-foreground">
          <span>0h</span>
          <span>{fora ? `${horas(sla + atraso)} (SLA + atraso)` : `${horas(escala)}`}</span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------
const ROTULO_REGRA: Record<RegraQualidade, string> = {
  pk_existente: 'Chave primária',
  unicidade: 'Unicidade',
  nao_nulo: 'Completude',
  integridade_referencial: 'Integridade referencial',
  volume: 'Volume',
  frescor: 'Frescor',
  schema_drift: 'Schema',
  reconciliacao: 'Reconciliação',
  dominio_valores: 'Domínio de valores',
}
const ROTULO_SEVERIDADE: Record<TesteQualidade['severidade'], string> = { critico: 'Crítica', alto: 'Alta', medio: 'Média', baixo: 'Baixa' }
const ORDEM_RESULTADO: Record<ResultadoTeste, number> = { falha: 0, alerta: 1, ok: 2 }
const ORDEM_SEV: Record<TesteQualidade['severidade'], number> = { critico: 0, alto: 1, medio: 2, baixo: 3 }

function medida(v: number | undefined, unidade?: string) {
  if (v === undefined || v === null) return null
  const n = fmtNumero(v, Number.isInteger(v) ? 0 : Math.abs(v) < 1 ? 2 : 1)
  if (!unidade) return n
  if (unidade === '%') return `${n}%`
  if (unidade === 'horas') return `${fmtNumero(v, Number.isInteger(v) ? 0 : 1)}h`
  return `${n} ${unidade}`
}

function HistoricoTeste({ historico }: { historico: ResultadoTeste[] }) {
  return (
    <span className="inline-flex items-center gap-1" role="img" aria-label={`Últimos ${historico.length} dias: ${historico.map((h) => RESULTADO[h]?.rotulo ?? h).join(', ')}`}>
      {historico.map((h, i) => {
        const st = STATUS_INFO[RESULTADO[h]?.status ?? 'verde']
        return <span key={i} title={RESULTADO[h]?.rotulo} className={cn('rounded-full', st.ponto, h === 'ok' ? 'size-2 opacity-55' : 'size-2.5', i === historico.length - 1 && 'ring-2 ring-foreground/25 ring-offset-1 ring-offset-card')} />
      })}
    </span>
  )
}

/** Testes de qualidade: falhas primeiro, evidência em destaque, histórico de 7 dias e SQL recolhível. */
export function Testes({ testes }: { testes: TesteQualidade[] }) {
  if (testes.length === 0) return <EmptyState compacto titulo="Nenhum teste configurado" descricao="Esta tabela ainda não tem testes de qualidade." />
  const ordenados = [...testes].sort((a, b) => ORDEM_RESULTADO[a.resultado] - ORDEM_RESULTADO[b.resultado] || ORDEM_SEV[a.severidade] - ORDEM_SEV[b.severidade])
  return (
    <ul className="divide-y divide-border">
      {ordenados.map((t) => {
        const r = RESULTADO[t.resultado] ?? RESULTADO.ok
        const s = STATUS_INFO[r.status]
        const Icone = t.resultado === 'ok' ? Check : t.resultado === 'alerta' ? TriangleAlert : OctagonAlert
        const obs = medida(t.valor_observado, t.unidade)
        const lim = medida(t.limite, t.unidade)
        const ruim = t.resultado !== 'ok'
        return (
          <li key={t.id} className="grid gap-x-4 gap-y-2 py-3.5 first:pt-0 last:pb-0 md:grid-cols-[auto_minmax(0,1fr)_auto]">
            <span className={cn('grid size-8 place-items-center rounded-full', s.fundo, s.texto)} title={r.rotulo}>
              <Icone className="size-4" strokeWidth={2.5} aria-hidden />
              <span className="sr-only">{r.rotulo}</span>
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h3 className="text-[13.5px] font-semibold leading-snug">
                  <TextoTabelas texto={t.nome} />
                </h3>
                <Etiqueta>{ROTULO_REGRA[t.regra] ?? t.regra}</Etiqueta>
                <Etiqueta className={cn(ruim && (t.severidade === 'critico' || t.severidade === 'alto') && 'border-foreground/25 text-foreground')}>Severidade {ROTULO_SEVERIDADE[t.severidade]?.toLowerCase() ?? t.severidade}</Etiqueta>
              </div>
              <p className={cn('mt-1.5 text-[13.5px] leading-relaxed', ruim ? cn('inline-block rounded-lg border px-3 py-1.5 font-semibold', s.fundo, s.borda, 'text-foreground') : 'text-muted-foreground')}>
                <TextoTabelas texto={t.evidencia} />
              </p>
              {t.sql && (
                <details className="group mt-2">
                  <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                    <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" aria-hidden />
                    <Code2 className="size-3.5" aria-hidden />
                    SQL do teste
                  </summary>
                  <pre className="scroll-fino mt-2 overflow-x-auto rounded-lg border border-border bg-secondary/60 p-3 font-mono text-[12px] leading-relaxed text-foreground/90">
                    <code>{t.sql}</code>
                  </pre>
                </details>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 md:col-start-3 md:flex-col md:items-end md:justify-start md:gap-y-1.5">
              {obs !== null && (
                <p className="tabular whitespace-nowrap text-xs text-muted-foreground">
                  Observado <strong className={cn('text-[13px] font-semibold', ruim ? s.texto : 'text-foreground')}>{obs}</strong>
                  {lim !== null && (
                    <>
                      {' '}
                      · limite <strong className="text-[13px] font-semibold text-foreground">{lim}</strong>
                    </>
                  )}
                </p>
              )}
              <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
                7 dias <HistoricoTeste historico={t.historico_7d} />
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

// ---------------------------------------------------------------------------------------------
/** Schema: colunas com tipo, descrição e selos PK / FK / anulável / dado pessoal. */
export function Schema({ colunas, tabelasConhecidas }: { colunas: Coluna[]; tabelasConhecidas: Set<string> }) {
  return (
    <div className="scroll-fino -mx-5 -mb-5 overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-border bg-secondary/50 text-left text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">
            <th scope="col" className="py-2.5 pl-5 pr-3">Coluna</th>
            <th scope="col" className="px-3 py-2.5">Tipo</th>
            <th scope="col" className="px-3 py-2.5">Descrição</th>
            <th scope="col" className="px-3 py-2.5">Anulável</th>
            <th scope="col" className="py-2.5 pl-3 pr-5">LGPD</th>
          </tr>
        </thead>
        <tbody>
          {colunas.map((c) => (
            <tr key={c.nome} className="border-b border-border/70 last:border-0">
              <td className="py-2.5 pl-5 pr-3">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-[12.5px] font-semibold">{c.nome}</span>
                  {c.pk && (
                    <Etiqueta tom="acento" className="font-bold">
                      <KeyRound className="size-3" aria-hidden />
                      PK
                    </Etiqueta>
                  )}
                  {c.fk &&
                    (tabelasConhecidas.has(c.fk.tabela) ? (
                      <Link to={rotaTabela(c.fk.tabela)} title={`Chave estrangeira para ${c.fk.tabela}.${c.fk.coluna}`} className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-border bg-secondary px-1.5 py-0.5 text-[10.5px] font-medium text-foreground transition-colors hover:border-primary/60 hover:text-primary">
                        <Link2 className="size-3" aria-hidden />
                        FK <span className="font-mono">→ {c.fk.tabela}</span>
                      </Link>
                    ) : (
                      <Etiqueta>
                        <Link2 className="size-3" aria-hidden />
                        FK <span className="font-mono">→ {c.fk.tabela}</span>
                      </Etiqueta>
                    ))}
                </span>
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-muted-foreground">{c.tipo}</td>
              <td className="min-w-64 px-3 py-2.5 leading-snug text-foreground/90">{c.descricao}</td>
              <td className="px-3 py-2.5 text-muted-foreground">{c.nulavel ? 'Sim' : 'Não'}</td>
              <td className="py-2.5 pl-3 pr-5">
                {c.pii ? (
                  <Etiqueta tom="acento">
                    <ShieldAlert className="size-3" aria-hidden />
                    Dado pessoal
                  </Etiqueta>
                ) : (
                  <span className="text-muted-foreground">–</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------
/** Amostra de dados: linhas problemáticas destacadas e células de `colunas_problema` marcadas. */
export function Amostra({ amostra }: { amostra: TabelaDetalhe['amostra'] }) {
  if (!amostra?.linhas?.length) return <EmptyState compacto titulo="Sem amostra" descricao="Não há amostra de dados disponível para esta tabela." />
  const comProblema = amostra.linhas.filter((l) => l.problema).length
  const valor = (v: string | number | null) =>
    v === null || v === undefined ? <span className="italic text-muted-foreground/80">NULL</span> : typeof v === 'number' ? (Number.isInteger(v) ? String(v) : fmtNumero(v, 2)) : v
  return (
    <div>
      <p className="mb-3 text-[13px] text-muted-foreground">
        {amostra.linhas.length} linhas de exemplo
        {comProblema > 0 ? (
          <>
            {' '}
            · <strong className="font-semibold text-status-vermelho-texto">{comProblema} com problema</strong> (destacadas, com a célula afetada marcada)
          </>
        ) : (
          ' · nenhuma com problema'
        )}
      </p>
      <div className="scroll-fino overflow-x-auto rounded-xl border border-border">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-border bg-secondary/50 text-left">
              <th scope="col" className="w-8 py-2 pl-3" aria-label="Situação da linha" />
              {amostra.colunas.map((c) => (
                <th key={c} scope="col" className="whitespace-nowrap px-3 py-2 font-mono text-[11.5px] font-semibold text-muted-foreground">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {amostra.linhas.map((l, i) => {
              const marcadas = new Set(l.colunas_problema ?? [])
              return (
                <Fragment key={i}>
                  <tr className={cn(!l.problema && 'border-b border-border/70 last:border-0', l.problema && 'bg-status-vermelho-fundo/60')}>
                    <td className="py-2 pl-3 align-middle">{l.problema && <OctagonAlert className="size-4 text-status-vermelho-texto" aria-label="Linha com problema" />}</td>
                    {amostra.colunas.map((c, j) => (
                      <td key={c} className="tabular whitespace-nowrap px-3 py-2 font-mono">
                        <span className={cn(marcadas.has(c) && 'rounded-md bg-status-vermelho-fundo px-1.5 py-0.5 font-bold text-status-vermelho-texto ring-1 ring-status-vermelho')}>{valor(l.valores[j] ?? null)}</span>
                      </td>
                    ))}
                  </tr>
                  {l.problema && (
                    <tr className="border-b border-border/70 bg-status-vermelho-fundo/60 last:border-0">
                      <td />
                      <td colSpan={amostra.colunas.length} className="px-3 pb-2.5 pt-0 text-[12.5px] font-medium text-status-vermelho-texto">
                        <TextoTabelas texto={l.problema} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11.5px] text-muted-foreground">Amostra ilustrativa com dados fictícios; dados pessoais aparecem mascarados.</p>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------
/** Relatórios a jusante, cada um com o seu Selo de Confiança. */
export function RelatoriosImpactados({ ids, selos, meta, status }: { ids: string[]; selos: Record<string, Selo> | null; meta: Meta | null; status: Status }) {
  if (ids.length === 0) {
    return <EmptyState compacto titulo="Nenhum relatório a jusante" descricao="Nenhum relatório publicado no case consome esta tabela, direta ou indiretamente." />
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {ids.map((id) => {
        const selo = selos?.[id]
        const nav = relatorioPorId(id)
        const titulo = meta?.relatorios.find((r) => r.id === id)?.titulo ?? nav?.titulo ?? id
        const rota = `/impactos?relatorio=${id}`
        const Icone = nav?.icone
        const st = selo ? statusDoSelo(selo.nivel) : null
        return (
          <Link key={id} to={rota} className={cn('group flex min-w-0 flex-col gap-2.5 rounded-xl border bg-card p-4 transition-[border-color,box-shadow] hover:shadow-elevada', st && st !== 'verde' ? STATUS_INFO[st].borda : 'border-border hover:border-primary/50')}>
            <div className="flex items-start justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2.5">
                {Icone && (
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                    <Icone className="size-4" aria-hidden />
                  </span>
                )}
                <span className="text-sm font-semibold leading-snug group-hover:text-primary">{titulo}</span>
              </span>
              {selo && st && <StatusBadge status={st} rotulo={selo.titulo} tamanho="sm" />}
            </div>
            {selo ? (
              <p className="line-clamp-3 text-[12.5px] leading-relaxed text-muted-foreground">{selo.mensagem.replace(/`/g, '')}</p>
            ) : (
              <p className="text-[12.5px] text-muted-foreground">Selo de confiança ainda não calculado.</p>
            )}
            <span className="mt-auto inline-flex items-center gap-1 pt-1 text-xs font-semibold text-primary">
              Abrir relatório
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </span>
          </Link>
        )
      })}
      {status !== 'verde' && <p className="text-xs text-muted-foreground md:col-span-2 xl:col-span-3">O selo de cada relatório considera todas as tabelas de origem, não apenas esta.</p>}
    </div>
  )
}
