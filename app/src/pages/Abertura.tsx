import { ArrowRight, CalendarClock, ChartColumn, CircleCheck, Database, ExternalLink, FlaskConical, type LucideIcon, Milestone, Newspaper, OctagonAlert, ShieldCheck, Target, UserRound } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { MarcaCase } from '@/components/layout/Marca'
import { AlternadorTema } from '@/components/layout/Shell'
import { buttonVariants } from '@/components/ui/button'
import { Dica } from '@/components/ui/tooltip'
import perfil from '@/content/perfil.json'
import { linkValido } from '@/lib/links'
import { cn } from '@/lib/utils'
import { GrafoLinhagem } from './abertura/GrafoLinhagem'
import { Trajetoria } from './abertura/Trajetoria'

const ICONES_PILAR: Record<string, LucideIcon> = { governanca: ShieldCheck, engenharia: Database, analytics: ChartColumn, gestao: Target }

/** Contagem animada sutil para números ("12+"); textos entram sem contagem. Respeita prefers-reduced-motion. */
function ValorDestaque({ valor }: { valor: string }) {
  const m = /^(\d+)(.*)$/.exec(valor)
  const alvo = m ? Number(m[1]) : 0
  const [n, setN] = useState(m ? 0 : alvo)
  useEffect(() => {
    if (!m) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setN(alvo)
      return
    }
    let quadro = 0
    const inicio = performance.now() + 250
    const passo = (agora: number) => {
      const p = Math.min(1, Math.max(0, (agora - inicio) / 1100))
      setN(Math.round(alvo * (1 - Math.pow(1 - p, 3))))
      if (p < 1) quadro = requestAnimationFrame(passo)
    }
    quadro = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(quadro)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alvo])
  return <span className="tabular">{m ? `${n}${m[2]}` : valor}</span>
}

const classeSecundario = cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'h-9 rounded-lg px-3')

/** Link externo editável: se o valor ainda é "[PREENCHER...]", continua visível, mas não navega. */
function LinkPerfil({ valor, icone: Icone, children }: { valor: string; icone: LucideIcon; children: ReactNode }) {
  if (linkValido(valor)) {
    return (
      <a href={valor} target="_blank" rel="noreferrer" className={classeSecundario}>
        <Icone aria-hidden />
        {children}
        <ExternalLink className="!size-3 opacity-60" aria-hidden />
      </a>
    )
  }
  return (
    <Dica texto="Link a definir">
      <button type="button" aria-disabled="true" onClick={(e) => e.preventDefault()} className={cn(classeSecundario, 'cursor-default text-muted-foreground hover:border-border hover:bg-card hover:text-muted-foreground active:scale-100')}>
        <Icone aria-hidden />
        {children}
      </button>
    </Dica>
  )
}

/** Destaque no topo da abertura: deixa claro, antes de qualquer número, que o ambiente é simulado. */
function AvisoDadosFicticios() {
  return (
    <Dica texto={`${perfil.aviso.titulo} ${perfil.aviso.texto}`} lado="bottom">
      <div
        role="note"
        tabIndex={0}
        className="flex animate-entrar items-center gap-2 rounded-full border border-primary/35 bg-accent py-1.5 pl-2.5 pr-3.5 text-[12.5px] font-semibold leading-none text-accent-foreground shadow-card outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="relative flex size-2" aria-hidden>
          <span className="absolute inline-flex size-full rounded-full bg-agua-500 opacity-60 motion-safe:animate-ping" />
          <span className="relative inline-flex size-2 rounded-full bg-agua-500" />
        </span>
        <FlaskConical className="size-3.5 shrink-0" aria-hidden />
        <span className="whitespace-nowrap">
          {perfil.aviso.rotulo}
          <span className="hidden font-medium opacity-75 sm:inline"> · {perfil.aviso.destaque}</span>
        </span>
      </div>
    </Dica>
  )
}

export default function Abertura() {
  useEffect(() => {
    document.title = `${perfil.nome} · Lucas Analytics Case`
  }, [])
  const [fotoFalhou, setFotoFalhou] = useState(false)
  const agenda = linkValido(perfil.agenda) ? perfil.agenda : linkValido(`mailto:${perfil.email}`) && !perfil.email.startsWith('[') ? `mailto:${perfil.email}` : perfil.agenda

  return (
    <div className="grid min-h-dvh bg-background lg:h-dvh lg:min-h-[660px] lg:grid-cols-[minmax(0,1.14fr)_minmax(0,0.86fr)] lg:overflow-hidden">
      {/* Esquerda: apresentação */}
      <main className="flex min-w-0 flex-col justify-between gap-6 px-6 py-6 sm:px-10 lg:px-14 lg:py-7 xl:px-20 2xl:py-12">
        <header className="flex items-center justify-between gap-3">
          <div className="flex shrink-0 items-center gap-2.5">
            <MarcaCase tamanho={30} />
            <span className="whitespace-nowrap text-sm font-semibold tracking-tight">
              Lucas Analytics <span className="hidden font-normal text-muted-foreground sm:inline">· Case de Dados</span>
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <AvisoDadosFicticios />
            <AlternadorTema />
          </div>
        </header>

        <div className="max-w-[44rem]">
          <p className="animate-entrar text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Quem está apresentando</p>
          <h1 className="mt-2 animate-entrar text-[40px] font-semibold leading-none tracking-[-0.03em] sm:text-[52px]" style={{ animationDelay: '40ms' }}>
            {perfil.nome}
          </h1>
          <p className="mt-2.5 animate-entrar text-[15px] font-medium text-muted-foreground" style={{ animationDelay: '80ms' }}>
            {perfil.titulo}
          </p>
          <p className="mt-4 animate-entrar text-xl font-medium leading-snug tracking-tight text-balance lg:mt-5 lg:text-[21px]" style={{ animationDelay: '120ms' }}>
            {perfil.frase}
          </p>
          <p className="mt-3 animate-entrar text-sm leading-relaxed text-muted-foreground" style={{ animationDelay: '160ms' }}>
            {perfil.bio}
          </p>

          <dl className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {perfil.destaques.map((d, i) => (
              <div key={d.rotulo} className="animate-entrar rounded-xl border border-border bg-card px-3.5 py-3 shadow-card" style={{ animationDelay: `${200 + i * 60}ms` }}>
                <dd className="text-[21px] font-semibold leading-none tracking-tight text-foreground">
                  <ValorDestaque valor={d.valor} />
                </dd>
                <dt className="mt-1.5 text-xs leading-tight text-muted-foreground">{d.rotulo}</dt>
              </div>
            ))}
          </dl>

          <ul className="mt-5 space-y-2">
            {perfil.pilares.map((p, i) => {
              const Icone = ICONES_PILAR[p.icone] ?? ShieldCheck
              return (
                <li key={p.titulo} className="flex animate-entrar items-center gap-2.5 text-[13.5px] leading-tight" style={{ animationDelay: `${420 + i * 50}ms` }}>
                  <span className="grid size-6 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground">
                    <Icone className="size-3.5" aria-hidden />
                  </span>
                  <span className="min-w-0 truncate">
                    <strong className="font-semibold">{p.titulo}:</strong> <span className="text-muted-foreground">{p.texto}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>

        <nav aria-label="Ações" className="animate-entrar" style={{ animationDelay: '600ms' }}>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/visao-executiva"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'group mr-2 h-12 rounded-xl px-7 text-base font-semibold shadow-[0_10px_28px_-10px_var(--agua-600)] hover:shadow-[0_14px_32px_-10px_var(--agua-600)]',
              )}
            >
              Explorar o case
              <ArrowRight className="!size-[18px] transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
            </Link>
            <LinkPerfil valor={perfil.portfolio} icone={ChartColumn}>
              Ver portfólio
            </LinkPerfil>
            <Link to="/artigos" className={classeSecundario}>
              <Newspaper aria-hidden />
              Artigos & publicações
            </Link>
            <span className="hidden basis-full lg:block" aria-hidden />
            <LinkPerfil valor={perfil.linkedin} icone={UserRound}>
              LinkedIn
            </LinkPerfil>
            <Link to="/plano-90-dias" className={classeSecundario}>
              <Milestone aria-hidden />
              Plano de 90 dias
            </Link>
            <LinkPerfil valor={agenda} icone={CalendarClock}>
              Agendar conversa
            </LinkPerfil>
          </div>
        </nav>
      </main>

      {/* Direita: retrato sobre o grafo de linhagem (sempre marinho, nos dois temas) */}
      <aside className="relative isolate flex min-h-[520px] flex-col items-center justify-between gap-4 overflow-hidden bg-marinho-900 px-6 py-6 text-white lg:min-h-0 lg:px-9 2xl:py-10">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_70%_10%,#0E3A5C_0%,#00203A_48%,#00172B_100%)]" aria-hidden />
        <GrafoLinhagem className="absolute inset-0 -z-10 size-full opacity-45" />

        <p className="self-end text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">Linhagem de dados · ambiente simulado</p>

        <div className="relative grid place-items-center">
          <span className="absolute size-[190px] rounded-full border border-white/[0.07] [@media(min-height:860px)]:size-[222px] 2xl:size-[250px]" aria-hidden />
          <span className="absolute size-[150px] rounded-full border border-dashed border-agua-500/25 motion-safe:animate-[spin_60s_linear_infinite] [@media(min-height:860px)]:size-[176px] 2xl:size-[200px]" aria-hidden />
          <div className="relative size-[112px] [@media(min-height:860px)]:size-[136px] rounded-full bg-gradient-to-br from-agua-500 via-agua-500/30 to-white/10 p-[3px] shadow-[0_20px_56px_-12px_rgb(0_0_0/0.6)] 2xl:size-[156px]">
            {perfil.foto && !fotoFalhou ? (
              <img src={perfil.foto} alt={`Foto de ${perfil.nome}`} onError={() => setFotoFalhou(true)} className="size-full rounded-full object-cover" />
            ) : (
              <div className="grid size-full place-items-center rounded-full bg-[radial-gradient(circle_at_30%_25%,#12466B_0%,#062C4B_55%,#00203A_100%)]" role="img" aria-label={`Monograma de ${perfil.nome}`}>
                <span className="bg-gradient-to-b from-white to-agua-500 bg-clip-text text-[44px] font-semibold leading-none tracking-[-0.06em] text-transparent 2xl:text-[60px]">
                  {perfil.iniciais}
                </span>
              </div>
            )}
          </div>

          <div className="absolute right-full top-1 mr-4 flex animate-entrar items-center gap-2 whitespace-nowrap rounded-full border border-white/10 bg-marinho-950/70 py-1.5 pl-2 pr-3 text-xs backdrop-blur-md [@media(max-height:820px)]:hidden" style={{ animationDelay: '500ms' }}>
            <CircleCheck className="size-4 text-[#3CBF62]" aria-hidden />
            <span className="font-mono text-[11px] text-white/85">fato_vendas</span>
            <span className="text-white/50">no SLA</span>
          </div>
          <div className="absolute bottom-1 left-full ml-4 flex animate-entrar items-center gap-2 whitespace-nowrap rounded-full border border-white/10 bg-marinho-950/70 py-1.5 pl-2 pr-3 text-xs backdrop-blur-md [@media(max-height:820px)]:hidden" style={{ animationDelay: '650ms' }}>
            <OctagonAlert className="size-4 text-[#EF6461]" aria-hidden />
            <span className="font-mono text-[11px] text-white/85">fato_parcelas</span>
            <span className="text-white/50">312 duplicados</span>
          </div>
        </div>

        <Trajetoria className="max-w-[540px] animate-entrar" />

        <section className="w-full max-w-[540px] animate-entrar rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3.5 backdrop-blur-md" style={{ animationDelay: '300ms' }}>
          <h2 className="flex items-center gap-2 text-[13px] font-semibold text-agua-500">
            <span className="h-px w-5 bg-agua-500" aria-hidden />
            {perfil.porque.titulo}
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-white/80">{perfil.porque.texto}</p>
          <p className="mt-2.5 flex items-start gap-2.5 border-t border-white/10 pt-2.5 text-[12px] leading-relaxed text-white/70">
            <span className="mt-px grid size-6 shrink-0 place-items-center rounded-md bg-agua-500/15 text-agua-500">
              <FlaskConical className="size-3.5" aria-hidden />
            </span>
            <span>
              <strong className="font-semibold text-white">{perfil.aviso.titulo}</strong> {perfil.aviso.texto}
            </span>
          </p>
        </section>
      </aside>
    </div>
  )
}
