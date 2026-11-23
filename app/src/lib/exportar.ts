/** Exportações do lado do cliente (CSV no padrão brasileiro e download genérico). */

export interface ColunaCSV<L> {
  /** chave da linha (quando L é objeto) */
  chave?: keyof L & string
  titulo: string
  /** extrai/transforma o valor (tem precedência sobre `chave`) */
  valor?: (linha: L) => unknown
}

function celula(v: unknown): string {
  if (v === null || v === undefined) return ''
  let s: string
  if (typeof v === 'number') s = Number.isFinite(v) ? String(v).replace('.', ',') : ''
  else s = String(v)
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function baixarArquivo(nome: string, conteudo: Blob | string) {
  const url = typeof conteudo === 'string' ? conteudo : URL.createObjectURL(conteudo)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  if (typeof conteudo !== 'string') setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Gera e baixa um CSV que o Excel brasileiro abre direto: separador ";", decimal com vírgula e BOM UTF-8.
 * `colunas` aceita títulos simples (linhas como arrays) ou { chave, titulo, valor } (linhas como objetos).
 */
export function exportarCSV<L>(nomeArquivo: string, colunas: (string | ColunaCSV<L>)[], linhas: L[]) {
  const cabecalho = colunas.map((c) => celula(typeof c === 'string' ? c : c.titulo)).join(';')
  const corpo = linhas.map((l) =>
    colunas
      .map((c, i) => {
        if (Array.isArray(l)) return celula(l[i])
        if (typeof c === 'string') return celula((l as Record<string, unknown>)[c])
        return celula(c.valor ? c.valor(l) : c.chave ? l[c.chave] : '')
      })
      .join(';'),
  )
  const csv = '﻿' + [cabecalho, ...corpo].join('\r\n')
  const nome = nomeArquivo.endsWith('.csv') ? nomeArquivo : `${nomeArquivo}.csv`
  baixarArquivo(nome, new Blob([csv], { type: 'text/csv;charset=utf-8' }))
}
