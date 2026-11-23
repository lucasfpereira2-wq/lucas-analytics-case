/** Cadastro estático das páginas do Hub (usado na sidebar, breadcrumb e busca global). */
import {
  UserRound,
  BookOpen,
  Gavel,
  Headset,
  Layers,
  LayoutDashboard,
  Milestone,
  Newspaper,
  Radar,
  ShieldAlert,
  TrendingUp,
  Wallet,
  Workflow,
  type LucideIcon,
} from 'lucide-react'

export interface ItemNavegacao {
  rota: string
  titulo: string
  icone: LucideIcon
  /** id do relatório (liga aos cubos e ao selo exibido em Impacto nos relatórios) */
  relatorio?: string
  descricao?: string
}

export const RELATORIOS: ItemNavegacao[] = [
  { rota: '/relatorios/vendas', titulo: 'Vendas', icone: TrendingUp, relatorio: 'vendas', descricao: 'Produção, cotas vendidas, ticket e funil comercial' },
  { rota: '/relatorios/cobranca-carteira', titulo: 'Cobrança · Carteira', icone: Wallet, relatorio: 'cobranca-carteira', descricao: 'Carteira ativa, inadimplência e recuperação' },
  { rota: '/relatorios/cobranca-safra', titulo: 'Cobrança · Safra', icone: Layers, relatorio: 'cobranca-safra', descricao: 'Risco por safra de venda, MOB e cohort' },
  { rota: '/relatorios/atendimento', titulo: 'Atendimento', icone: Headset, relatorio: 'atendimento', descricao: 'Volume, TMA, nível de serviço e NPS' },
  { rota: '/relatorios/assembleias', titulo: 'Assembleias', icone: Gavel, relatorio: 'assembleias', descricao: 'Contemplações, lances e grupos' },
]

export const GRUPOS_NAVEGACAO: { titulo: string; itens: ItemNavegacao[] }[] = [
  { titulo: 'Visão', itens: [{ rota: '/visao-executiva', titulo: 'Visão Executiva', icone: LayoutDashboard, descricao: 'Saúde dos dados e dos relatórios em uma tela' }] },
  {
    titulo: 'Farol de Dados',
    itens: [
      { rota: '/farol', titulo: 'Farol', icone: Radar, descricao: 'Status das 80 tabelas monitoradas' },
      { rota: '/rotinas', titulo: 'Rotinas', icone: Workflow, descricao: 'Pipelines, execuções e falhas' },
      { rota: '/impactos', titulo: 'Impacto nos relatórios', icone: ShieldAlert, descricao: 'Selo de confiança e desvios de cada relatório' },
      { rota: '/glossario', titulo: 'Glossário', icone: BookOpen, descricao: 'Definições oficiais das métricas' },
    ],
  },
  { titulo: 'Relatórios', itens: RELATORIOS },
  {
    titulo: 'Estratégia',
    itens: [
      { rota: '/plano-90-dias', titulo: 'Plano de 90 dias', icone: Milestone, descricao: 'Como atacar qualidade e governança' },
      { rota: '/artigos', titulo: 'Artigos', icone: Newspaper, descricao: 'Artigos e publicações' },
    ],
  },
]

export const PAGINA_SOBRE: ItemNavegacao = { rota: '/', titulo: 'Sobre o Lucas', icone: UserRound, descricao: 'Quem está apresentando' }

export const TODAS_PAGINAS: ItemNavegacao[] = [...GRUPOS_NAVEGACAO.flatMap((g) => g.itens), PAGINA_SOBRE]

export function relatorioPorId(id: string): ItemNavegacao | undefined {
  return RELATORIOS.find((r) => r.relatorio === id)
}

/** Trilha do breadcrumb para uma rota (ex.: /farol/fato_parcelas). */
export function trilhaDaRota(pathname: string): { titulo: string; rota?: string }[] {
  const limpo = pathname.replace(/\/+$/, '') || '/'
  for (const g of GRUPOS_NAVEGACAO) {
    const item = g.itens.find((i) => i.rota === limpo)
    if (item) return g.itens.length === 1 ? [{ titulo: item.titulo }] : [{ titulo: g.titulo }, { titulo: item.titulo }]
  }
  if (limpo.startsWith('/farol/')) {
    return [{ titulo: 'Farol de Dados' }, { titulo: 'Farol', rota: '/farol' }, { titulo: decodeURIComponent(limpo.slice(7)) }]
  }
  return [{ titulo: 'Página não encontrada' }]
}
