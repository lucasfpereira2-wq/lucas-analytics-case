/**
 * Formatação brasileira centralizada. Regra: nenhum componente formata número ou data "na mão".
 * Valores nulos, indefinidos ou não finitos viram "–".
 */
import type { FormatoMedida } from '@/types/cubo'
import { obterDataReferencia } from './referencia'

const VAZIO = '–'
type Num = number | null | undefined

const ok = (v: Num): v is number => typeof v === 'number' && Number.isFinite(v)

const cacheNF = new Map<string, Intl.NumberFormat>()
function nf(min: number, max: number): Intl.NumberFormat {
  const k = `${min}:${max}`
  let f = cacheNF.get(k)
  if (!f) {
    f = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: min, maximumFractionDigits: max })
    cacheNF.set(k, f)
  }
  return f
}

/** 1234567.8 → "1.234.568" (casas configuráveis). */
export function fmtNumero(v: Num, casas = 0): string {
  return ok(v) ? nf(casas, casas).format(v) : VAZIO
}

/** 1234.5 → "R$ 1.234,50". Use casas = 0 para valores grandes. */
export function fmtBRL(v: Num, casas = 2): string {
  if (!ok(v)) return VAZIO
  return `${v < 0 ? '-' : ''}R$ ${nf(casas, casas).format(Math.abs(v))}`
}

/**
 * Percentual. Por padrão recebe FRAÇÃO (0.184 → "18,4%").
 * Se o valor já está em pontos percentuais (18.4), passe { fracao: false }.
 */
export function fmtPct(v: Num, casas = 1, opcoes: { fracao?: boolean; sinal?: boolean } = {}): string {
  if (!ok(v)) return VAZIO
  const p = opcoes.fracao === false ? v : v * 100
  const s = opcoes.sinal && p > 0 ? '+' : ''
  return `${s}${nf(casas, casas).format(p)}%`
}

/** Abreviação executiva: 1.2e9 → "1,2 bi"; 38400 → "38,4 mil"; com { moeda: true } → "R$ 1,2 bi". */
export function fmtCompacto(v: Num, opcoes: { moeda?: boolean; casas?: number } = {}): string {
  if (!ok(v)) return VAZIO
  const abs = Math.abs(v)
  const casas = opcoes.casas ?? 1
  let texto: string
  if (abs >= 1e12) texto = `${nf(casas, casas).format(abs / 1e12)} tri`
  else if (abs >= 1e9) texto = `${nf(casas, casas).format(abs / 1e9)} bi`
  else if (abs >= 1e6) texto = `${nf(casas, casas).format(abs / 1e6)} mi`
  else if (abs >= 1e4) texto = `${nf(casas, casas).format(abs / 1e3)} mil`
  else texto = nf(0, abs < 100 && !Number.isInteger(abs) ? casas : 0).format(abs)
  return `${v < 0 ? '-' : ''}${opcoes.moeda ? 'R$ ' : ''}${texto}`
}

function paraDate(d: string | Date | null | undefined): Date | null {
  if (!d) return null
  if (d instanceof Date) return Number.isNaN(d.getTime()) ? null : d
  // "YYYY-MM-DD" é tratado como data local (sem deslocamento de fuso)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d)
  const dt = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(d)
  return Number.isNaN(dt.getTime()) ? null : dt
}

const FUSO = 'America/Sao_Paulo'
const fData = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
const fDataFuso = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: FUSO })
const fHora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: FUSO })
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** "2026-11-16" ou ISO → "16/11/2026". */
export function fmtData(d: string | Date | null | undefined): string {
  const dt = paraDate(d)
  if (!dt) return VAZIO
  return typeof d === 'string' && d.length > 10 ? fDataFuso.format(dt) : fData.format(dt)
}

/** ISO → "17/11/2026 08:00" (horário de Brasília). */
export function fmtDataHora(d: string | Date | null | undefined): string {
  const dt = paraDate(d)
  return dt ? `${fDataFuso.format(dt)} ${fHora.format(dt)}` : VAZIO
}

/** "2026-11" ou "2026-11-16" → "nov/26". */
export function fmtMes(d: string | null | undefined): string {
  if (!d || d.length < 7) return VAZIO
  return `${MESES[Number(d.slice(5, 7)) - 1] ?? '?'}/${d.slice(2, 4)}`
}

/** "2026-11-16" → "16/11" (rótulo curto de eixo). */
export function fmtDiaMes(d: string | null | undefined): string {
  if (!d || d.length < 10) return VAZIO
  return `${d.slice(8, 10)}/${d.slice(5, 7)}`
}

/** Segundos → "4min 12s", "1h 05min", "38s". */
export function fmtDuracao(seg: Num): string {
  if (!ok(seg)) return VAZIO
  const s = Math.max(0, Math.round(seg))
  if (s < 60) return `${s}s`
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`
  return r ? `${m}min ${String(r).padStart(2, '0')}s` : `${m}min`
}

/**
 * Tempo relativo à data de referência do portal (meta.data_referencia), não ao relógio:
 * "agora há pouco", "há 35 min", "há 2h", "há 3 dias", "há 2 meses".
 */
export function fmtRelativo(d: string | Date | null | undefined, referencia?: string | Date): string {
  const dt = paraDate(d)
  const ref = paraDate(referencia ?? obterDataReferencia())
  if (!dt || !ref) return VAZIO
  const min = Math.round((ref.getTime() - dt.getTime()) / 60000)
  if (min < 0) return fmtDataHora(dt)
  if (min < 2) return 'agora há pouco'
  if (min < 60) return `há ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `há ${h}h`
  const dias = Math.round(h / 24)
  if (dias < 31) return dias === 1 ? 'há 1 dia' : `há ${dias} dias`
  const meses = Math.round(dias / 30.44)
  if (meses < 12) return meses === 1 ? 'há 1 mês' : `há ${meses} meses`
  const anos = Math.round(meses / 12)
  return anos === 1 ? 'há 1 ano' : `há ${anos} anos`
}

/** Horas → "2h", "1 dia", "3 dias" (para "atualizado há ..."). */
export function fmtHoras(horas: Num): string {
  if (!ok(horas)) return VAZIO
  if (horas < 1) return `${Math.max(1, Math.round(horas * 60))} min`
  if (horas < 24) return `${Math.round(horas)}h`
  const d = Math.round(horas / 24)
  return d === 1 ? '1 dia' : `${d} dias`
}

/**
 * Formata pelo tipo declarado na medida do cubo (int | brl | pct | dec | seg).
 * `pct` recebe fração (0.184). Com { compacto: true } abrevia int/brl (KPIs e eixos).
 */
export function fmtMedida(v: Num, formato: FormatoMedida, opcoes: { compacto?: boolean; casas?: number } = {}): string {
  if (!ok(v)) return VAZIO
  switch (formato) {
    case 'int':
      return opcoes.compacto ? fmtCompacto(v, { casas: opcoes.casas }) : fmtNumero(v, 0)
    case 'brl':
      return opcoes.compacto ? fmtCompacto(v, { moeda: true, casas: opcoes.casas }) : fmtBRL(v, opcoes.casas ?? 2)
    case 'pct':
      return fmtPct(v, opcoes.casas ?? 1)
    case 'dec':
      return fmtNumero(v, opcoes.casas ?? 1)
    case 'seg':
      return fmtDuracao(v)
  }
}

/** Variação relativa entre dois valores: (atual − anterior) / |anterior|. null quando não há base. */
export function variacao(atual: Num, anterior: Num): number | null {
  if (!ok(atual) || !ok(anterior) || anterior === 0) return null
  return (atual - anterior) / Math.abs(anterior)
}
