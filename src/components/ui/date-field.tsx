"use client"

import * as React from "react"
import { format, isValid } from "date-fns"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

export interface DateFieldProps
  extends Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> {
  value?: Date | null
  onChange: (date: Date | undefined) => void
}

/**
 * Seletor de data baseado no <input type="date"> nativo.
 * Funciona de forma confiável em todos os navegadores (incluindo Safari/iOS),
 * mesmo dentro de Dialogs/Popovers do Radix, onde calendários customizados
 * podem falhar ao receber cliques.
 */
const DateField = React.forwardRef<HTMLInputElement, DateFieldProps>(
  ({ value, onChange, className, ...props }, ref) => {
    const stringValue = value && isValid(value) ? format(value, "yyyy-MM-dd") : ""

    return (
      <Input
        ref={ref}
        type="date"
        value={stringValue}
        onChange={(e) => {
          const raw = e.target.value
          if (!raw) {
            onChange(undefined)
            return
          }
          const [y, m, d] = raw.split("-").map(Number)
          if (!y || !m || !d) return
          // Data local ao meio-dia evita problemas de fuso horário.
          const date = new Date(y, m - 1, d, 12, 0, 0, 0)
          if (isValid(date)) onChange(date)
        }}
        className={cn("w-full min-w-0 appearance-none text-left", className)}
        {...props}
      />
    )
  }
)
DateField.displayName = "DateField"

export { DateField }
