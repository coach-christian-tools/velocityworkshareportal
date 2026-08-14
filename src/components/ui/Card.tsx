import { forwardRef } from "react"
import type { HTMLAttributes } from "react"
import { cn } from "../../lib/utils"
import { motion } from "framer-motion"
import type { HTMLMotionProps } from "framer-motion"

type CardProps = HTMLAttributes<HTMLDivElement> & HTMLMotionProps<"div">

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      ref={ref}
      className={cn("rounded-xl glass p-6", className)}
      {...props}
    />
  )
)
Card.displayName = "Card"
