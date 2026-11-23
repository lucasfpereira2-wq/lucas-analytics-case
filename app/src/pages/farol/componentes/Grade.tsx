import { Clock, ShieldAlert, UserRound, UserRoundX } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { STATUS_INFO } from '@/components/dados'
import { fmtCompacto, fmtDataHora, fmtRelativo } from '@/lib/formato'
import { cn } from '@/lib/utils'
import type { Status, TabelaResumo } from '@/types/governanca'
import { Etiqueta, FaixaExecucoes, IconeFarol, ROTULO_CAMADA, SeloSemPK, TextoCodigo, rotaTabela, semCrases } from './comum'

const BORDA: Record<Status, string> = {
  verde: 'border-border hover:border-primary/50',
  amarelo: 'border-status-amarelo/45 hover:border-status-amarelo',
  vermelho: 'border-status-vermelho/45 hover:border-status-vermelho',
}

export function CardTabela({ t, dias }: { t: TabelaResumo; dias: string[] }) {
  const s = STATUS_INFO[t.status]
  const tagsExtras = t.tags.filter((x) => !/^sem (pk|dono)$/i.test(x))
  return (
    <Link
      to={rotaTabela(t.nome)}
      className={cn(
        'group relative flex min-w-0 flex-col gap-3 overflow-hidden rounded-2xl border bg-card p-4 shadow-card transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:shadow-elevada',
        BORDA[t.status],
      )}
      aria-label={`${t.nome}: ${s.rotulo}. ${semCrases(t.motivo_status)}`}
    >
      <span className={cn('absolute inset-x-0 top-0 h-1', s.ponto, t.status === 'verde' && 'opacity-60')} aria-hidden />
      <div className="flex items-start gap-3">
        <IconeFarol status={t.status} pulsar={t.status === 'vermelho'} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-[13.5px] font-semibold leading-tight text-foreground group-hover:text-primary" title={t.nome}>
            {t.nome}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {t.dominio.toLowerCase().startsWith(t.camada) ? `Camada ${ROTULO_CAMADA[t.camada].toLowerCase()}` : `${t.dominio} · ${ROTULO_CAMADA[t.camada]}`}
          </p>
        </div>
        {!t.tem_pk && <SeloSemPK />}
      </div>

      <p className={cn('line-clamp-2 min-h-[2.4em] text-[13px] leading-[1.2em]', t.status === 'verde' ? 'text-muted-foreground' : 'font-medium text-foreground')} title={semCrases(t.motivo_status)}>
        <TextoCodigo texto={t.motivo_status} />
      </p>

      <div>
        <FaixaExecucoes execucoes={t.execucoes_30d} dias={dias} />
        <div className="mt-1 flex justify-between text-[10.5px] text-muted-foreground">
          <span>Execuções · 30 dias</span>
          <span className="tabular">{fmtCompacto(t.linhas)} linhas</span>
        </div>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border pt-3 text-xs">
        {t.dono ? (
          <span className="inline-flex min-w-0 items-center gap-1.5 text-muted-foreground" title={t.dono_area ?? undefined}>
            <UserRound className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{t.dono}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-status-amarelo-fundo px-1.5 py-0.5 font-semibold text-status-amarelo-texto">
            <UserRoundX className="size-3.5" aria-hidden />
            Sem dono
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-muted-foreground" title={t.ultima_carga ? `Última carga: ${fmtDataHora(t.ultima_carga)}` : undefined}>
          <Clock className="size-3.5" aria-hidden />
          {t.ultima_carga ? `atualizada ${fmtRelativo(t.ultima_carga)}` : 'sem carga registrada'}
        </span>
        {tagsExtras.length > 0 && (
          <span className="ml-auto flex gap-1">
            {tagsExtras.map((tag) => (
              <Etiqueta key={tag} tom={tag === 'PII' || tag === 'LGPD' ? 'acento' : 'neutro'}>
                {(tag === 'PII' || tag === 'LGPD') && <ShieldAlert className="size-3" aria-hidden />}
                {tag}
              </Etiqueta>
            ))}
          </span>
        )}
      </div>
    </Link>
  )
}

const GRADE = 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'

export function Grade({ tabelas, dias, agrupar, dominios }: { tabelas: TabelaResumo[]; dias: string[]; agrupar: boolean; dominios: string[] }) {
  const grupos = useMemo(() => {
    if (!agrupar) return []
    const m = new Map<string, TabelaResumo[]>()
    for (const t of tabelas) m.set(t.dominio, [...(m.get(t.dominio) ?? []), t])
    return [...m.entries()].sort((a, b) => dominios.indexOf(a[0]) - dominios.indexOf(b[0]))
  }, [tabelas, agrupar, dominios])

  if (!agrupar) {
    return (
      <div className={GRADE}>
        {tabelas.map((t) => (
          <CardTabela key={t.nome} t={t} dias={dias} />
        ))}
      </div>
    )
  }
  return (
    <div className="space-y-7">
      {grupos.map(([dominio, lista]) => {
        const v = lista.filter((t) => t.status === 'vermelho').length
        const a = lista.filter((t) => t.status === 'amarelo').length
        return (
          <section key={dominio} aria-label={dominio}>
            <header className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-[15px] font-semibold tracking-tight">{dominio}</h2>
              <span className="text-xs text-muted-foreground">
                {lista.length} {lista.length === 1 ? 'tabela' : 'tabelas'}
                {v > 0 && <span className="font-semibold text-status-vermelho-texto"> · {v} {v === 1 ? 'crítica' : 'críticas'}</span>}
                {a > 0 && <span className="font-semibold text-status-amarelo-texto"> · {a} em atenção</span>}
              </span>
            </header>
            <div className={GRADE}>
              {lista.map((t) => (
                <CardTabela key={t.nome} t={t} dias={dias} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
