import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium tracking-tight cursor-pointer transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-foreground/30 focus-visible:ring-[2px] focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:ring-destructive/30 aria-invalid:border-destructive aria-busy:cursor-wait",
  {
    variants: {
      variant: {
        default:
          "bg-foreground text-background border border-foreground hover:bg-foreground/90",
        destructive:
          "bg-destructive text-background border border-destructive hover:bg-destructive/90 focus-visible:ring-destructive/30",
        outline:
          "border border-foreground/25 bg-transparent text-foreground hover:border-foreground/60 hover:bg-foreground/[0.04]",
        secondary:
          "bg-secondary text-secondary-foreground border border-foreground/15 hover:bg-secondary/70",
        accent:
          "bg-primary text-primary-foreground border border-primary hover:bg-primary/85",
        ghost:
          "text-foreground hover:bg-foreground/[0.06]",
        link: "text-foreground underline-offset-[5px] decoration-foreground/40 hover:underline hover:decoration-foreground",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5 text-[13px]",
        lg: "h-10 px-6 has-[>svg]:px-4",
        icon: "size-9",
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
  loading = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    loading?: boolean
  }) {
  const Comp = asChild ? Slot : "button"
  const isDisabled = disabled || loading

  const content = asChild ? (
    children
  ) : (
    <>
      {loading && <Loader2 className="animate-spin" aria-hidden />}
      {children}
    </>
  )

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      aria-disabled={isDisabled || undefined}
      {...props}
    >
      {content}
    </Comp>
  )
}

export { Button, buttonVariants }
