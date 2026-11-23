import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'

const TooltipProvider = TooltipPrimitive.Provider
const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger

function TooltipContent({ className, sideOffset = 6, ...props }: ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        collisionPadding={8}
        className={cn(
          'z-[60] max-w-xs rounded-lg bg-marinho-900 px-2.5 py-1.5 text-xs leading-relaxed text-white shadow-elevada animate-surgir dark:border dark:border-border dark:bg-popover dark:text-popover-foreground',
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  )
}

/** Atalho: <Dica texto="..."><button/></Dica> */
function Dica({ texto, children, lado = 'top' }: { texto: ReactNode; children: ReactNode; lado?: 'top' | 'right' | 'bottom' | 'left' }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={lado}>{texto}</TooltipContent>
    </Tooltip>
  )
}

export { Dica, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
