import * as React from 'react';
import { RefreshCw, Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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

export interface AIMemoryItem {
  id: string;
  content: string;
  createdAt: Date;
}

export interface AIMemoryPanelProps {
  memories: AIMemoryItem[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onDelete?: (id: string) => void;
  className?: string;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * AIがセッションを横断して保持している記憶（メモリ）の一覧を表示する。
 * 表示専用コンポーネント（データ取得は行わない）。
 */
export function AIMemoryPanel({
  memories,
  isLoading = false,
  onRefresh,
  onDelete,
  className,
}: AIMemoryPanelProps) {
  const [deleteTarget, setDeleteTarget] = React.useState<AIMemoryItem | null>(
    null,
  );

  const sorted = React.useMemo(
    () =>
      [...memories].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      ),
    [memories],
  );

  const confirmDelete = () => {
    if (!deleteTarget) return;
    onDelete?.(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h2 className="text-sm font-semibold">AIメモリ</h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs"
          onClick={onRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={cn('size-3', isLoading && 'animate-spin')} />
          再取得
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
          AIが記憶した内容はまだありません
        </div>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-2 p-4">
            {sorted.map((memory) => (
              <Card key={memory.id} className="gap-2 py-3">
                <CardHeader className="px-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(memory.createdAt)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 shrink-0 px-2"
                      onClick={() => setDeleteTarget(memory)}
                    >
                      <Trash2Icon className="size-4" />
                      削除
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-4">
                  <p className="text-sm whitespace-pre-wrap">
                    {memory.content}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>メモリを削除</DialogTitle>
            <DialogDescription>
              このメモリを削除します。AIは以降このメモリを参照しなくなります。この操作は取り消せません。
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
