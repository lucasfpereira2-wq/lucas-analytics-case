import * as DialogPrimitive from '@radix-ui/react-dialog'
import { BookOpen, Search, Table2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StatusDot } from '@/components/dados/StatusBadge'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { DialogOverlay, DialogPortal } from '@/components/ui/dialog'
import { useCatalogo, useGlossario } from '@/lib/dados'
import { GRUPOS_NAVEGACAO, PAGINA_SOBRE, RELATORIOS } from '@/lib/relatorios'

/** Busca global (Ctrl+K): páginas, relatórios, tabelas do catálogo e termos do glossário. */
export function BuscaGlobal() {
  const [aberto, setAberto] = useState(false)
  const [jaAbriu, setJaAbriu] = useState(false)
  const navegar = useNavigate()

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setAberto((v) => !v)
      }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [])
  useEffect(() => {
    if (aberto) setJaAbriu(true)
  }, [aberto])

  const ir = (rota: string) => {
    setAberto(false)
    navegar(rota)
  }
  const paginas = [...GRUPOS_NAVEGACAO.filter((g) => g.titulo !== 'Relatórios').flatMap((g) => g.itens), PAGINA_SOBRE]

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-[13px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground sm:w-56 sm:px-3"
        aria-label="Buscar no case (Ctrl+K)"
      >
        <Search className="size-4" aria-hidden />
        <span className="hidden flex-1 truncate text-left sm:inline">Buscar no case...</span>
        <kbd className="hidden shrink-0 whitespace-nowrap rounded border border-border bg-muted px-1.5 py-px font-sans text-[10px] font-medium sm:inline">Ctrl K</kbd>
      </button>

      <DialogPrimitive.Root open={aberto} onOpenChange={setAberto}>
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="fixed left-1/2 top-[14vh] z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-popover shadow-elevada outline-none animate-surgir"
          >
            <DialogPrimitive.Title className="sr-only">Busca global</DialogPrimitive.Title>
            <Command loop>
              <CommandInput placeholder="Buscar tabela, relatório, métrica ou página..." autoFocus />
              <CommandList>
                <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
                <CommandGroup heading="Relatórios">
                  {RELATORIOS.map((r) => (
                    <CommandItem key={r.rota} value={`relatorio ${r.titulo} ${r.descricao ?? ''}`} onSelect={() => ir(r.rota)}>
                      <r.icone className="text-primary" />
                      <span className="font-medium">{r.titulo}</span>
                      <span className="truncate text-xs text-muted-foreground">{r.descricao}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandGroup heading="Páginas">
                  {paginas.map((p) => (
                    <CommandItem key={p.rota} value={`pagina ${p.titulo} ${p.descricao ?? ''}`} onSelect={() => ir(p.rota)}>
                      <p.icone className="text-primary" />
                      <span className="font-medium">{p.titulo}</span>
                      <span className="truncate text-xs text-muted-foreground">{p.descricao}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
                {jaAbriu && <ResultadosDeDados ir={ir} />}
              </CommandList>
              <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
                <span>Navegue com as setas, Enter para abrir</span>
                <span>Esc para fechar</span>
              </div>
            </Command>
          </DialogPrimitive.Content>
        </DialogPortal>
      </DialogPrimitive.Root>
    </>
  )
}

/** Carregado só depois da primeira abertura (não pesa no carregamento inicial). */
function ResultadosDeDados({ ir }: { ir: (rota: string) => void }) {
  const { dados: catalogo } = useCatalogo()
  const { dados: glossario } = useGlossario()
  return (
    <>
      {catalogo && catalogo.tabelas.length > 0 && (
        <CommandGroup heading={`Tabelas (${catalogo.tabelas.length})`}>
          {catalogo.tabelas.map((t) => (
            <CommandItem key={t.nome} value={`tabela ${t.nome} ${t.dominio} ${t.descricao}`} onSelect={() => ir(`/farol/${encodeURIComponent(t.nome)}`)}>
              <Table2 className="text-muted-foreground" />
              <span className="font-mono text-[13px]">{t.nome}</span>
              <span className="truncate text-xs text-muted-foreground">{t.dominio}</span>
              <StatusDot status={t.status} className="ml-auto" />
            </CommandItem>
          ))}
        </CommandGroup>
      )}
      {glossario && glossario.length > 0 && (
        <CommandGroup heading="Glossário">
          {glossario.map((g) => (
            <CommandItem key={g.termo} value={`termo ${g.termo} ${g.sigla ?? ''} ${g.dominio}`} onSelect={() => ir(`/glossario?termo=${encodeURIComponent(g.termo)}`)}>
              <BookOpen className="text-muted-foreground" />
              <span className="font-medium">{g.termo}</span>
              {g.sigla && <span className="text-xs text-muted-foreground">{g.sigla}</span>}
              <span className="ml-auto truncate text-xs text-muted-foreground">{g.dominio}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      )}
    </>
  )
}
