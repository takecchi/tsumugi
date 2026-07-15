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

export interface InstructionItem {
  id: string;
  title: string;
  content: string;
  enabled: boolean;
}

export interface InstructionInput {
  title: string;
  content: string;
  enabled?: boolean;
}

export interface InstructionsManagerProps {
  instructions: InstructionItem[];
  onCreate?: (input: InstructionInput) => void;
  onUpdate?: (id: string, input: InstructionInput) => void;
  onToggle?: (id: string, enabled: boolean) => void;
  onDelete?: (id: string) => void;
  isSubmitting?: boolean;
  className?: string;
}

interface FormState {
  title: string;
  content: string;
  enabled: boolean;
}

const EMPTY_FORM: FormState = {
  title: '',
  content: '',
  enabled: true,
};

/**
 * フォームの状態から送信用の入力オブジェクトを組み立てる。
 * title / content は前後空白を除去する。
 */
function buildInput(form: FormState): InstructionInput {
  return {
    title: form.title.trim(),
    content: form.content.trim(),
    enabled: form.enabled,
  };
}

export function InstructionsManager({
  instructions,
  onCreate,
  onUpdate,
  onToggle,
  onDelete,
  isSubmitting = false,
  className,
}: InstructionsManagerProps) {
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] =
    React.useState<InstructionItem | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (item: InstructionItem) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      content: item.content,
      enabled: item.enabled,
    });
    setFormOpen(true);
  };

  const handleSubmit = () => {
    const input = buildInput(form);
    if (input.title.length === 0 || input.content.length === 0) return;

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

  const submitDisabled =
    isSubmitting ||
    form.title.trim().length === 0 ||
    form.content.trim().length === 0;

  return (
    <div className={cn('flex h-full flex-col bg-background', className)}>
      <div className="flex items-center justify-between border-b px-6 py-3">
        <h1 className="text-lg font-semibold">執筆指示</h1>
        <Button size="sm" onClick={openCreate}>
          <PlusIcon className="size-4" />
          新規追加
        </Button>
      </div>

      <ScrollArea className="flex-1 overflow-hidden">
        <div className="space-y-3 p-6">
          <p className="text-xs text-muted-foreground">
            有効な指示はAIとの全チャットに常時渡されます。
          </p>
          {instructions.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              指示がまだありません。『新規追加』から登録してください。
            </p>
          ) : (
            instructions.map((item) => (
              <Card
                key={item.id}
                className={cn('gap-3 py-4', !item.enabled && 'opacity-60')}
              >
                <CardHeader className="px-4">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="flex min-w-0 items-center gap-2 text-base">
                      <span className="font-bold break-words">
                        {item.title}
                      </span>
                      <span
                        className={cn(
                          'inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-medium',
                          item.enabled
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {item.enabled ? '有効' : '無効'}
                      </span>
                    </CardTitle>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onToggle?.(item.id, !item.enabled)}
                      >
                        {item.enabled ? '無効化' : '有効化'}
                      </Button>
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
                <CardContent className="px-4">
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                    {item.content}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId === null ? '指示を追加' : '指示を編集'}
            </DialogTitle>
            <DialogDescription>
              AIに常時渡す執筆上の指示・ガイドラインを登録します。
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
              <label
                htmlFor="instruction-title"
                className="text-sm font-medium"
              >
                タイトル
              </label>
              <Input
                id="instruction-title"
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="例：文体の統一"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="instruction-content"
                className="text-sm font-medium"
              >
                指示内容
              </label>
              <Textarea
                id="instruction-content"
                value={form.content}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, content: e.target.value }))
                }
                className="min-h-32 resize-none"
                placeholder="例：常体（だ・である調）で統一し、一文を短く保つこと。"
                required
              />
            </div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                className="size-4"
                checked={form.enabled}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, enabled: e.target.checked }))
                }
              />
              この指示を有効にする
            </label>
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
            <DialogTitle>指示を削除</DialogTitle>
            <DialogDescription>
              「{deleteTarget?.title}」を削除します。この操作は取り消せません。
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
