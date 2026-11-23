import { ArrowUpRight, FileWarning, FlaskConical, KeyRound, UserRoundX, Workflow, type LucideIcon } from 'lucide-react'
import type { MouseEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { STATUS_INFO } from '@/components/dados'
import { fmtNumero, fmtPct } from '@/lib/formato'
import { cn } from '@/lib/utils'
import type { Saude, Status } from '@/types/governanca'

const ORDEM: Status[] = ['verde', 'amarelo', 'vermelho']
const ROTULO_FAROL: Record<Status, string> = { verde: 'Saudáveis', amarelo: 'Em atenção', vermelho: 'Críticas' }

/** Farol das tabelas: três contadores clicáveis (levam ao Farol já filtrado) e a barra de proporção. */
function FarolTabelas({ saude }: { saude: Saude }) {
  const { contagem } = saude
  const total = contagem.total || 1
  return (
    <div className="col-span-2 flex flex-col rounded-2xl border border-border bg-card p-4 shadow-card sm:col-span-3 xl:col-span-1">
      <div className="flex items-center justify-between gap-2 text-[13px] font-medium text-muted-foreground">
        <span>Farol das {fmtNumero(contagem.total)} tabelas</span>
        <Link to="/farol" className="inline-flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline">
          Abrir Farol
          <ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1">
        {ORDEM.map((s) => {
          const info = STATUS_INFO[s]
          const Icone = info.icone
          return (
            <Link
              key={s}
              to={`/farol?status=${s}`}
              title={`Ver tabelas ${ROTULO_FAROL[s].toLowerCase()} no Farol`}
              className="group -mx-1 rounded-lg px-2 py-1 transition-colors hover:bg-secondary"
            >
              <span className="flex items-baseline gap-1.5">
                <span className="tabular text-[28px] font-semibold leading-none tracking-tight">{fmtNumero(contagem[s])}</span>
                <span className="tabular text-xs text-muted-foreground">{fmtPct(contagem[s] / total, 0)}</span>
              </span>
              <span className={cn('mt-1.5 flex items-center gap-1 whitespace-nowrap text-xs font-medium', info.texto)}>
                <Icone className="size-3.5" aria-hidden />
                {ROTULO_FAROL[s]}
              </span>
            </Link>
          )
        })}
      </div>
      <div className="mt-auto flex h-1.5 gap-0.5 pt-2.5" aria-hidden>
        {ORDEM.map((s) => (
          <span key={s} className={cn('h-1.5 rounded-full', STATUS_INFO[s].ponto)} style={{ width: `${(contagem[s] / total) * 100}%` }} />
        ))}
      </div>
    </div>
  )
}

function Indicador({ rotulo, valor, de, detalhe, icone: Icone, alerta, para, ancora }: { rotulo: string; valor: number; de?: number; detalhe: ReactNode; icone: LucideIcon; alerta?: Status; para?: string; ancora?: string }) {
  const s = alerta ? STATUS_INFO[alerta] : null
  // âncoras internas rolam a página (o HashRouter já ocupa o # da URL)
  const rolar = (e: MouseEvent) => {
    if (!ancora) return
    e.preventDefault()
    const alvo = document.getElementById(ancora)
    alvo?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    // garantia: se a rolagem suave for interrompida (ex.: layout ainda animando), conclui sem animação
    window.setTimeout(() => {
      if (alvo && alvo.getBoundingClientRect().top > 160) alvo.scrollIntoView({ block: 'start' })
    }, 700)
  }
  return (
    <Link
      to={para ?? '#'}
      onClick={rolar}
      className="group flex flex-col rounded-2xl border border-border bg-card p-4 text-left shadow-card transition-[box-shadow,border-color,transform] duration-200 hover:-translate-y-px hover:border-primary/40 hover:shadow-elevada"
    >
      <span className="flex items-start justify-between gap-2">
        <span className="min-h-[2.1rem] text-[13px] font-medium leading-tight text-muted-foreground">{rotulo}</span>
        <Icone className={cn('size-4 shrink-0', s ? s.texto : 'text-primary')} aria-hidden />
      </span>
      <span className="mt-1.5 flex items-baseline gap-1.5">
        <span className="tabular text-[28px] font-semibold leading-none tracking-tight">{fmtNumero(valor)}</span>
        {typeof de === 'number' && <span className="tabular text-[13px] text-muted-foreground">de {fmtNumero(de)}</span>}
      </span>
      <span className="mt-1.5 text-xs leading-snug text-muted-foreground">{detalhe}</span>
    </Link>
  )
}

/** Linha de indicadores da Visão Executiva. */
export function LinhaIndicadores({ saude }: { saude: Saude }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-[minmax(0,2.5fr)_repeat(5,minmax(0,1fr))]">
      <FarolTabelas saude={saude} />
      <Indicador
        rotulo="Rotinas que falharam hoje"
        valor={saude.rotinas_falharam_hoje}
        de={saude.rotinas_total}
        detalhe="Ver erros"
        icone={Workflow}
        alerta={saude.rotinas_falharam_hoje > 0 ? 'vermelho' : undefined}
        para="/rotinas?status=falha"
      />
      <Indicador
        rotulo="Testes falhando"
        valor={saude.testes_falhando}
        de={saude.testes_total}
        detalhe={`${fmtNumero(saude.testes_alerta)} em alerta`}
        icone={FlaskConical}
        alerta={saude.testes_falhando > 0 ? 'vermelho' : undefined}
        para="/farol?status=vermelho"
      />
      <Indicador
        rotulo="Relatórios impactados"
        valor={saude.relatorios_impactados}
        de={saude.relatorios_total}
        detalhe="Com ressalva"
        icone={FileWarning}
        alerta={saude.relatorios_impactados > 0 ? 'amarelo' : undefined}
        para="/impactos"
      />
      <Indicador
        rotulo="Tabelas sem PK"
        valor={saude.tabelas_sem_pk}
        detalhe="Sem chave primária"
        icone={KeyRound}
        alerta={saude.tabelas_sem_pk > 0 ? 'amarelo' : undefined}
        para="/farol?pk=sem"
      />
      <Indicador
        rotulo="Tabelas sem dono"
        valor={saude.tabelas_sem_dono}
        detalhe="Sem responsável"
        icone={UserRoundX}
        alerta={saude.tabelas_sem_dono > 0 ? 'amarelo' : undefined}
        para="/farol?dono=Sem%20dono"
      />
    </div>
  )
}
