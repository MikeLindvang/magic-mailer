import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "tactile-input w-full",
        "file:text-charcoal placeholder:text-charcoal/60 selection:bg-terracotta selection:text-parchment",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-body file:font-medium",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
