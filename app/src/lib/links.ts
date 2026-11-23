/** Links de conteúdo editável: valores "[PREENCHER...]" (ou vazios) ainda não foram definidos. */
export function linkValido(valor: string | null | undefined): valor is string {
  if (!valor) return false
  const v = valor.trim()
  return v.length > 0 && !v.startsWith('[') && /^(https?:\/\/|mailto:|\/)/i.test(v)
}
