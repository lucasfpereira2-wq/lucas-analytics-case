import type { ComponentProps } from 'react'
import { DayPicker } from 'react-day-picker'
import { ptBR } from 'react-day-picker/locale'
import 'react-day-picker/style.css'
import { cn } from '@/lib/utils'

/** Calendário (react-day-picker) em PT-BR, estilizado pelos tokens em index.css (.rdp-root). */
function Calendar({ className, ...props }: ComponentProps<typeof DayPicker>) {
  return <DayPicker locale={ptBR} weekStartsOn={1} className={cn('select-none', className)} {...props} />
}

export { Calendar }
