/**
 * Composição abstrata de fundo da Abertura: um grafo de linhagem (fontes → staging → core → marts →
 * relatórios) com fluxo discreto nas arestas e nós pulsando como faróis de status. Puramente decorativa.
 */
type Farol = 'ok' | 'alerta' | 'critico'

const COLUNAS: { x: number; ys: number[] }[] = [
  { x: 50, ys: [150, 310, 480, 650] },
  { x: 185, ys: [90, 215, 350, 500, 665] },
  { x: 325, ys: [160, 325, 470, 620] },
  { x: 460, ys: [105, 250, 410, 570, 710] },
  { x: 575, ys: [190, 400, 610] },
]
// ligações [coluna, índice origem, índice destino na coluna seguinte]
const ARESTAS: [number, number, number][] = [
  [0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 2], [0, 2, 3], [0, 3, 3], [0, 3, 4],
  [1, 0, 0], [1, 1, 0], [1, 2, 1], [1, 3, 2], [1, 3, 1], [1, 4, 3],
  [2, 0, 0], [2, 0, 1], [2, 1, 1], [2, 1, 2], [2, 2, 3], [2, 3, 3], [2, 3, 4],
  [3, 0, 0], [3, 1, 0], [3, 2, 1], [3, 3, 1], [3, 3, 2], [3, 4, 2],
]
const FAROIS: Record<string, Farol> = { '1-3': 'critico', '2-2': 'alerta', '3-3': 'alerta', '4-1': 'critico' }
const COR: Record<Farol, string> = { ok: '#7b8cff', alerta: '#F0B429', critico: '#EF6461' }

export function GrafoLinhagem({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 620 800" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden focusable="false">
      <defs>
        <radialGradient id="grafo-foco" cx="50%" cy="46%" r="60%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.25" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#fff" stopOpacity="1" />
        </radialGradient>
        <mask id="grafo-mascara">
          <rect width="620" height="800" fill="url(#grafo-foco)" />
        </mask>
      </defs>
      <g mask="url(#grafo-mascara)">
        <g fill="none" strokeLinecap="round">
          {ARESTAS.map(([c, a, b], i) => {
            const x1 = COLUNAS[c].x
            const y1 = COLUNAS[c].ys[a]
            const x2 = COLUNAS[c + 1].x
            const y2 = COLUNAS[c + 1].ys[b]
            const dx = (x2 - x1) * 0.5
            const d = `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`
            return (
              <g key={i}>
                <path d={d} stroke="#5AA9E6" strokeOpacity={0.16} strokeWidth={1} />
                <path
                  d={d}
                  stroke="#7b8cff"
                  strokeOpacity={0.55}
                  strokeWidth={1.25}
                  strokeDasharray="3 61"
                  style={{ animation: `fluxo ${5 + (i % 5) * 0.9}s linear infinite`, animationDelay: `${-(i * 0.7)}s` }}
                />
              </g>
            )
          })}
        </g>
        {COLUNAS.map((col, c) =>
          col.ys.map((y, k) => {
            const farol = FAROIS[`${c}-${k}`] ?? 'ok'
            const cor = COR[farol]
            const pulsa = farol !== 'ok' || (c + k) % 3 === 0
            return (
              <g key={`${c}-${k}`}>
                {pulsa && (
                  <circle
                    cx={col.x}
                    cy={y}
                    r={5}
                    fill={cor}
                    style={{
                      transformBox: 'fill-box',
                      transformOrigin: 'center',
                      animation: `farol-pulso ${farol === 'ok' ? 4.2 : 2.6}s ease-out infinite`,
                      animationDelay: `${-((c * 3 + k) % 7) * 0.6}s`,
                    }}
                  />
                )}
                <circle cx={col.x} cy={y} r={c === 4 ? 6.5 : 4.5} fill="#00203A" stroke={cor} strokeWidth={1.75} strokeOpacity={farol === 'ok' ? 0.75 : 1} />
                <circle cx={col.x} cy={y} r={c === 4 ? 2.5 : 1.75} fill={cor} />
              </g>
            )
          }),
        )}
      </g>
    </svg>
  )
}
