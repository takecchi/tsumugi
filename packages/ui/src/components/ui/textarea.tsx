import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps extends React.ComponentProps<"textarea"> {
  autoResize?: boolean
}

export function Textarea({ className, autoResize = true, ref: externalRef, ...props }: TextareaProps & { ref?: React.Ref<HTMLTextAreaElement> }) {
  const internalRef = React.useRef<HTMLTextAreaElement>(null)

  React.useImperativeHandle(externalRef, () => internalRef.current as HTMLTextAreaElement)

  const ref = internalRef

  const resize = React.useCallback(() => {
    const el = ref.current
    if (!el) return

    const viewport = el.closest(
      "[data-slot='scroll-area-viewport']"
    ) as HTMLElement | null
    const scrollTop = viewport?.scrollTop ?? 0

    el.style.height = "0"
    el.style.height = `${el.scrollHeight}px`

    if (viewport) {
      viewport.scrollTop = scrollTop
    }
  }, [])

  React.useLayoutEffect(() => {
    if (!autoResize) return

    const el = ref.current
    if (!el) return
    const viewport = el.closest(
      "[data-slot='scroll-area-viewport']"
    ) as HTMLElement | null
    const scrollTop = viewport?.scrollTop ?? 0

    resize()

    if (viewport) {
      viewport.scrollTop = scrollTop
    }
  }, [autoResize, props.value, resize])

  React.useEffect(() => {
    if (!autoResize) return
    const el = ref.current
    if (!el) return

    el.addEventListener("input", resize)
    return () => el.removeEventListener("input", resize)
  }, [autoResize, resize])

  return (
    <textarea
      ref={ref}
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        autoResize && "overflow-hidden",
        className
      )}
      {...props}
    />
  )
}

