import * as DialogPrimitive from '@radix-ui/react-dialog'
import { CalendarClock, ChevronRight, Menu, Moon, PanelLeft, PanelLeftClose, Sun, X } from 'lucide-react'
import { Suspense, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { SkeletonRelatorio } from '@/components/dados/Skeletons'
import { Button } from '@/components/ui/button'
import { DialogOverlay, DialogPortal } from '@/components/ui/dialog'
import { Dica } from '@/components/ui/tooltip'
import { useMeta, useSelos } from '@/lib/dados'
import { fmtDataHora } from '@/lib/formato'
import { DATA_REFERENCIA_PADRAO } from '@/lib/referencia'
import perfil from '@/content/perfil.json'
import { GRUPOS_NAVEGACAO, PAGINA_SOBRE, trilhaDaRota, type ItemNavegacao } from '@/lib/relatorios'
import { useTema } from '@/lib/tema'
import { cn } from '@/lib/utils'
import { MarcaCase } from './Marca'
import { BuscaGlobal } from './BuscaGlobal'

const CHAVE_SIDEBAR = 'lucas-case:sidebar-recolhida'

function ItemMenu({ item, recolhida, aoNavegar }: { item: ItemNavegacao; recolhida: boolean; aoNavegar?: () => void }) {
  const { dados: selos } = useSelos()
  // os relatórios ficam limpos no menu: a contagem de relatórios com ressalva aparece só no item de impacto
  const comRessalva = item.rota === '/impactos' && selos ? Object.values(selos).filter((s) => s.nivel !== 'confiavel').length : 0
  const link = (
    <NavLink
      to={item.rota}
      end={item.rota === '/' || item.rota === '/farol' ? item.rota === '/' : false}
      onClick={aoNavegar}
      className={({ isActive }) =>
        cn(
          'group relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-[13.5px] font-medium text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent hover:text-white',
          isActive && 'bg-sidebar-accent text-white before:absolute before:-left-3 before:top-2 before:h-5 before:w-[3px] before:rounded-r-full before:bg-agua-500',
          recolhida && 'justify-center px-0',
        )
      }
    >
      <item.icone className="size-[18px] shrink-0 opacity-80 group-hover:opacity-100" aria-hidden />
      {!recolhida && <span className="flex-1 truncate">{item.titulo}</span>}
      {comRessalva > 0 && (
        <span className={cn('tabular grid h-[18px] min-w-[18px] place-items-center rounded-full bg-status-amarelo px-1 text-[11px] font-bold leading-none text-marinho-950', recolhida && 'absolute right-0.5 top-0.5 h-4 min-w-4 text-[10px]')} title={`${comRessalva} relatórios com ressalva`}>
          {comRessalva}
        </span>
      )}
    </NavLink>
  )
  return recolhida ? (
    <Dica texto={item.titulo} lado="right">
      {link}
    </Dica>
  ) : (
    link
  )
}

function ConteudoSidebar({ recolhida, aoNavegar }: { recolhida: boolean; aoNavegar?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <Link to="/visao-executiva" onClick={aoNavegar} className={cn('flex h-14 shrink-0 items-center gap-3 border-b border-sidebar-border px-4', recolhida && 'justify-center px-0')}>
        <MarcaCase tamanho={30} />
        {!recolhida && (
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[15px] font-semibold tracking-tight text-white">Lucas Analytics</span>
            <span className="block truncate text-[11px] font-medium text-sidebar-muted">Case · Qualidade de Dados</span>
          </span>
        )}
      </Link>
      <nav className="scroll-fino flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Navegação principal">
        {GRUPOS_NAVEGACAO.map((g) => (
          <div key={g.titulo}>
            {recolhida ? (
              <div className="mx-auto mb-2 h-px w-6 bg-sidebar-border" aria-hidden />
            ) : (
              <p className="mb-1.5 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-sidebar-muted">{g.titulo}</p>
            )}
            <div className="space-y-0.5">
              {g.itens.map((i) => (
                <ItemMenu key={i.rota} item={i} recolhida={recolhida} aoNavegar={aoNavegar} />
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="shrink-0 border-t border-sidebar-border p-3">
        <Link
          to={PAGINA_SOBRE.rota}
          onClick={aoNavegar}
          className={cn('flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-sidebar-accent', recolhida && 'justify-center p-1.5')}
          title="Sobre o Lucas"
        >
          {perfil.foto ? (
            <img src={perfil.foto} alt="" className="size-8 shrink-0 rounded-full object-cover ring-1 ring-agua-500/50" />
          ) : (
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sidebar-accent text-[11px] font-semibold text-agua-500 ring-1 ring-agua-500/40">{perfil.iniciais}</span>
          )}
          {!recolhida && (
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[13px] font-medium text-white">Sobre o Lucas</span>
              <span className="block truncate text-[11px] text-sidebar-muted">Quem está apresentando</span>
            </span>
          )}
        </Link>
      </div>
    </div>
  )
}

function SeloPosicao() {
  const { dados: meta } = useMeta()
  const ref = meta?.data_referencia ?? DATA_REFERENCIA_PADRAO
  return (
    <Dica texto="Ambiente simulado: o portal está congelado nesta data e hora de referência." lado="bottom">
      <span tabIndex={0} className="tabular hidden h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-border bg-card px-3 text-[13px] md:inline-flex">
        <CalendarClock className="size-4 text-primary" aria-hidden />
        <span className="text-muted-foreground">Posição:</span>
        <span className="font-medium">{fmtDataHora(ref)}</span>
      </span>
    </Dica>
  )
}

function AlternadorTema() {
  const tema = useTema((s) => s.tema)
  const alternar = useTema((s) => s.alternar)
  const rotulo = tema === 'escuro' ? 'Mudar para o tema claro' : 'Mudar para o tema escuro'
  return (
    <Dica texto={rotulo} lado="bottom">
      <Button variant="outline" size="icon" onClick={alternar} aria-label={rotulo}>
        {tema === 'escuro' ? <Sun /> : <Moon />}
      </Button>
    </Dica>
  )
}

export { AlternadorTema }

/** Casca do Hub: sidebar recolhível (drawer no mobile), barra superior, conteúdo e rodapé. */
export default function Shell() {
  const { pathname } = useLocation()
  const [recolhida, setRecolhida] = useState(() => {
    try {
      return localStorage.getItem(CHAVE_SIDEBAR) === '1'
    } catch {
      return false
    }
  })
  const [drawer, setDrawer] = useState(false)
  const trilha = trilhaDaRota(pathname)

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE_SIDEBAR, recolhida ? '1' : '0')
    } catch {
      /* ignora */
    }
  }, [recolhida])
  useEffect(() => {
    window.scrollTo(0, 0)
    const t = trilha[trilha.length - 1]?.titulo
    document.title = t ? `${t} · Lucas Analytics Case` : 'Lucas Analytics Case · Qualidade e Governança de Dados'
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  return (
    <div className="min-h-dvh bg-background">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow-elevada">
        Pular para o conteúdo
      </a>

      <aside className={cn('fixed inset-y-0 left-0 z-30 hidden transition-[width] duration-200 ease-out lg:block', recolhida ? 'w-16' : 'w-64')}>
        <ConteudoSidebar recolhida={recolhida} />
      </aside>

      <DialogPrimitive.Root open={drawer} onOpenChange={setDrawer}>
        <DialogPortal>
          <DialogOverlay className="lg:hidden" />
          <DialogPrimitive.Content aria-describedby={undefined} className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] shadow-elevada outline-none data-[state=open]:animate-[surgir_.2s_ease-out] lg:hidden">
            <DialogPrimitive.Title className="sr-only">Menu de navegação</DialogPrimitive.Title>
            <ConteudoSidebar recolhida={false} aoNavegar={() => setDrawer(false)} />
            <DialogPrimitive.Close className="absolute right-3 top-3.5 rounded-md p-1.5 text-sidebar-foreground hover:bg-sidebar-accent" aria-label="Fechar menu">
              <X className="size-4" />
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </DialogPortal>
      </DialogPrimitive.Root>

      <div className={cn('flex min-h-dvh min-w-0 flex-col transition-[padding] duration-200 ease-out', recolhida ? 'lg:pl-16' : 'lg:pl-64')}>
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur-md sm:gap-3 sm:px-5">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setDrawer(true)} aria-label="Abrir menu">
            <Menu />
          </Button>
          <Dica texto={recolhida ? 'Expandir menu' : 'Recolher menu'} lado="bottom">
            <Button variant="ghost" size="icon" className="hidden lg:inline-flex" onClick={() => setRecolhida((v) => !v)} aria-label={recolhida ? 'Expandir menu' : 'Recolher menu'}>
              {recolhida ? <PanelLeft /> : <PanelLeftClose />}
            </Button>
          </Dica>
          <nav aria-label="Trilha" className="flex min-w-0 flex-1 items-center gap-1.5 text-[13px]">
            <Link to="/visao-executiva" className="hidden text-muted-foreground transition-colors hover:text-foreground sm:inline">
              Case
            </Link>
            {trilha.map((t, i) => (
              <span key={i} className={cn('flex min-w-0 items-center gap-1.5', i < trilha.length - 1 && 'hidden sm:flex')}>
                <ChevronRight className="hidden size-3.5 shrink-0 text-muted-foreground/60 sm:block" aria-hidden />
                {t.rota ? (
                  <Link to={t.rota} className="truncate text-muted-foreground transition-colors hover:text-foreground">
                    {t.titulo}
                  </Link>
                ) : (
                  <span className={cn('truncate', i === trilha.length - 1 ? 'font-semibold text-foreground' : 'text-muted-foreground')} aria-current={i === trilha.length - 1 ? 'page' : undefined}>
                    {t.titulo}
                  </span>
                )}
              </span>
            ))}
          </nav>
          <BuscaGlobal />
          <SeloPosicao />
          <AlternadorTema />
        </header>

        <main id="conteudo" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Suspense fallback={<SkeletonRelatorio />}>
            <Outlet />
          </Suspense>
        </main>

        <footer className="shrink-0 border-t border-border px-4 py-4 text-center text-xs text-muted-foreground sm:px-6 lg:px-8">
          Ambiente simulado. Dados fictícios gerados para demonstração.
        </footer>
      </div>
    </div>
  )
}
