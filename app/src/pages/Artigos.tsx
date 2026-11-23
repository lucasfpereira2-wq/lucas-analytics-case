import { ArrowUpRight, Clock, Newspaper } from 'lucide-react'
import { useState } from 'react'
import { Pagina } from '@/components/layout/Pagina'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import artigosJson from '@/content/artigos.json'
import { linkValido } from '@/lib/links'

interface Artigo {
  id: string
  titulo: string
  resumo: string
  minutos: number
  tag: string
  link: string
  secoes: { subtitulo: string; paragrafos: string[] }[]
}

const artigos = artigosJson as Artigo[]

export default function Artigos() {
  const [aberto, setAberto] = useState<Artigo | null>(null)

  return (
    <Pagina
      titulo="Artigos & publicações"
      subtitulo="O que aprendi em 12 anos entre pipelines, indicadores e salas de diretoria, escrito para quem decide com dados."
      icone={Newspaper}
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {artigos.map((a, i) => {
          const externo = linkValido(a.link)
          const conteudo = (
            <>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="rounded-full bg-accent px-2.5 py-1 font-semibold text-accent-foreground">{a.tag}</span>
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="size-3.5" aria-hidden />
                  {a.minutos} min de leitura
                </span>
              </div>
              <h2 className="mt-5 text-[17px] font-semibold leading-snug tracking-tight text-balance">{a.titulo}</h2>
              <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{a.resumo}</p>
              <span className="mt-auto inline-flex items-center gap-1 pt-6 text-[13px] font-semibold text-primary">
                {externo ? 'Ler publicação' : 'Ler artigo'}
                <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
              </span>
            </>
          )
          const classe =
            'group relative flex min-h-64 flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 text-left shadow-card transition-[box-shadow,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevada animate-entrar'
          const estilo = { animationDelay: `${i * 60}ms` }
          const numero = (
            <span className="pointer-events-none absolute -right-2 -top-6 select-none text-[96px] font-semibold leading-none tracking-tighter text-foreground/[0.04]" aria-hidden>
              {String(i + 1).padStart(2, '0')}
            </span>
          )
          return externo ? (
            <a key={a.id} href={a.link} target="_blank" rel="noreferrer" className={classe} style={estilo}>
              {numero}
              {conteudo}
            </a>
          ) : (
            <button key={a.id} type="button" onClick={() => setAberto(a)} className={classe} style={estilo}>
              {numero}
              {conteudo}
            </button>
          )
        })}
      </div>

      <Dialog open={!!aberto} onOpenChange={(v) => !v && setAberto(null)}>
        <DialogContent className="max-w-2xl">
          {aberto && (
            <>
              <DialogHeader className="border-b border-border pb-5">
                <div className="flex items-center gap-3 text-xs">
                  <span className="rounded-full bg-accent px-2.5 py-1 font-semibold text-accent-foreground">{aberto.tag}</span>
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="size-3.5" aria-hidden />
                    {aberto.minutos} min de leitura · Lucas Pereira
                  </span>
                </div>
                <DialogTitle className="pt-2 text-[22px] leading-tight text-balance">{aberto.titulo}</DialogTitle>
                <DialogDescription className="text-[15px] leading-relaxed">{aberto.resumo}</DialogDescription>
              </DialogHeader>
              <article className="scroll-fino min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
                {aberto.secoes.map((s) => (
                  <section key={s.subtitulo}>
                    <h3 className="text-[15px] font-semibold tracking-tight">{s.subtitulo}</h3>
                    {s.paragrafos.map((p, j) => (
                      <p key={j} className="mt-2.5 text-[14.5px] leading-[1.75] text-foreground/85">
                        {p}
                      </p>
                    ))}
                  </section>
                ))}
              </article>
              <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-3.5">
                <span className="text-xs text-muted-foreground">Publicação externa: link a definir</span>
                <Button variant="outline" size="sm" onClick={() => setAberto(null)}>
                  Fechar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Pagina>
  )
}
