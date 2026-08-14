import { ButtonHTMLAttributes, forwardRef } from "react"
import { cn } from "../../lib/utils"
import { motion } from "framer-motion"

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger"
  size?: "sm" | "md" | "lg"
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-primary-600 text-white hover:bg-primary-500": variant === "primary",
            "bg-secondary-900 text-white hover:bg-black": variant === "secondary",
            "border border-[var(--glass-border)] bg-transparent hover:bg-black/5 dark:hover:bg-white/5": variant === "outline",
            "hover:bg-black/5 dark:hover:bg-white/5": variant === "ghost",
            "bg-red-500 text-white hover:bg-red-600": variant === "danger",
            "h-8 px-3 text-sm": size === "sm",
            "h-10 px-4 py-2": size === "md",
            "h-12 px-8 text-lg": size === "lg",
          },
          className
        )}
        {...(props as any)}
      />
    )
  }
)
Button.displayName = "Button"
