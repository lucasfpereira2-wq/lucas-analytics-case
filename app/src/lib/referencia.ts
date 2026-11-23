/**
 * Datas de referência do portal (docs/contratos.md). O "agora" do Hub é fixo e vem de meta.json;
 * estas constantes são apenas o fallback enquanto o meta não carrega (ou não existe).
 */
export const DATA_REFERENCIA_PADRAO = '2026-11-17T08:00:00-03:00'
export const INICIO_HISTORICO_PADRAO = '2024-12-01'
export const FIM_HISTORICO_PADRAO = '2026-11-16'

let dataReferencia = DATA_REFERENCIA_PADRAO

/** Chamado por dados.ts quando o meta.json carrega. */
export function definirDataReferencia(iso: string) {
  if (iso) dataReferencia = iso
}
/** "Agora" do portal (ISO com fuso). Nunca use new Date() para cálculos de negócio. */
export function obterDataReferencia(): string {
  return dataReferencia
}
