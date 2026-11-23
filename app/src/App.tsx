import { lazy, Suspense } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import Shell from '@/components/layout/Shell'
import { TooltipProvider } from '@/components/ui/tooltip'
import { carregarJSON } from '@/lib/dados'

// Rotas de docs/contratos.md. Todas as páginas são lazy: o ECharts só entra quando uma tela com gráfico abre.
const Abertura = lazy(() => import('@/pages/Abertura'))
const VisaoExecutiva = lazy(() => import('@/pages/VisaoExecutiva'))
const Farol = lazy(() => import('@/pages/farol/Farol'))
const TabelaDetalhe = lazy(() => import('@/pages/farol/TabelaDetalhe'))
const Rotinas = lazy(() => import('@/pages/Rotinas'))
const Glossario = lazy(() => import('@/pages/Glossario'))
const ImpactoRelatorios = lazy(() => import('@/pages/ImpactoRelatorios'))
const Vendas = lazy(() => import('@/pages/relatorios/Vendas'))
const CobrancaCarteira = lazy(() => import('@/pages/relatorios/CobrancaCarteira'))
const CobrancaSafra = lazy(() => import('@/pages/relatorios/CobrancaSafra'))
const Atendimento = lazy(() => import('@/pages/relatorios/Atendimento'))
const Assembleias = lazy(() => import('@/pages/relatorios/Assembleias'))
const Plano90 = lazy(() => import('@/pages/Plano90'))
const Artigos = lazy(() => import('@/pages/Artigos'))
const NaoEncontrada = lazy(() => import('@/pages/NaoEncontrada'))

// aquece o cache do meta (data de referência do portal) sem bloquear a primeira pintura
carregarJSON('meta.json').catch(() => undefined)

export default function App() {
  return (
    <TooltipProvider delayDuration={250} skipDelayDuration={200}>
      <HashRouter>
        <Routes>
          <Route
            path="/"
            element={
              <Suspense fallback={<div className="min-h-dvh bg-background" />}>
                <Abertura />
              </Suspense>
            }
          />
          <Route element={<Shell />}>
            <Route path="/visao-executiva" element={<VisaoExecutiva />} />
            <Route path="/farol" element={<Farol />} />
            <Route path="/farol/:tabela" element={<TabelaDetalhe />} />
            <Route path="/rotinas" element={<Rotinas />} />
            <Route path="/glossario" element={<Glossario />} />
            <Route path="/impactos" element={<ImpactoRelatorios />} />
            <Route path="/relatorios/vendas" element={<Vendas />} />
            <Route path="/relatorios/cobranca-carteira" element={<CobrancaCarteira />} />
            <Route path="/relatorios/cobranca-safra" element={<CobrancaSafra />} />
            <Route path="/relatorios/atendimento" element={<Atendimento />} />
            <Route path="/relatorios/assembleias" element={<Assembleias />} />
            <Route path="/plano-90-dias" element={<Plano90 />} />
            <Route path="/artigos" element={<Artigos />} />
            <Route path="*" element={<NaoEncontrada />} />
          </Route>
        </Routes>
      </HashRouter>
    </TooltipProvider>
  )
}
