import * as React from 'react';
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface GlossaryTermItem {
  id: string;
  term: string;
  reading: string | null;
  aliases: string[];
  notes: string | null;
}

export interface GlossaryTermInput {
  term: string;
  reading?: string;
  aliases?: string[];
  notes?: string;
}

export interface GlossaryManagerProps {
  terms: GlossaryTermItem[];
  onCreate?: (input: GlossaryTermInput) => void;
  onUpdate?: (id: string, input: GlossaryTermInput) => void;
  onDelete?: (id: string) => void;
  isSubmitting?: boolean;
  className?: string;
}

interface FormState {
  term: string;
  reading: string;
  aliases: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  term: '',
  reading: '',
  aliases: '',
  notes: '',
};

/**
 * 別表記の入力文字列を配列に変換する。
 * カンマ（半角・全角）と改行で区切り、前後の空白を除去して空要素を捨てる。
 */
function parseAliases(raw: string): string[] {
  return raw
    .split(/[,、\n]/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

/**
 * フォームの状態から送信用の入力オブジェクトを組み立てる。
 * 空の任意フィールドは省略する（空文字を送らない）。
 */
function buildInput(form: FormState): GlossaryTermInput {
  const input: GlossaryTermInput = { term: form.term.trim() };

  const reading = form.reading.trim();
  if (reading.length > 0) {
    input.reading = reading;
  }

  const aliases = parseAliases(form.aliases);
  if (aliases.length > 0) {
    input.aliases = aliases;
  }

  const notes = form.notes.trim();
  if (notes.length > 0) {
    input.notes = notes;
  }

  return input;
}

export function GlossaryManager({
  terms,
  onCreate,
  onUpdate,
  onDelete,
  isSubmitting = false,
  className,
}: GlossaryManagerProps) {
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] =
    React.useState<GlossaryTermItem | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (item: GlossaryTermItem) => {
    setEditingId(item.id);
    setForm({
      term: item.term,
      reading: item.reading ?? '',
      aliases: item.aliases.join(', '),
      notes: item.notes ?? '',
    });
    setFormOpen(true);
  };

  const handleSubmit = () => {
    const input = buildInput(form);
    if (input.term.length === 0) return;

    if (editingId === null) {
      onCreate?.(input);
    } else {
      onUpdate?.(editingId, input);
    }
    setFormOpen(false);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    onDelete?.(deleteTarget.id);
    setDeleteTarget(null);
  };

  const submitDisabled = isSubmitting || form.term.trim().length === 0;

  return (
    <div className={cn('flex h-full flex-col bg-background', className)}>
      <div className="flex items-center justify-between border-b px-6 py-3">
        <h1 className="text-lg font-semibold">用語集</h1>
        <Button size="sm" onClick={openCreate}>
          <PlusIcon className="size-4" />
          新規追加
        </Button>
      </div>

      <ScrollArea className="flex-1 overflow-hidden">
        <div className="space-y-3 p-6">
          {terms.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              用語がまだありません。『新規追加』から登録してください。
            </p>
          ) : (
            terms.map((item) => {
              const hasBody = item.aliases.length > 0 || item.notes != null;
              return (
                <Card key={item.id} className="gap-3 py-4">
                  <CardHeader className="px-4">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="min-w-0 text-base">
                        <span className="font-bold break-words">
                          {item.term}
                        </span>
                        {item.reading && (
                          <span className="ml-1 text-sm font-normal text-muted-foreground">
                            （{item.reading}）
                          </span>
                        )}
                      </CardTitle>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(item)}
                        >
                          <PencilIcon className="size-4" />
                          編集
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(item)}
                        >
                          <Trash2Icon className="size-4" />
                          削除
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {hasBody && (
                    <CardContent className="space-y-3 px-4">
                      {item.aliases.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-muted-foreground">
                            別表記
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {item.aliases.map((alias) => (
                              <span
                                key={alias}
                                className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                              >
                                {alias}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {item.notes && (
                        <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                          {item.notes}
                        </p>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId === null ? '用語を追加' : '用語を編集'}
            </DialogTitle>
            <DialogDescription>
              表記ゆれチェックの精度を高めるための用語を登録します。
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            <div className="space-y-1.5">
              <label htmlFor="glossary-term" className="text-sm font-medium">
                正規表記
              </label>
              <Input
                id="glossary-term"
                value={form.term}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, term: e.target.value }))
                }
                placeholder="例：紬"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="glossary-reading" className="text-sm font-medium">
                読み
              </label>
              <Input
                id="glossary-reading"
                value={form.reading}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, reading: e.target.value }))
                }
                placeholder="例：つむぎ"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="glossary-aliases" className="text-sm font-medium">
                別表記（カンマ区切り）
              </label>
              <Input
                id="glossary-aliases"
                value={form.aliases}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, aliases: e.target.value }))
                }
                placeholder="例：つむぎ, ツムギ"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="glossary-notes" className="text-sm font-medium">
                備考
              </label>
              <Textarea
                id="glossary-notes"
                value={form.notes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                className="resize-none"
                placeholder="用語の説明や使い分けのメモ"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={submitDisabled}>
                保存
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>用語を削除</DialogTitle>
            <DialogDescription>
              「{deleteTarget?.term}」を削除します。この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              キャンセル
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete}>
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
