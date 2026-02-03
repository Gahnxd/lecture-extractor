"use client"

import type { ToolUIPart } from "ai"
import {
  WrenchIcon,
} from "lucide-react"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

export type ToolProps = ComponentProps<"div">

export const Tool = ({ className, ...props }: ToolProps) => (
  <div className={cn("not-prose mb-4 w-full rounded-md border", className)} {...props} />
)

export interface ToolHeaderProps {
  title?: string
  type: ToolUIPart["type"]
  className?: string
}



export const ToolHeader = ({ className, title, type, ...props }: ToolHeaderProps) => (
  <div
    className={cn("flex w-full items-center justify-between gap-4 p-3", className)}
    {...props}
  >
    <div className="flex items-center gap-2">
      <WrenchIcon className="size-3" />
      <span className={cn("truncate", !title && "italic text-muted-foreground")}>{title ?? type.split("-").slice(1).join("-")}</span>
    </div>
  </div>
)

/** Demo component for preview */
export default function ToolDemo() {
  return (
    <div className="w-full max-w-2xl p-6">
      <Tool>
        <ToolHeader title="Weather Lookup" type="tool-invocation" />
      </Tool>
    </div>
  )
}
