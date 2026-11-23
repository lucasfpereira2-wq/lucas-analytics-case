/**
 * Linhagem interativa da tabela (React Flow): tudo que a alimenta (a montante) e tudo que ela alimenta
 * (a jusante), até os relatórios. Layout próprio em colunas, da esquerda para a direita: fontes → staging → core →
 * marts → relatórios, com a coluna dada pela profundidade em relação à tabela atual.
 */
import { Background, BackgroundVariant, Controls, Handle, MarkerType, MiniMap, Panel, Position, ReactFlow, type Edge, type Node, type NodeProps, type ReactFlowInstance } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Database, FileBarChart, Focus, Maximize2 } from 'lucide-react'
import { useMemo, useRef, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState, STATUS_INFO, statusDoSelo } from '@/components/dados'
import { useTema } from '@/lib/tema'
import { tokensGrafico } from '@/lib/tema-echarts'
import { cn } from '@/lib/utils'
import type { Linhagem as DadosLinhagem, Status } from '@/types/governanca'
import { rotaTabela } from '../comum'

type NoLinhagem = DadosLinhagem['nos'][number]
interface DadosNo extends Record<string, unknown> {
  no: NoLinhagem
  status: Status | null
  atual: boolean
  /** faz parte do caminho do problema (tem status diferente de verde) */
  problema: boolean
  lado: 'montante' | 'jusante' | 'atual'
}
interface DadosTitulo extends Record<string, unknown> {
  titulo: string
  quantidade: number
}

const LARGURA = 214
const ALTURA = 54
const PASSO_X = 272
const PASSO_Y = 66
const ROTULO_CAMADA: Record<string, string> = { staging: 'Staging', core: 'Core', mart: 'Mart' }

const statusDoNo = (n: NoLinhagem): Status | null => (n.tipo === 'relatorio' ? (n.nivel_selo ? statusDoSelo(n.nivel_selo) : null) : n.tipo === 'tabela' ? (n.status ?? null) : null)

function NoTabela({ data }: NodeProps<Node<DadosNo>>) {
  const { no, status, atual, problema } = data
  const s = status ? STATUS_INFO[status] : null
  const Icone = no.tipo === 'fonte' ? Database : no.tipo === 'relatorio' ? FileBarChart : (s?.icone ?? Database)
  const clicavel = no.tipo !== 'fonte'
  return (
    <div
      className={cn(
        'relative flex items-center gap-2.5 rounded-xl border bg-card px-3 text-left shadow-card transition-[box-shadow,border-color] duration-150',
        clicavel && 'cursor-pointer hover:shadow-elevada',
        atual ? 'border-2 border-primary shadow-elevada ring-4 ring-primary/20' : problema && s ? s.borda : 'border-border',
        no.tipo === 'fonte' && 'border-dashed bg-secondary',
      )}
      style={{ width: LARGURA, height: ALTURA }}
      title={clicavel ? (no.tipo === 'relatorio' ? `Abrir o relatório ${no.rotulo}` : `Abrir ${no.rotulo}`) : `Sistema-fonte: ${no.rotulo}`}
    >
      <Handle type="target" position={Position.Left} className="!size-1 !min-h-0 !min-w-0 !border-0 !bg-transparent" isConnectable={false} />
      <span className={cn('grid size-7 shrink-0 place-items-center rounded-full', s ? cn(s.fundo, s.texto) : 'bg-card text-muted-foreground')}>
        <Icone className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate text-[12px] font-semibold leading-tight text-foreground', no.tipo === 'tabela' && 'font-mono text-[11.5px]')}>{no.rotulo}</span>
        <span className="mt-0.5 block truncate text-[10.5px] leading-tight text-muted-foreground">
          {no.tipo === 'fonte' ? 'Sistema-fonte' : no.tipo === 'relatorio' ? `Relatório${s ? ` · ${s.rotulo}` : ''}` : `${ROTULO_CAMADA[no.camada ?? ''] ?? 'Tabela'}${s ? ` · ${s.rotulo}` : ''}`}
        </span>
      </span>
      {atual && <span className="absolute -top-2.5 left-3 rounded-full bg-primary px-2 py-px text-[9.5px] font-bold uppercase tracking-wider text-primary-foreground">Tabela atual</span>}
      <Handle type="source" position={Position.Right} className="!size-1 !min-h-0 !min-w-0 !border-0 !bg-transparent" isConnectable={false} />
    </div>
  )
}

function NoTitulo({ data }: NodeProps<Node<DadosTitulo>>) {
  return (
    <div className="pointer-events-none flex items-baseline gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground" style={{ width: LARGURA }}>
      {data.titulo}
      <span className="font-normal normal-case tracking-normal">{data.quantidade}</span>
    </div>
  )
}

const TIPOS = { no: NoTabela, titulo: NoTitulo }

/** Subgrafo (montante + jusante da tabela) já posicionado em colunas. */
function montar(linhagem: DadosLinhagem, tabela: string, cores: { vermelho: string; amarelo: string; neutro: string }) {
  const porId = new Map(linhagem.nos.map((n) => [n.id, n]))
  if (!porId.has(tabela)) return null
  const saida = new Map<string, string[]>()
  const entrada = new Map<string, string[]>()
  for (const a of linhagem.arestas) {
    if (!porId.has(a.de) || !porId.has(a.para)) continue
    saida.set(a.de, [...(saida.get(a.de) ?? []), a.para])
    entrada.set(a.para, [...(entrada.get(a.para) ?? []), a.de])
  }
  const alcance = (grafo: Map<string, string[]>) => {
    const vistos = new Set<string>()
    const fila = [tabela]
    while (fila.length) {
      for (const v of grafo.get(fila.pop()!) ?? []) {
        if (vistos.has(v)) continue
        vistos.add(v)
        fila.push(v)
      }
    }
    return vistos
  }
  const montante = alcance(entrada)
  const jusante = alcance(saida)
  const ids = new Set([tabela, ...montante, ...jusante])
  // só arestas que passam pela tabela: dentro do lado montante (+atual) ou dentro do lado jusante (+atual)
  const noLado = (lado: Set<string>, id: string) => id === tabela || lado.has(id)
  const arestas = linhagem.arestas.filter((a) => (noLado(montante, a.de) && noLado(montante, a.para)) || (noLado(jusante, a.de) && noLado(jusante, a.para)))

  // coluna = profundidade em relação à tabela atual (caminho mais longo): montante à esquerda, jusante à direita.
  // Toda aresta aponta para a direita e os vizinhos diretos ficam nas colunas adjacentes; relatórios fecham o grafo.
  const pais = new Map<string, string[]>()
  const filhos = new Map<string, string[]>()
  for (const a of arestas) {
    pais.set(a.para, [...(pais.get(a.para) ?? []), a.de])
    filhos.set(a.de, [...(filhos.get(a.de) ?? []), a.para])
  }
  const memo = new Map<string, number>()
  const distancia = (id: string, vizinhos: Map<string, string[]>, lado: Set<string>): number => {
    if (id === tabela) return 0
    if (memo.has(id)) return memo.get(id)!
    memo.set(id, 1) // proteção contra ciclos
    const d = 1 + Math.max(0, ...(vizinhos.get(id) ?? []).filter((v) => noLado(lado, v)).map((v) => distancia(v, vizinhos, lado)))
    memo.set(id, d)
    return d
  }
  const bruta = new Map<string, number>([...ids].map((id) => [id, id === tabela ? 0 : montante.has(id) ? -distancia(id, filhos, montante) : distancia(id, pais, jusante)]))
  const ehRelatorio = (id: string) => porId.get(id)!.tipo === 'relatorio'
  const ultimaTabela = Math.max(0, ...[...bruta].filter(([id]) => !ehRelatorio(id)).map(([, v]) => v))
  for (const id of ids) if (ehRelatorio(id)) bruta.set(id, ultimaTabela + 1)
  const distintas = [...new Set(bruta.values())].sort((a, b) => a - b)
  const coluna = new Map([...bruta].map(([id, v]) => [id, distintas.indexOf(v)]))

  // ordem vertical: baricentro dos vizinhos da coluna anterior (uma passada), desempate por nome
  const colunas: string[][] = distintas.map(() => [])
  for (const id of ids) colunas[coluna.get(id)!].push(id)
  const linha = new Map<string, number>()
  colunas.forEach((col) => {
    const peso = (id: string) => {
      const ps = (pais.get(id) ?? []).map((p) => linha.get(p)).filter((v): v is number => v !== undefined)
      return ps.length ? ps.reduce((s, v) => s + v, 0) / ps.length : Number.MAX_SAFE_INTEGER
    }
    const pesos = new Map(col.map((id) => [id, peso(id)]))
    col.sort((a, b) => pesos.get(a)! - pesos.get(b)! || a.localeCompare(b))
    const desloc = -(col.length - 1) / 2
    col.forEach((id, i) => linha.set(id, i + desloc))
  })
  const topo = Math.min(...[...linha.values()])

  const problematico = (id: string) => {
    const s = statusDoNo(porId.get(id)!)
    return s === 'vermelho' || s === 'amarelo'
  }
  const nos: Node[] = [...ids].map((id) => ({
    id,
    type: 'no',
    position: { x: coluna.get(id)! * PASSO_X, y: linha.get(id)! * PASSO_Y },
    width: LARGURA,
    height: ALTURA,
    zIndex: id === tabela ? 2 : 1,
    data: {
      no: porId.get(id)!,
      status: statusDoNo(porId.get(id)!),
      atual: id === tabela,
      problema: problematico(id),
      lado: id === tabela ? 'atual' : montante.has(id) ? 'montante' : 'jusante',
    } satisfies DadosNo,
  }))
  const titulo = (i: number, texto: string, quantidade: number) =>
    nos.push({
      id: `titulo:${i}`,
      type: 'titulo',
      position: { x: i * PASSO_X, y: topo * PASSO_Y - 40 },
      width: LARGURA,
      height: 18,
      selectable: false,
      data: { titulo: texto, quantidade } satisfies DadosTitulo,
    })
  const colunaAtual = coluna.get(tabela)!
  if (montante.size > 0) titulo(0, 'A montante (origem)', montante.size)
  if (jusante.size > 0) titulo(colunaAtual + 1, 'A jusante (consumo)', [...jusante].filter((id) => !ehRelatorio(id)).length)
  const colunaRelatorios = colunas.findIndex((c) => c.some(ehRelatorio))
  if (colunaRelatorios > colunaAtual + 1) titulo(colunaRelatorios, 'Relatórios', colunas[colunaRelatorios].length)

  const edges: Edge[] = arestas.map((a) => {
    const caminho = problematico(a.de) && problematico(a.para)
    const cor = !caminho ? cores.neutro : statusDoNo(porId.get(a.de)!) === 'vermelho' ? cores.vermelho : cores.amarelo
    return {
      id: `${a.de}->${a.para}`,
      source: a.de,
      target: a.para,
      animated: caminho,
      style: { stroke: cor, strokeWidth: caminho ? 2 : 1.25, opacity: caminho ? 1 : 0.75 },
      markerEnd: { type: MarkerType.ArrowClosed, color: cor, width: 14, height: 14 },
    }
  })

  const relatorios = [...jusante].filter((id) => porId.get(id)!.tipo === 'relatorio').length
  const proximos = [...ids].filter((id) => Math.abs(coluna.get(id)! - colunaAtual) <= 2)
  return {
    nos,
    edges,
    resumo: {
      montante: [...montante].filter((id) => porId.get(id)!.tipo === 'tabela').length,
      fontes: [...montante].filter((id) => porId.get(id)!.tipo === 'fonte').length,
      jusante: [...jusante].filter((id) => porId.get(id)!.tipo === 'tabela').length,
      relatorios,
      problemas: [...ids].filter((id) => id !== tabela && porId.get(id)!.tipo === 'tabela' && problematico(id)).length,
    },
    colunas: colunas.length,
    linhas: Math.max(...colunas.map((c) => c.length)),
    // vizinhança (até 2 colunas para cada lado): foco inicial quando o grafo completo ficaria ilegível
    foco: proximos,
    alturaFoco: (() => {
      const ys = proximos.map((id) => linha.get(id) ?? 0)
      return (Math.max(...ys) - Math.min(...ys)) * PASSO_Y + ALTURA
    })(),
  }
}

export interface ResumoLinhagem {
  montante: number
  fontes: number
  jusante: number
  relatorios: number
  problemas: number
}

export function LinhagemFluxo({ linhagem, tabela }: { linhagem: DadosLinhagem; tabela: string }) {
  const navegar = useNavigate()
  const tema = useTema((s) => s.tema)
  const grafo = useMemo(() => {
    const t = tokensGrafico(tema)
    return montar(linhagem, tabela, { vermelho: t.status.vermelho, amarelo: t.status.amarelo, neutro: tema === 'escuro' ? '#4F6B85' : '#A9B8C7' })
  }, [linhagem, tabela, tema])

  // grafos largos abrem focados na vizinhança direta (legível); o botão alterna para a linhagem completa
  const largo = (grafo?.colunas ?? 0) > 6
  const [completo, setCompleto] = useState(false)
  const instancia = useRef<ReactFlowInstance | null>(null)

  if (!grafo) return <EmptyState compacto titulo="Linhagem não mapeada" descricao="Esta tabela ainda não aparece no grafo de linhagem." />
  const { resumo } = grafo
  const focado = largo && !completo
  const opcoesFoco = { nodes: grafo.foco.map((id) => ({ id })), padding: 0.12, maxZoom: 1, minZoom: 0.45 }
  const opcoesTudo = { padding: 0.06, maxZoom: 1 }
  const altura = Math.min(620, Math.max(380, (largo ? grafo.alturaFoco : grafo.linhas * PASSO_Y) + 190))
  const t = tokensGrafico(tema)
  const alternarVisao = () => {
    const proximo = !completo
    setCompleto(proximo)
    void instancia.current?.fitView({ ...(proximo ? opcoesTudo : opcoesFoco), duration: 450 })
  }

  return (
    <div>
      <p className="mb-3 text-[13px] text-muted-foreground">
        <strong className="font-semibold text-foreground">{resumo.montante}</strong> {resumo.montante === 1 ? 'tabela' : 'tabelas'} e{' '}
        <strong className="font-semibold text-foreground">{resumo.fontes}</strong> {resumo.fontes === 1 ? 'sistema-fonte' : 'sistemas-fonte'} a montante ·{' '}
        <strong className="font-semibold text-foreground">{resumo.jusante}</strong> {resumo.jusante === 1 ? 'tabela' : 'tabelas'} a jusante ·{' '}
        <strong className="font-semibold text-foreground">{resumo.relatorios}</strong> {resumo.relatorios === 1 ? 'relatório alimentado' : 'relatórios alimentados'}
        {resumo.problemas > 0 && (
          <>
            {' '}
            · <strong className="font-semibold text-status-vermelho-texto">{resumo.problemas}</strong> {resumo.problemas === 1 ? 'outra tabela com problema no caminho' : 'outras tabelas com problema no caminho'}
          </>
        )}
      </p>
      <div className="overflow-hidden rounded-xl border border-border bg-background" style={{ height: altura }}>
        <ReactFlow
          key={`${tabela}-${tema}`}
          nodes={grafo.nos}
          edges={grafo.edges}
          nodeTypes={TIPOS}
          forceColorMode={tema === 'escuro' ? 'dark' : 'light'}
          style={{ '--xy-background-color': 'transparent', '--xy-attribution-background-color': 'transparent' } as CSSProperties}
          fitView
          fitViewOptions={focado ? opcoesFoco : opcoesTudo}
          onInit={(i) => {
            instancia.current = i as unknown as ReactFlowInstance
          }}
          minZoom={0.15}
          maxZoom={1.6}
          nodesDraggable={false}
          nodesConnectable={false}
          nodesFocusable={false}
          edgesFocusable={false}
          elementsSelectable={false}
          zoomOnScroll={false}
          preventScrolling={false}
          zoomOnDoubleClick={false}
          onNodeClick={(_, n) => {
            if (n.type !== 'no') return
            const no = (n.data as DadosNo).no
            if (no.tipo === 'tabela' && no.id !== tabela) navegar(rotaTabela(no.id))
            else if (no.tipo === 'relatorio') navegar(`/impactos?relatorio=${no.id.replace(/^relatorio:/, '')}`)
          }}
          aria-label={`Linhagem de ${tabela}`}
        >
          {largo && (
            <Panel position="top-right">
              <button type="button" onClick={alternarVisao} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground shadow-card transition-colors hover:border-primary/60 hover:text-primary">
                {completo ? <Focus className="size-3.5" aria-hidden /> : <Maximize2 className="size-3.5" aria-hidden />}
                {completo ? 'Focar na tabela' : `Ver linhagem completa (${grafo.nos.filter((n) => n.type === 'no').length} nós)`}
              </button>
            </Panel>
          )}
          <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color={t.eixo} />
          <Controls showInteractive={false} position="bottom-left" aria-label="Controles de zoom da linhagem" />
          <MiniMap
            pannable
            zoomable
            position="bottom-right"
            style={{ width: 150, height: 96 }}
            bgColor={t.superficie}
            maskColor={tema === 'escuro' ? 'rgba(0,23,43,.6)' : 'rgba(225,232,239,.6)'}
            nodeBorderRadius={6}
            nodeColor={(n) => {
              if (n.type !== 'no') return 'transparent'
              const d = n.data as DadosNo
              return d.atual ? t.destaque : d.status === 'vermelho' ? t.status.vermelho : d.status === 'amarelo' ? t.status.amarelo : t.eixo
            }}
          />
        </ReactFlow>
      </div>
      <ul className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground" aria-label="Legenda da linhagem">
        {(['verde', 'amarelo', 'vermelho'] as Status[]).map((s) => {
          const I = STATUS_INFO[s].icone
          return (
            <li key={s} className="inline-flex items-center gap-1.5">
              <I className={cn('size-3.5', STATUS_INFO[s].texto)} aria-hidden />
              {STATUS_INFO[s].rotulo}
            </li>
          )
        })}
        <li className="inline-flex items-center gap-1.5">
          <svg width="26" height="6" aria-hidden>
            <line x1="0" y1="3" x2="26" y2="3" stroke={t.status.vermelho} strokeWidth="2" strokeDasharray="5 4" />
          </svg>
          Caminho do problema (o dado com defeito se propaga por aqui)
        </li>
        <li className="ml-auto hidden sm:block">Arraste para mover · use os controles para zoom · clique em um nó para abrir</li>
      </ul>
    </div>
  )
}
