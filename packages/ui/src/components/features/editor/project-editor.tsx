import * as React from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface ProjectEditorData {
  name: string
  synopsis: string
  theme: string
  goal: string
  targetWordCount: string
  targetAudience: string
}

export interface ProjectEditorProps {
  data: ProjectEditorData
  onChange?: (field: keyof ProjectEditorData, value: string) => void
  className?: string
  readOnly?: boolean
}

const textareaFields: { key: keyof Omit<ProjectEditorData, "name" | "targetWordCount">; label: string; placeholder: string; minHeight?: string }[] = [
  { key: "synopsis", label: "あらすじ", placeholder: "あらすじを入力...", minHeight: "min-h-[200px]" },
  { key: "theme", label: "テーマ", placeholder: "この作品のテーマを入力..." },
  { key: "goal", label: "終着点", placeholder: "この作品の終着点・ゴールを入力..." },
  { key: "targetAudience", label: "ターゲット層", placeholder: "想定する読者層を入力..." },
]

export function ProjectEditor({
  data,
  onChange,
  className,
  readOnly = false,
}: ProjectEditorProps) {
  return (
    <div className={cn("flex h-full flex-col bg-background", className)}>
      <div className="flex items-center border-b px-6 py-3">
        {onChange ? (
          <input
            type="text"
            value={data.name}
            onChange={(e) => onChange("name", e.target.value)}
            className="w-full bg-transparent text-lg font-semibold outline-none focus:ring-1 focus:ring-ring rounded px-1"
            placeholder="作品タイトルを入力..."
            readOnly={readOnly}
          />
        ) : (
          <h1 className="text-lg font-semibold">{data.name}</h1>
        )}
      </div>
      <ScrollArea className="flex-1 overflow-hidden">
        <div className="space-y-5 p-6">
          {textareaFields.map(({ key, label, placeholder, minHeight }) => (
            <div key={key} className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                {label}
              </label>
              <Textarea
                value={data[key] ?? ""}
                onChange={(e) => onChange?.(key, e.target.value)}
                readOnly={readOnly}
                className={cn(
                  "resize-none",
                  minHeight,
                  readOnly && "cursor-default"
                )}
                placeholder={placeholder}
              />
            </div>
          ))}
          <div className="space-y-1.5">
            <label htmlFor="targetWordCount" className="text-sm font-medium text-muted-foreground">
              執筆予定文字数
            </label>
            <Input
              id="targetWordCount"
              type="number"
              value={data.targetWordCount}
              onChange={(e) => onChange?.("targetWordCount", e.target.value)}
              readOnly={readOnly}
              className={cn(readOnly && "cursor-default")}
              placeholder="例: 100000"
              min={0}
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

