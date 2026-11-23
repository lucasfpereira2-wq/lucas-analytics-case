/** Tema claro/escuro: persistido em localStorage; no primeiro acesso respeita prefers-color-scheme. */
import { create } from 'zustand'

export type Tema = 'claro' | 'escuro'
const CHAVE = 'lucas-case:tema'

function temaInicial(): Tema {
  try {
    const salvo = localStorage.getItem(CHAVE)
    if (salvo === 'claro' || salvo === 'escuro') return salvo
  } catch {
    /* armazenamento indisponível */
  }
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro'
}

function aplicar(tema: Tema) {
  const el = document.documentElement
  el.classList.toggle('dark', tema === 'escuro')
  el.dataset.theme = tema === 'escuro' ? 'dark' : 'light'
}

interface EstadoTema {
  tema: Tema
  definir: (t: Tema) => void
  alternar: () => void
}

export const useTema = create<EstadoTema>((set, get) => ({
  tema: temaInicial(),
  definir: (tema) => {
    aplicar(tema)
    try {
      localStorage.setItem(CHAVE, tema)
    } catch {
      /* ignora */
    }
    set({ tema })
  },
  alternar: () => get().definir(get().tema === 'escuro' ? 'claro' : 'escuro'),
}))

aplicar(useTema.getState().tema)
