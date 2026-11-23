/**
 * Camada de dados: todos os JSONs ficam em public/data e são buscados de forma relativa
 * (BASE_URL + "data/..."), com cache em memória. Arquivo ausente NÃO é erro fatal: os hooks
 * devolvem { dados: null, erro } e as telas mostram estado vazio.
 */
import { useEffect, useState } from 'react'
import type { DadosRelatorio } from '@/types/cubo'
import type {
  Catalogo,
  Incidente,
  Linhagem,
  Meta,
  Pipeline,
  Saude,
  Selo,
  TabelaDetalhe,
  TermoGlossario,
} from '@/types/governanca'
import { definirDataReferencia } from './referencia'

export class ErroDados extends Error {
  caminho: string
  /** true quando o arquivo simplesmente não existe (ainda não foi gerado) */
  ausente: boolean
  constructor(caminho: string, mensagem: string, ausente: boolean) {
    super(mensagem)
    this.name = 'ErroDados'
    this.caminho = caminho
    this.ausente = ausente
  }
}

const promessas = new Map<string, Promise<unknown>>()
const resolvidos = new Map<string, unknown>()

export function urlDados(caminho: string): string {
  return `${import.meta.env.BASE_URL}data/${caminho.replace(/^\/+/, '')}`
}

/** Busca um JSON de public/data (ex.: "governanca/selos.json"), com cache em memória. */
export function carregarJSON<T>(caminho: string): Promise<T> {
  const emCache = promessas.get(caminho)
  if (emCache) return emCache as Promise<T>
  const p = (async () => {
    let resp: Response
    try {
      resp = await fetch(urlDados(caminho))
    } catch {
      throw new ErroDados(caminho, `Não foi possível carregar ${caminho}`, false)
    }
    const tipo = resp.headers.get('content-type') ?? ''
    // servidores de SPA devolvem index.html (200) para arquivos inexistentes
    if (resp.status === 404 || tipo.includes('text/html')) {
      throw new ErroDados(caminho, `Arquivo de dados ainda não disponível: ${caminho}`, true)
    }
    if (!resp.ok) throw new ErroDados(caminho, `Erro ${resp.status} ao carregar ${caminho}`, false)
    try {
      const json = (await resp.json()) as T
      resolvidos.set(caminho, json)
      if (caminho === 'meta.json') definirDataReferencia((json as unknown as Meta).data_referencia)
      return json
    } catch {
      throw new ErroDados(caminho, `Conteúdo inválido em ${caminho}`, false)
    }
  })()
  promessas.set(caminho, p)
  p.catch(() => promessas.delete(caminho)) // permite nova tentativa na próxima navegação
  return p
}

export interface ResultadoDados<T> {
  dados: T | null
  carregando: boolean
  erro: ErroDados | null
}

/** Hook genérico. Passe `null` para não buscar nada (ex.: id ainda desconhecido). */
export function useDados<T>(caminho: string | null): ResultadoDados<T> {
  const inicial = (): ResultadoDados<T> & { caminho: string | null } => ({
    caminho,
    dados: caminho && resolvidos.has(caminho) ? (resolvidos.get(caminho) as T) : null,
    carregando: !!caminho && !resolvidos.has(caminho),
    erro: null,
  })
  const [estado, setEstado] = useState(inicial)
  const atual = estado.caminho === caminho ? estado : inicial()

  useEffect(() => {
    if (!caminho) return
    let ativo = true
    if (resolvidos.has(caminho)) {
      setEstado({ caminho, dados: resolvidos.get(caminho) as T, carregando: false, erro: null })
      return
    }
    setEstado({ caminho, dados: null, carregando: true, erro: null })
    carregarJSON<T>(caminho).then(
      (dados) => ativo && setEstado({ caminho, dados, carregando: false, erro: null }),
      (e: unknown) =>
        ativo &&
        setEstado({
          caminho,
          dados: null,
          carregando: false,
          erro: e instanceof ErroDados ? e : new ErroDados(caminho, String(e), false),
        }),
    )
    return () => {
      ativo = false
    }
  }, [caminho])

  return { dados: atual.dados, carregando: atual.carregando, erro: atual.erro }
}

export const useMeta = () => useDados<Meta>('meta.json')
export const useCatalogo = () => useDados<Catalogo>('governanca/catalogo.json')
export const useSaude = () => useDados<Saude>('governanca/saude.json')
export const useSelos = () => useDados<Record<string, Selo>>('governanca/selos.json')
export const useIncidentes = () => useDados<Incidente[]>('governanca/incidentes.json')
export const useLinhagem = () => useDados<Linhagem>('governanca/linhagem.json')
export const usePipelines = () => useDados<Pipeline[]>('governanca/pipelines.json')
export const useGlossario = () => useDados<TermoGlossario[]>('governanca/glossario.json')
export const useTabelaDetalhe = (nome: string | null | undefined) =>
  useDados<TabelaDetalhe>(nome ? `governanca/tabelas/${nome}.json` : null)
/** id ∈ vendas | cobranca-carteira | cobranca-safra | atendimento | assembleias */
export const useRelatorio = (id: string | null | undefined) =>
  useDados<DadosRelatorio>(id ? `relatorios/${id}.json` : null)
