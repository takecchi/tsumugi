import * as React from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export interface CharacterEditorData {
  name?: string
  aliases?: string
  role?: string
  gender?: string
  age?: string
  appearance?: string
  personality?: string
  background?: string
  motivation?: string
  relationships?: string
  notes?: string
}

export interface CharacterEditorProps {
  data: CharacterEditorData
  onChange?: (field: keyof CharacterEditorData, value: string) => void
  className?: string
  readOnly?: boolean
}

const shortFields: { key: keyof CharacterEditorData; label: string }[] = [
  { key: "aliases", label: "別名・あだ名" },
  { key: "role", label: "役割" },
  { key: "gender", label: "性別" },
  { key: "age", label: "年齢" },
]

const longFields: { key: keyof CharacterEditorData; label: string }[] = [
  { key: "appearance", label: "外見" },
  { key: "personality", label: "性格" },
  { key: "background", label: "経歴・背景" },
  { key: "motivation", label: "動機・目的" },
  { key: "relationships", label: "人間関係" },
  { key: "notes", label: "メモ" },
]

export function CharacterEditor({
  data,
  onChange,
  className,
  readOnly = false,
}: CharacterEditorProps) {
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
              placeholder="キャラクター名を入力..."
              readOnly={readOnly}
            />
          ) : (
            <h1 className="text-lg font-semibold">{data.name}</h1>
          )}
        </div>
      )}
      <ScrollArea className="flex-1 overflow-hidden">
        <div className="space-y-5 p-6">
          <div className="grid grid-cols-2 gap-4">
            {shortFields.map(({ key, label }) => (
              <div key={key} className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">
                  {label}
                </label>
                <input
                  type="text"
                  value={data[key] ?? ""}
                  onChange={(e) => onChange?.(key, e.target.value)}
                  readOnly={readOnly}
                  className={cn(
                    "w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none",
                    "focus:ring-1 focus:ring-ring",
                    "placeholder:text-muted-foreground",
                    readOnly && "cursor-default"
                  )}
                  placeholder={`${label}を入力...`}
                />
              </div>
            ))}
          </div>

          {longFields.map(({ key, label }) => (
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

