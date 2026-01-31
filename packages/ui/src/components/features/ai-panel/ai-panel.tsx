import * as React from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Send, PenLine, MessageCircle, Plus, Search, ChevronDown, Check, XCircle } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { isIMEActive } from "@/lib/keyboard-utils"
import { Markdown } from "@/components/ui/markdown"

export type AiMode = "write" | "ask"

interface LineEdit {
  startLine: number
  endLine: number
  newText: string
}

type FieldChange =
  | { type: "replace"; value: unknown }
  | { type: "line_edits"; edits: LineEdit[] }

export interface Proposal {
  id: string
  action: "create" | "update"
  contentType: string
  targetName: string
  original?: Record<string, unknown>
  proposed: Record<string, FieldChange>
  status: "pending" | "accepted" | "rejected" | "conflict"
}

interface TextMessage {
  id: string
  role: "user" | "assistant"
  content: string
}

interface ProposalMessage {
  id: string
  role: "assistant"
  proposal: Proposal
}

export type Message = TextMessage | ProposalMessage

export interface Conversation {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
}

// --- AiPanel (シェル) ---

export interface AiPanelProps {
  conversations?: Conversation[]
  currentConversationId?: string
  onNewConversation?: () => void
  onSelectConversation?: (conversationId: string) => void
  children?: React.ReactNode
  className?: string
}

function ConversationSelector({
  conversations,
  currentConversationId,
  onSelectConversation,
}: {
  conversations?: Conversation[]
  currentConversationId?: string
  onSelectConversation?: (conversationId: string) => void
}) {
  const [searchQuery, setSearchQuery] = React.useState("")
  
  const currentConversation = conversations?.find(c => c.id === currentConversationId)
  
  const filteredConversations = conversations?.filter(conv => 
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="flex-1 w-0 min-w-0 justify-start h-7">
          <span className="truncate">{currentConversation ? currentConversation.title : "新しいチャット"}</span>
          <ChevronDown className="size-4 ml-1 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="会話を検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="border-t">
          <ScrollArea className="h-64">
            <div className="p-2 space-y-1">
              {filteredConversations?.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">
                  <p className="text-sm">会話が見つかりません</p>
                </div>
              ) : (
                filteredConversations?.map((conversation) => (
                  <Button
                    key={conversation.id}
                    variant={conversation.id === currentConversationId ? "secondary" : "ghost"}
                    className="w-full justify-start text-left h-auto p-2"
                    onClick={() => onSelectConversation?.(conversation.id)}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-sm truncate">{conversation.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {conversation.updatedAt.toLocaleDateString()}
                      </span>
                    </div>
                  </Button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function AiPanel({
  conversations = [],
  currentConversationId,
  onNewConversation,
  onSelectConversation,
  children,
  className,
}: AiPanelProps) {
  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between border-b px-3 py-1.5">
        <ConversationSelector
          conversations={conversations}
          currentConversationId={currentConversationId}
          onSelectConversation={onSelectConversation}
        />
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={onNewConversation}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </div>

      {/* children（コンテンツ + 入力欄） */}
      <div className="flex flex-1 flex-col min-h-0">
        {children}
      </div>
    </div>
  )
}

// --- AiPanelContent (メッセージ表示 or 空状態) ---

export interface AiPanelContentProps {
  messages?: Message[]
  description?: string
  onAcceptProposal?: (proposalId: string) => void
  onRejectProposal?: (proposalId: string) => void
  isLoading?: boolean
}

const CONTENT_TYPE_LABELS: Record<string, string> = {
  plot: "プロット",
  character: "キャラクター",
  memo: "メモ",
  writing: "執筆",
}

const FIELD_LABELS: Record<string, string> = {
  name: "名前",
  content: "内容",
  synopsis: "あらすじ",
  setting: "舞台設定",
  theme: "テーマ",
  structure: "構成",
  conflict: "対立・葛藤",
  resolution: "結末",
  notes: "備考",
  aliases: "別名",
  role: "役職",
  gender: "性別",
  age: "年齢",
  appearance: "外見",
  personality: "性格",
  background: "経歴",
  motivation: "動機",
  relationships: "人間関係",
  tags: "タグ",
}

function ProposalDiff({
  proposal,
  onAccept,
  onReject,
  isLoading = false,
}: {
  proposal: Proposal
  onAccept?: () => void
  onReject?: () => void
  isLoading?: boolean
}) {
  const typeLabel = CONTENT_TYPE_LABELS[proposal.contentType] ?? proposal.contentType
  const actionLabel = proposal.action === "create" ? "作成" : "変更"
  const status = proposal.status

  const statusBadge = {
    accepted: { label: "承認済み", className: "text-green-600" },
    rejected: { label: "拒否済み", className: "text-muted-foreground" },
    conflict: { label: "コンフリクト", className: "text-destructive" },
    pending: null,
  }[status]

  const fields = Object.keys(proposal.proposed).filter((k) => k !== "parentId")

  return (
    <div className="rounded-md border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium">
          [{typeLabel}] {proposal.targetName} の{actionLabel}提案
        </p>
        {statusBadge && (
          <span className={cn("text-xs font-medium", statusBadge.className)}>
            {statusBadge.label}
          </span>
        )}
      </div>

      {fields.map((field) => {
        const label = FIELD_LABELS[field] ?? field
        const change = proposal.proposed[field]

        if (change.type === "line_edits") {
          return (
            <div key={field} className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">{label}（行編集）</p>
              {change.edits.map((edit, i) => (
                <div key={i} className="rounded border p-2 space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {edit.startLine > edit.endLine
                      ? `${edit.startLine}行目の前に挿入`
                      : edit.newText === ""
                        ? `${edit.startLine}–${edit.endLine}行を削除`
                        : `${edit.startLine}–${edit.endLine}行を置換`}
                  </p>
                  {edit.startLine <= edit.endLine && proposal.original && (
                    <div className="text-sm whitespace-pre-wrap bg-destructive/10 rounded p-1.5 line-through text-muted-foreground">
                      {Array.from({ length: edit.endLine - edit.startLine + 1 }, (_, j) => {
                        const lineKey = `line_${edit.startLine + j}`
                        return String(proposal.original?.[lineKey] ?? "")
                      }).join("\n") || "（空）"}
                    </div>
                  )}
                  {edit.newText !== "" && (
                    <div className="text-sm whitespace-pre-wrap bg-green-500/10 rounded p-1.5">
                      {edit.newText}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        }

        // replace
        const proposedVal = String(change.value ?? "")
        const originalVal = proposal.original ? String(proposal.original[field] ?? "") : undefined

        return (
          <div key={field} className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
            {proposal.action === "update" && originalVal !== undefined && originalVal !== proposedVal && (
              <div className="text-sm whitespace-pre-wrap bg-destructive/10 rounded p-2 line-through text-muted-foreground">
                {originalVal || "（空）"}
              </div>
            )}
            <div className="text-sm whitespace-pre-wrap bg-green-500/10 rounded p-2">
              {proposedVal || "（空）"}
            </div>
          </div>
        )
      })}

      {status === "pending" && (
        <div className="flex gap-2">
          <Button size="sm" onClick={onAccept} disabled={isLoading}>
            <Check className="size-3 mr-1" />
            {isLoading ? "処理中..." : "承認"}
          </Button>
          <Button size="sm" variant="outline" onClick={onReject} disabled={isLoading}>
            <XCircle className="size-3 mr-1" />
            {isLoading ? "処理中..." : "拒否"}
          </Button>
        </div>
      )}
    </div>
  )
}

function MessageBubble({
  message,
  onAcceptProposal,
  onRejectProposal,
  isLoading = false,
}: {
  message: Message
  onAcceptProposal?: (proposalId: string) => void
  onRejectProposal?: (proposalId: string) => void
  isLoading?: boolean
}) {
  if ("proposal" in message) {
    return (
      <div className="w-full">
        <ProposalDiff
          proposal={message.proposal}
          onAccept={() => onAcceptProposal?.(message.proposal.id)}
          onReject={() => onRejectProposal?.(message.proposal.id)}
          isLoading={isLoading}
        />
      </div>
    )
  }

  const isUser = message.role === "user"

  return (
    <div
      className={cn(
        "w-full",
        isUser
          ? "rounded-lg border px-3 py-1.5"
          : ""
      )}
    >
      {isUser ? (
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      ) : (
        <Markdown className="text-sm">{message.content}</Markdown>
      )}
    </div>
  )
}

/**
 * 最下部にいるときだけ自動スクロールするフック
 */
function useAutoScroll(deps: React.DependencyList) {
  const viewportRef = React.useRef<HTMLDivElement>(null)
  const isAtBottomRef = React.useRef(true)

  const THRESHOLD = 30

  const handleScroll = React.useCallback(() => {
    const el = viewportRef.current
    if (!el) return
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight <= THRESHOLD
  }, [])

  React.useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    el.addEventListener("scroll", handleScroll, { passive: true })
    return () => el.removeEventListener("scroll", handleScroll)
  }, [handleScroll])

  React.useEffect(() => {
    const el = viewportRef.current
    if (el && isAtBottomRef.current) {
      el.scrollTop = el.scrollHeight
    }
  }, deps)

  const scrollToBottom = React.useCallback(() => {
    const el = viewportRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
      isAtBottomRef.current = true
    }
  }, [])

  return { viewportRef, scrollToBottom }
}

export function AiPanelContent({
  messages = [],
  description,
  onAcceptProposal,
  onRejectProposal,
  isLoading = false,
}: AiPanelContentProps) {
  const { viewportRef, scrollToBottom } = useAutoScroll([messages, isLoading])

  // 送信時（メッセージ数が増えたとき）は強制スクロール
  const prevMessageCountRef = React.useRef(messages.length)
  React.useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      scrollToBottom()
    }
    prevMessageCountRef.current = messages.length
  }, [messages.length, scrollToBottom])

  return (
    <ScrollArea className="flex-1 min-h-0" viewportRef={viewportRef}>
      <div className="space-y-4 p-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-lg font-medium mb-2">始めましょう</p>
            {description && <p className="text-sm whitespace-pre-wrap">{description}</p>}
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onAcceptProposal={onAcceptProposal}
              onRejectProposal={onRejectProposal}
              isLoading={isLoading}
            />
          ))
        )}
        {isLoading && (
          <p className="text-sm text-muted-foreground animate-pulse">
            考えています...
          </p>
        )}
      </div>
    </ScrollArea>
  )
}

// --- AiPanelInput (入力欄 + モード切替) ---

export interface AiPanelInputProps {
  mode: AiMode
  onModeChange?: (mode: AiMode) => void
  onSend?: (message: string) => void
  isLoading?: boolean
}

function ModeToggleFooter({
  mode,
  onModeChange,
}: {
  mode: AiMode
  onModeChange?: (mode: AiMode) => void
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs font-medium"
        >
          {mode === "write" ? (
            <>
              <PenLine className="size-3 mr-1" />
              Write
              <ChevronDown className="size-3 ml-1" />
            </>
          ) : (
            <>
              <MessageCircle className="size-3 mr-1" />
              Ask
              <ChevronDown className="size-3 ml-1" />
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-32 p-1" align="start">
        <div className="space-y-1">
          <Button
            variant={mode === "write" ? "secondary" : "ghost"}
            size="sm"
            className="w-full justify-start h-7 text-xs"
            onClick={() => onModeChange?.("write")}
          >
            <PenLine className="size-3 mr-1" />
            Write
          </Button>
          <Button
            variant={mode === "ask" ? "secondary" : "ghost"}
            size="sm"
            className="w-full justify-start h-7 text-xs"
            onClick={() => onModeChange?.("ask")}
          >
            <MessageCircle className="size-3 mr-1" />
            Ask
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function AiPanelInput({
  mode,
  onModeChange,
  onSend,
  isLoading = false,
}: AiPanelInputProps) {
  const [input, setInput] = React.useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isLoading) {
      onSend?.(input.trim())
      setInput("")
    }
  }

  return (
    <div className="p-2">
      <div className="rounded-lg border bg-background">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            mode === "write"
              ? "どのような文章を書きますか？"
              : "質問を入力..."
          }
          className="resize-none border-0 rounded-t-lg rounded-b-none focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[80px]"
          rows={3}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !isIMEActive(e)) {
              e.preventDefault()
              handleSubmit(e)
            }
          }}
        />
        <div className="flex items-center justify-between px-2 py-1.5 border-t">
          <ModeToggleFooter mode={mode} onModeChange={onModeChange} />
          <Button
            type="submit"
            size="icon"
            className="h-7 w-7"
            disabled={!input.trim() || isLoading}
            onClick={handleSubmit}
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

