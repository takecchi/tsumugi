import * as React from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export interface PlotEditorData {
  name?: string
  synopsis?: string
  setting?: string
  theme?: string
  structure?: string
  conflict?: string
  resolution?: string
  notes?: string
}

export interface PlotEditorProps {
  data: PlotEditorData
  onChange?: (field: keyof PlotEditorData, value: string) => void
  className?: string
  readOnly?: boolean
}

const fields: { key: keyof Omit<PlotEditorData, "name">; label: string }[] = [
  { key: "synopsis", label: "あらすじ" },
  { key: "setting", label: "舞台設定" },
  { key: "theme", label: "テーマ" },
  { key: "structure", label: "構成" },
  { key: "conflict", label: "対立・葛藤" },
  { key: "resolution", label: "結末" },
  { key: "notes", label: "メモ" },
]

export function PlotEditor({
  data,
  onChange,
  className,
  readOnly = false,
}: PlotEditorProps) {
  return (
    <div className={cn("flex h-full flex-col bg-background", className)}>
      {data.name !== undefined && (
        <div className="flex items-center border-b px-6 py-3">
          {onChange ? (
            <input
              type="text"
              value={data.name}
              onChange={(e) => onChange("name", e.target.value)}
              className="w-full bg-transparent text-lg font-semibold outline-none focus:ring-1 focus:ring-ring rounded px-1"
              placeholder="プロット名を入力..."
              readOnly={readOnly}
            />
          ) : (
            <h1 className="text-lg font-semibold">{data.name}</h1>
          )}
        </div>
      )}
      <ScrollArea className="flex-1 overflow-hidden">
        <div className="space-y-5 p-6">
          {fields.map(({ key, label }) => (
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
                  readOnly && "cursor-default"
                )}
                placeholder={`${label}を入力...`}
              />
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

