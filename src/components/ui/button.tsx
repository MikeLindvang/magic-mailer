import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-body font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-sage focus-visible:ring-sage/50 focus-visible:ring-[3px]",
  {
    variants: {
      variant: {
        default:
          "bg-terracotta text-parchment rounded-squircle shadow-paper hover:bg-terracotta/90 hover:shadow-paper-lg active:shadow-paper-inner active:translate-y-0.5",
        destructive:
          "bg-terracotta text-parchment rounded-squircle shadow-paper hover:bg-terracotta/90 hover:shadow-paper-lg active:shadow-paper-inner active:translate-y-0.5",
        outline:
          "border-2 border-charcoal/20 bg-parchment text-charcoal rounded-squircle shadow-paper hover:bg-charcoal/5 hover:shadow-paper-lg active:shadow-paper-inner active:translate-y-0.5",
        secondary:
          "bg-sage text-charcoal rounded-squircle shadow-paper hover:bg-sage/90 hover:shadow-paper-lg active:shadow-paper-inner active:translate-y-0.5",
        ghost:
          "text-charcoal rounded-squircle hover:bg-charcoal/5 hover:shadow-paper active:shadow-paper-inner active:translate-y-0.5",
        link: "text-terracotta underline-offset-4 hover:underline hover:text-terracotta/80",
      },
      size: {
        default: "px-6 py-3 text-sm",
        sm: "px-4 py-2 text-sm rounded-squircle-sm",
        lg: "px-8 py-4 text-base rounded-squircle-lg",
        icon: "p-3 rounded-squircle",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
