import { ArrowLeft, Compass } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function NaoEncontrada() {
  return (
    <div className="mx-auto grid min-h-[60vh] max-w-md place-items-center text-center">
      <div className="animate-entrar space-y-4">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
          <Compass className="size-6" aria-hidden />
        </span>
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Erro 404</p>
        <h1 className="text-3xl font-semibold tracking-tight">Esta página saiu da rota</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">O endereço não existe neste case. Use a busca (Ctrl+K) ou volte para a Visão Executiva.</p>
        <Button asChild>
          <Link to="/visao-executiva">
            <ArrowLeft />
            Voltar para a Visão Executiva
          </Link>
        </Button>
      </div>
    </div>
  )
}
