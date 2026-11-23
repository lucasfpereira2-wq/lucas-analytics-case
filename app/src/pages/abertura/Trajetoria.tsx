import { Pause, Play } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import dados from '@/content/trajetoria.json'
import { cn } from '@/lib/utils'

/**
 * Linha do tempo animada da trajetória profissional (conteúdo em src/content/trajetoria.json).
 * A curva de evolução se desenha ao abrir; depois os marcos se revezam em destaque, com a empresa
 * correspondente acesa na faixa inferior e o resumo do período no cartão. Passar o mouse pausa;
 * clicar em um marco ou em um passo fixa a seleção. Respeita prefers-reduced-motion.
 */

const L = 520 // largura do viewBox
const X0 = 78
const X1 = 508
const Y_TOPO = 14
const PASSO_Y = 18
const Y_BASE = Y_TOPO + PASSO_Y * (dados.niveis.length - 1)
const Y_ANOS = Y_BASE + 13
const Y_FAIXA = Y_BASE + 21
const ALT_FAIXA = 7
const A = Y_FAIXA + ALT_FAIXA + 25 // altura do viewBox
const INTERVALO_MS = 4600

const xDe = (ano: number) => X0 + ((ano - dados.inicio) / (dados.fim - dados.inicio)) * (X1 - X0)
const yDe = (nivel: number) => Y_BASE - nivel * PASSO_Y

function caminhoDegraus(): { linha: string; area: string } {
  const d = dados.degraus
  let linha = `M${xDe(d[0].ano).toFixed(1)},${yDe(d[0].nivel)}`
  for (let i = 1; i < d.length; i++) linha += ` H${xDe(d[i].ano).toFixed(1)} V${yDe(d[i].nivel)}`
  linha += ` H${xDe(dados.hoje).toFixed(1)}`
  const area = `${linha} V${Y_BASE} H${xDe(d[0].ano).toFixed(1)} Z`
  return { linha, area }
}

function useMovimentoReduzido(): boolean {
  const [reduzido, setReduzido] = useState(() => (typeof window !== 'undefined' ? (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false) : false))
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return
    const ouvir = () => setReduzido(mq.matches)
    mq.addEventListener('change', ouvir)
    return () => mq.removeEventListener('change', ouvir)
  }, [])
  return reduzido
}

export function Trajetoria({ className }: { className?: string }) {
  const { linha, area } = useMemo(caminhoDegraus, [])
  const reduzido = useMovimentoReduzido()
  const [ativo, setAtivo] = useState(0)
  const [sobre, setSobre] = useState(false)
  const [fixo, setFixo] = useState(false)
  const rodando = !reduzido && !sobre && !fixo

  useEffect(() => {
    if (!rodando) return
    const t = window.setInterval(() => setAtivo((a) => (a + 1) % dados.marcos.length), INTERVALO_MS)
    return () => window.clearInterval(t)
  }, [rodando])

  const marco = dados.marcos[ativo]
  const escolher = (i: number) => {
    setAtivo(i)
    setFixo(true)
  }
  const anos: number[] = []
  for (let a = dados.inicio; a < dados.fim; a += 2) anos.push(a)

  return (
    <section
      aria-label={`${dados.titulo}: ${dados.subtitulo}`}
      className={cn('w-full', className)}
      onMouseEnter={() => setSobre(true)}
      onMouseLeave={() => setSobre(false)}
    >
      <style>{`
        @keyframes traj-desenhar { from { stroke-dashoffset: 1 } to { stroke-dashoffset: 0 } }
        @keyframes traj-surgir { from { opacity: 0 } to { opacity: 1 } }
        @keyframes traj-progresso { from { transform: scaleX(0) } to { transform: scaleX(1) } }
        @keyframes traj-pulso { 0% { r: 5; opacity: .55 } 100% { r: 13; opacity: 0 } }
        @keyframes traj-cartao { from { opacity: 0; transform: translateY(5px) } to { opacity: 1; transform: none } }
        .traj-linha { stroke-dasharray: 1; animation: traj-desenhar 2.6s cubic-bezier(.45,.05,.2,1) .35s backwards }
        .traj-area { animation: traj-surgir 1.1s ease-out 2.2s backwards }
        .traj-no { animation: traj-surgir .5s ease-out backwards }
        .traj-pulso { animation: traj-pulso 1.8s ease-out infinite }
        .traj-cartao { animation: traj-cartao .45s cubic-bezier(.2,.7,.2,1) backwards }
        @media (prefers-reduced-motion: reduce) {
          .traj-linha, .traj-area, .traj-no, .traj-pulso, .traj-cartao { animation: none }
        }
      `}</style>

      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold text-agua-500">
            <span className="h-px w-5 bg-agua-500" aria-hidden />
            {dados.titulo}
          </h2>
          <p className="mt-0.5 truncate text-xs text-white/55">{dados.subtitulo} · 2012 → hoje</p>
        </div>
        {!reduzido && (
          <button
            type="button"
            onClick={() => setFixo((f) => !f)}
            aria-label={fixo ? 'Retomar a animação da trajetória' : 'Pausar a animação da trajetória'}
            className="grid size-7 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[0.06] text-white/70 transition-colors hover:bg-white/[0.12] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-agua-500"
          >
            {fixo ? <Play className="size-3" aria-hidden /> : <Pause className="size-3" aria-hidden />}
          </button>
        )}
      </header>

      <svg viewBox={`0 0 ${L} ${A}`} className="mt-2 w-full overflow-visible" role="img" aria-label="Evolução de cargo entre 2012 e hoje, com as empresas de cada período">
        <defs>
          <linearGradient id="traj-grad-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#7b8cff" stopOpacity="0.34" />
            <stop offset="1" stopColor="#7b8cff" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="traj-grad-linha" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#5AA9E6" />
            <stop offset="0.55" stopColor="#7b8cff" />
            <stop offset="1" stopColor="#eceffe" />
          </linearGradient>
          <filter id="traj-brilho" x="-20%" y="-60%" width="140%" height="220%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* níveis */}
        {dados.niveis.map((n, i) => (
          <g key={n}>
            <line x1={X0} x2={X1} y1={yDe(i)} y2={yDe(i)} stroke="white" strokeOpacity={i === 0 ? 0.16 : 0.07} strokeDasharray={i === 0 ? undefined : '2 4'} />
            <text x={X0 - 8} y={yDe(i) + 3} textAnchor="end" fontSize="8.6" className="transition-[fill-opacity] duration-300" fill="white" fillOpacity={marco.nivel === i ? 0.95 : 0.42} fontWeight={marco.nivel === i ? 600 : 400}>
              {n}
            </text>
          </g>
        ))}

        {/* anos */}
        {anos.map((a) => (
          <text key={a} x={xDe(a)} y={Y_ANOS} textAnchor="middle" fontSize="8.2" fill="white" fillOpacity="0.4" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {a}
          </text>
        ))}

        {/* curva de evolução */}
        <path d={area} fill="url(#traj-grad-area)" className="traj-area" />
        <path d={linha} fill="none" stroke="url(#traj-grad-linha)" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" pathLength={1} className="traj-linha" filter="url(#traj-brilho)" />

        {/* promoções internas (degraus) */}
        {dados.degraus.slice(1, -1).map((d, i) => (
          <circle key={d.ano} cx={xDe(d.ano)} cy={yDe(d.nivel)} r="2.6" fill="#00203A" stroke="#5AA9E6" strokeWidth="1.4" className="traj-no" style={{ animationDelay: `${0.9 + i * 0.3}s` }}>
            <title>{`Promoção: ${dados.niveis[d.nivel]}`}</title>
          </circle>
        ))}

        {/* guia do marco ativo */}
        <line x1={xDe(marco.ano)} x2={xDe(marco.ano)} y1={yDe(marco.nivel) + 6} y2={Y_FAIXA - 2} stroke="white" strokeOpacity="0.28" strokeDasharray="2 3" className="transition-all duration-500" />

        {/* empresas */}
        {dados.empresas.map((e, i) => {
          const x = xDe(e.de)
          const w = xDe(e.ate) - x
          const acesa = marco.empresa === i
          return (
            <g key={`${e.nome}-${e.de}`} className="traj-no" style={{ animationDelay: `${1.2 + i * 0.16}s` }}>
              <rect x={x + 0.8} y={Y_FAIXA} width={Math.max(2, w - 1.6)} height={ALT_FAIXA} rx="2.5" fill={e.cor} fillOpacity={acesa ? 1 : 0.34} className="transition-[fill-opacity] duration-500" />
              <text x={x + w / 2} y={Y_FAIXA + ALT_FAIXA + 10 + e.linha * 10} textAnchor="middle" fontSize="8.4" fill="white" fillOpacity={acesa ? 0.98 : 0.5} fontWeight={acesa ? 700 : 500} className="transition-[fill-opacity] duration-500">
                {e.nome}
              </text>
            </g>
          )
        })}

        {/* marcos */}
        {dados.marcos.map((m, i) => {
          const sel = i === ativo
          return (
            <g key={m.periodo} className="traj-no cursor-pointer" style={{ animationDelay: `${2.3 + i * 0.12}s` }} onClick={() => escolher(i)}>
              <title>{`${m.periodo} · ${m.empresaNome}: ${m.cargo}`}</title>
              {sel && <circle cx={xDe(m.ano)} cy={yDe(m.nivel)} r="5" fill="none" stroke="#7b8cff" strokeWidth="1.6" className="traj-pulso" />}
              <circle cx={xDe(m.ano)} cy={yDe(m.nivel)} r="9" fill="transparent" />
              <circle cx={xDe(m.ano)} cy={yDe(m.nivel)} r={sel ? 5.2 : 3.4} fill={sel ? '#FFFFFF' : '#00203A'} stroke={sel ? '#7b8cff' : '#eceffe'} strokeWidth={sel ? 2.4 : 1.5} className="transition-all duration-300" />
            </g>
          )
        })}
      </svg>

      {/* cartão do marco ativo */}
      <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-md" aria-live="polite">
        <div key={ativo} className="traj-cartao min-h-[88px]">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="tabular rounded-md bg-agua-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-agua-500">{marco.periodo}</span>
            <span className="text-[13px] font-semibold text-white">{marco.empresaNome}</span>
            <span className="ml-auto hidden gap-1.5 sm:flex">
              {marco.tags.map((t) => (
                <span key={t} className="rounded-full border border-white/12 px-2 py-px text-[10.5px] text-white/60">
                  {t}
                </span>
              ))}
            </span>
          </div>
          <p className="mt-1.5 text-[14px] font-semibold leading-snug tracking-tight text-white">{marco.cargo}</p>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-white/70">{marco.texto}</p>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5" role="tablist" aria-label="Marcos da trajetória">
          {dados.marcos.map((m, i) => (
            <button
              key={m.periodo}
              type="button"
              role="tab"
              aria-selected={i === ativo}
              aria-label={`${m.periodo}, ${m.empresaNome}`}
              onClick={() => escolher(i)}
              className={cn('relative h-1.5 overflow-hidden rounded-full bg-white/15 transition-[flex-grow,background-color] duration-300 hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-agua-500', i === ativo ? 'grow-[3]' : 'grow')}
              style={{ flexBasis: 0 }}
            >
              {i === ativo && (
                <span
                  key={`${ativo}-${rodando}`}
                  className="absolute inset-0 origin-left rounded-full bg-agua-500"
                  style={rodando ? { animation: `traj-progresso ${INTERVALO_MS}ms linear forwards` } : undefined}
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
