import * as React from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { X, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

export interface MemoEditorProps {
  name?: string
  content: string
  tags?: string[]
  onNameChange?: (name: string) => void
  onContentChange?: (content: string) => void
  onTagsChange?: (tags: string[]) => void
  className?: string
  readOnly?: boolean
}

export function MemoEditor({
  name,
  content,
  tags = [],
  onNameChange,
  onContentChange,
  onTagsChange,
  className,
  readOnly = false,
}: MemoEditorProps) {
  const [tagInput, setTagInput] = React.useState("")

  const handleAddTag = () => {
    const trimmed = tagInput.trim()
    if (trimmed && !tags.includes(trimmed)) {
      onTagsChange?.([...tags, trimmed])
    }
    setTagInput("")
  }

  const handleRemoveTag = (tag: string) => {
    onTagsChange?.(tags.filter((t) => t !== tag))
  }

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddTag()
    }
  }

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
              placeholder="メモ名を入力..."
              readOnly={readOnly}
            />
          ) : (
            <h1 className="text-lg font-semibold">{name}</h1>
          )}
        </div>
      )}
      <ScrollArea className="flex-1 overflow-hidden">
        <div className="space-y-5 p-6">
          <div className="space-y-1.5">
            <label htmlFor="memo-tags" className="text-sm font-medium text-muted-foreground">
              タグ
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
                >
                  {tag}
                  {!readOnly && (
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="rounded-full p-0.5 hover:bg-secondary-foreground/10"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </span>
              ))}
              {!readOnly && (
                <div className="flex items-center gap-1">
                  <input
                    id="memo-tags"
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    className="w-24 rounded-md border bg-transparent px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
                    placeholder="タグを追加..."
                  />
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={handleAddTag}
                    disabled={!tagInput.trim()}
                  >
                    <Plus className="size-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="memo-content" className="text-sm font-medium text-muted-foreground">
              内容
            </label>
            <Textarea
              id="memo-content"
              value={content}
              onChange={(e) => onContentChange?.(e.target.value)}
              placeholder="メモの内容を入力..."
              readOnly={readOnly}
              className={cn(
                "resize-none",
                readOnly && "cursor-default"
              )}
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

