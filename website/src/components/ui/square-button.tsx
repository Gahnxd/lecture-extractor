"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { motion, type HTMLMotionProps } from "motion/react"

import { cn } from "@/lib/utils"

const squareButtonVariants = cva(
  "relative inline-flex items-center justify-center whitespace-nowrap font-medium transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 outline-none text-primary-foreground",
  {
    variants: {
      size: {
        default: "h-14 px-8 py-4 text-base",
        sm: "h-10 px-4 py-2 text-sm",
        lg: "h-16 px-10 py-5 text-lg",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

type SquareButtonProps = Omit<HTMLMotionProps<"button">, "children"> &
  VariantProps<typeof squareButtonVariants> & {
    asChild?: boolean
    icon?: React.ReactNode
    children?: React.ReactNode
    blinkRate?: number
  }

function SquareButton({
  className,
  size = "default",
  asChild = false,
  icon,
  children,
  blinkRate = 0.8,
  ...props
}: SquareButtonProps) {
  const [isHovered, setIsHovered] = React.useState(false)

  const cornerSize = size === "sm" ? 12 : size === "lg" ? 20 : 16
  const cornerThickness = 2

  const content = (
    <>
      {icon && <span className="mr-3 flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </>
  )

  if (asChild) {
    return (
      <Slot
        data-slot="square-button"
        data-size={size}
        className={cn(squareButtonVariants({ size, className }))}
      >
        {content}
      </Slot>
    )
  }

  return (
    <motion.button
      data-slot="square-button"
      data-size={size}
      className={cn(
        squareButtonVariants({ size, className }),
        "group"
      )}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileTap={{ scale: 0.98 }}
      {...props}
    >
      {/* Background with blur */}
      <motion.div
        className="absolute inset-0 rounded-[0.08rem]"
        initial={{ backgroundColor: "transparent", backdropFilter: "blur(4px)" }}
        animate={{
          backgroundColor: isHovered ? "var(--secondary)" : "transparent",
          backdropFilter: isHovered ? "blur(0px)" : "blur(4px)",
        }}
        transition={{ duration: 0.3 }}
      />

      {/* Very light border */}
      <div
        className="absolute inset-0 border border-primary-foreground/20 transition-opacity duration-300"
        style={{ opacity: isHovered ? 0 : 1 }}
      />

      {/* Corner brackets */}
      {["top-left", "top-right", "bottom-left", "bottom-right"].map((corner) => {
        const isTop = corner.includes("top")
        const isLeft = corner.includes("left")

        return (
          <motion.div
            key={corner}
            className="absolute pointer-events-none"
            style={{
              top: isTop ? 0 : "auto",
              bottom: !isTop ? 0 : "auto",
              left: isLeft ? 0 : "auto",
              right: !isLeft ? 0 : "auto",
            }}
            animate={{
              x: isHovered ? (isLeft ? -4 : 4) : 0,
              y: isHovered ? (isTop ? -4 : 4) : 0,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            {/* Horizontal line of corner */}
            <motion.div
              className="absolute bg-primary-foreground"
              style={{
                width: cornerSize,
                height: cornerThickness,
                top: isTop ? 0 : "auto",
                bottom: !isTop ? 0 : "auto",
                left: isLeft ? 0 : "auto",
                right: !isLeft ? 0 : "auto",
              }}
              animate={{
                opacity: isHovered ? [1, 0.3, 1] : 0.6,
              }}
              transition={{
                opacity: isHovered
                  ? { repeat: Infinity, duration: blinkRate, ease: "easeInOut" }
                  : { duration: 0.3 },
              }}
            />
            {/* Vertical line of corner */}
            <motion.div
              className="absolute bg-primary-foreground"
              style={{
                width: cornerThickness,
                height: cornerSize - cornerThickness,
                top: isTop ? cornerThickness : "auto",
                bottom: !isTop ? cornerThickness : "auto",
                left: isLeft ? 0 : "auto",
                right: !isLeft ? 0 : "auto",
              }}
              animate={{
                opacity: isHovered ? [1, 0.3, 1] : 0.6,
              }}
              transition={{
                opacity: isHovered
                  ? { repeat: Infinity, duration: blinkRate, ease: "easeInOut" }
                  : { duration: 0.3 },
              }}
            />
          </motion.div>
        )
      })}

      {/* Content */}
      <motion.span
        className="relative z-10"
        animate={{
          color: isHovered ? "var(--secondary-foreground)" : "var(--primary-foreground)",
        }}
        transition={{ duration: 0.3 }}
      >
        {content}
      </motion.span>
    </motion.button>
  )
}

export { SquareButton, squareButtonVariants }
