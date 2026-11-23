import { useId } from 'react'
import { cn } from '@/lib/utils'

export interface SparklineProps {
  dados: (number | null | undefined)[]
  largura?: number
  altura?: number
  /** cor do traço (padrão: acento do tema via currentColor) */
  cor?: string
  area?: boolean
  /** destaca o último ponto */
  ponto?: boolean
  className?: string
  titulo?: string
}

/** Minigráfico de linha em SVG puro (leve: não carrega o ECharts). */
export function Sparkline({ dados, largura = 96, altura = 32, cor, area = true, ponto = true, className, titulo }: SparklineProps) {
  const id = useId()
  const pts = dados.map((v) => (typeof v === 'number' && Number.isFinite(v) ? v : null))
  const validos = pts.filter((v): v is number => v !== null)
  if (validos.length < 2) return <svg width={largura} height={altura} className={className} aria-hidden />
  const min = Math.min(...validos)
  const max = Math.max(...validos)
  const pad = 3
  const dx = (largura - pad * 2) / (pts.length - 1)
  const y = (v: number) => (max === min ? altura / 2 : pad + (1 - (v - min) / (max - min)) * (altura - pad * 2))
  let d = ''
  let ultimo: [number, number] | null = null
  let primeiroX: number | null = null
  pts.forEach((v, i) => {
    if (v === null) return
    const px = pad + i * dx
    const py = y(v)
    d += `${ultimo ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`
    if (primeiroX === null) primeiroX = px
    ultimo = [px, py]
  })
  const fim = ultimo as [number, number] | null
  return (
    <svg
      width={largura}
      height={altura}
      viewBox={`0 0 ${largura} ${altura}`}
      className={cn('overflow-visible text-primary', className)}
      style={cor ? { color: cor } : undefined}
      role="img"
      aria-label={titulo ?? 'Tendência'}
    >
      {area && fim && primeiroX !== null && (
        <>
          <defs>
            <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${d}L${fim[0].toFixed(1)},${altura}L${(primeiroX as number).toFixed(1)},${altura}Z`} fill={`url(#${id})`} />
        </>
      )}
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      {ponto && fim && <circle cx={fim[0]} cy={fim[1]} r={2.75} fill="currentColor" stroke="var(--card)" strokeWidth={1.5} />}
    </svg>
  )
}
