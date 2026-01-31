import * as React from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { applyAutoIndentOnEnter, normalizeIndent, DEFAULT_NO_INDENT_MARKERS } from "@/lib/writing-utils"
import { isIMEActive } from "@/lib/keyboard-utils"

export interface WritingEditorProps {
  name?: string
  content: string
  wordCount?: number
  onNameChange?: (name: string) => void
  onContentChange?: (content: string) => void
  className?: string
  readOnly?: boolean
  autoIndent?: boolean
  noIndentMarkers?: readonly string[]
}

export function WritingEditor({
  name,
  content,
  wordCount,
  onNameChange,
  onContentChange,
  className,
  readOnly = false,
  autoIndent = true,
  noIndentMarkers = DEFAULT_NO_INDENT_MARKERS,
}: WritingEditorProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const composingRef = React.useRef(false)
  const savedScrollTopRef = React.useRef(0)

  const saveScrollTop = React.useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    const viewport = textarea.closest("[data-slot='scroll-area-viewport']") as HTMLElement | null
    savedScrollTopRef.current = viewport?.scrollTop ?? 0
  }, [])

  const restoreScrollTop = React.useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    const viewport = textarea.closest("[data-slot='scroll-area-viewport']") as HTMLElement | null
    if (viewport) viewport.scrollTop = savedScrollTopRef.current
  }, [])

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!autoIndent || readOnly) return
      if (e.key !== 'Enter' || isIMEActive(e)) return

      const el = e.currentTarget
      const result = applyAutoIndentOnEnter(
        el.value,
        el.selectionStart,
        el.selectionEnd,
        noIndentMarkers,
      )
      if (!result) return

      e.preventDefault()
      saveScrollTop()
      onContentChange?.(result.text)
      requestAnimationFrame(() => {
        const textarea = textareaRef.current
        if (textarea) {
          textarea.selectionStart = result.cursorPosition
          textarea.selectionEnd = result.cursorPosition
        }
        restoreScrollTop()
      })
    },
    [autoIndent, noIndentMarkers, readOnly, onContentChange],
  )

  return (
    <div className={cn("flex h-full flex-col bg-background", className)}>
      {name !== undefined && (
        <div className="flex items-center border-b px-6 py-3">
          {onNameChange ? (
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className="w-full bg-transparent text-lg font-semibold outline-none focus:ring-1 focus:ring-ring rounded px-1"
              placeholder="タイトルを入力..."
              readOnly={readOnly}
            />
          ) : (
            <h1 className="text-lg font-semibold">{name}</h1>
          )}
        </div>
      )}
      <ScrollArea className="flex-1 overflow-hidden">
        <div className="p-6">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              const el = e.target
              if (!autoIndent || readOnly || composingRef.current) {
                onContentChange?.(el.value)
                return
              }
              const result = normalizeIndent(el.value, el.selectionStart, noIndentMarkers)
              if (result.text !== el.value) saveScrollTop()
              onContentChange?.(result.text)
              if (result.text !== el.value) {
                requestAnimationFrame(() => {
                  const textarea = textareaRef.current
                  if (textarea) {
                    textarea.selectionStart = result.cursorPosition
                    textarea.selectionEnd = result.cursorPosition
                  }
                  restoreScrollTop()
                })
              }
            }}
            onCompositionStart={() => { composingRef.current = true }}
            onCompositionEnd={(e) => {
              composingRef.current = false
              if (!autoIndent || readOnly) return
              const el = e.currentTarget
              const result = normalizeIndent(el.value, el.selectionStart, noIndentMarkers)
              if (result.text !== el.value) saveScrollTop()
              onContentChange?.(result.text)
              if (result.text !== el.value) {
                requestAnimationFrame(() => {
                  const textarea = textareaRef.current
                  if (textarea) {
                    textarea.selectionStart = result.cursorPosition
                    textarea.selectionEnd = result.cursorPosition
                  }
                  restoreScrollTop()
                })
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="ここに文章を入力..."
            readOnly={readOnly}
            className={cn(
              "resize-none border-none bg-transparent text-base leading-relaxed shadow-none outline-none focus-visible:ring-0",
              readOnly && "cursor-default"
            )}
          />
        </div>
      </ScrollArea>
      {wordCount !== undefined && (
        <div className="border-t px-6 py-2 text-xs text-muted-foreground">
          {wordCount.toLocaleString()} 文字
        </div>
      )}
    </div>
  )
}

