import * as React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { History, Loader2, RefreshCw, RotateCcw, X } from 'lucide-react';
import type { CommitTypeValue } from '@/lib/version-history-utils';
import {
  CommitTypeBadge,
  formatTimeOfDay,
  formatDateHeading,
} from './version-badges';
import { groupByDay } from '@/lib/version-history-utils';

/** ノードを変更したコミット 1 件 */
export interface NodeRevisionItem {
  commitId: string;
  message: string;
  commitType: CommitTypeValue;
  createdAt: Date;
  changeType: 'added' | 'modified';
}

export interface NodeRevisionPanelProps {
  revisions: NodeRevisionItem[];
  /** 選択中のコミットID */
  selectedCommitId?: string | null;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  /** 次ページがあるか（next_cursor !== null） */
  hasMore?: boolean;
  isRestoring?: boolean;
  /** 穏当に見せる通知 */
  notice?: string | null;
  onDismissNotice?: () => void;
  onSelect?: (commitId: string) => void;
  onRestore?: (commitId: string) => void;
  onLoadMore?: () => void;
  onRefresh?: () => void;
  /** 右側に並べる差分ビュー */
  detail?: React.ReactNode;
  className?: string;
}

const CHANGE_TYPE_LABELS: Record<NodeRevisionItem['changeType'], string> = {
  added: '作成',
  modified: '変更',
};

function RevisionRow({
  revision,
  isSelected,
  isRestoring,
  onSelect,
  onRequestRestore,
}: {
  revision: NodeRevisionItem;
  isSelected: boolean;
  isRestoring: boolean;
  onSelect?: () => void;
  onRequestRestore?: () => void;
}) {
  return (
    <div
      className={cn(
        'group/revision rounded-md border px-2.5 py-2 transition-colors',
        isSelected ? 'border-primary bg-accent' : 'hover:bg-accent/50',
      )}
    >
      <button
        type="button"
        className="w-full text-left"
        aria-current={isSelected}
        onClick={onSelect}
      >
        <div className="flex items-center gap-2">
          <CommitTypeBadge commitType={revision.commitType} />
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {CHANGE_TYPE_LABELS[revision.changeType]}
          </span>
          <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
            {formatTimeOfDay(revision.createdAt)}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-xs font-medium">
          {revision.message}
        </p>
      </button>
      <div className="mt-1 flex justify-end">
        <Button
          size="xs"
          variant="ghost"
          className="opacity-0 transition-opacity group-hover/revision:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
          disabled={isRestoring}
          onClick={onRequestRestore}
        >
          <RotateCcw className="size-3" />
          本文を戻す
        </Button>
      </div>
    </div>
  );
}

/**
 * ノード単位の変更履歴パネル（エディタのサイドパネル用）。
 *
 * 復元は本文のみが対象で、名前・親・並び順・正典ステータス・AIコンテキスト設定は変わらない。
 * フォルダノードでは呼べないため、呼び出し側でマウントを制御すること。
 * 表示専用コンポーネント（データ取得は行わない）。
 */
export function NodeRevisionPanel({
  revisions,
  selectedCommitId = null,
  isLoading = false,
  isLoadingMore = false,
  hasMore = false,
  isRestoring = false,
  notice = null,
  onDismissNotice,
  onSelect,
  onRestore,
  onLoadMore,
  onRefresh,
  detail,
  className,
}: NodeRevisionPanelProps) {
  const [restoreTarget, setRestoreTarget] =
    React.useState<NodeRevisionItem | null>(null);

  const groups = React.useMemo(
    () => groupByDay(revisions, (revision) => revision.createdAt),
    [revisions],
  );

  const handleConfirmRestore = () => {
    if (restoreTarget === null) return;
    onRestore?.(restoreTarget.commitId);
    setRestoreTarget(null);
  };

  return (
    <div className={cn('flex h-full min-h-0 flex-col md:flex-row', className)}>
      {/* 狭い画面では縦積み、md 以上で左カラム固定の2カラム */}
      <div className="flex max-h-72 min-w-0 flex-col border-b md:h-full md:max-h-none md:w-64 md:shrink-0 md:border-b-0 md:border-r">
        <div className="shrink-0 space-y-2 border-b px-3 py-2">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              <History className="size-4" />
              このノードの履歴
            </h2>
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label="履歴を再取得"
              disabled={isLoading}
              onClick={onRefresh}
            >
              <RefreshCw
                className={cn('size-3', isLoading && 'animate-spin')}
              />
            </Button>
          </div>
          {notice !== null && (
            <div
              role="status"
              className="flex items-start gap-2 rounded-md bg-muted px-2.5 py-2"
            >
              <p className="min-w-0 flex-1 text-xs text-muted-foreground">
                {notice}
              </p>
              {onDismissNotice && (
                <Button
                  size="icon-xs"
                  variant="ghost"
                  aria-label="通知を閉じる"
                  onClick={onDismissNotice}
                >
                  <X className="size-3" />
                </Button>
              )}
            </div>
          )}
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-3 p-2">
            {isLoading && revisions.length === 0 && (
              <p className="animate-pulse py-8 text-center text-sm text-muted-foreground">
                履歴を読み込んでいます…
              </p>
            )}

            {!isLoading && revisions.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                このノードの履歴はまだありません。
              </p>
            )}

            {groups.map((group) => (
              <div key={group.key} className="space-y-1.5">
                <p className="px-0.5 text-[10px] font-medium text-muted-foreground">
                  {formatDateHeading(group.key)}
                </p>
                {group.items.map((revision) => (
                  <RevisionRow
                    key={revision.commitId}
                    revision={revision}
                    isSelected={revision.commitId === selectedCommitId}
                    isRestoring={isRestoring}
                    onSelect={() => onSelect?.(revision.commitId)}
                    onRequestRestore={() => setRestoreTarget(revision)}
                  />
                ))}
              </div>
            ))}

            {hasMore && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={isLoadingMore}
                onClick={onLoadMore}
              >
                {isLoadingMore ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : null}
                さらに読み込む
              </Button>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="min-h-0 min-w-0 flex-1">{detail}</div>

      <Dialog
        open={restoreTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRestoreTarget(null);
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>本文をこの時点に戻しますか？</DialogTitle>
            <DialogDescription>
              「{restoreTarget?.message}」の時点の本文に戻します。
              戻るのは本文だけで、名前・置き場所・並び順・正典ステータス・AIコンテキスト設定は変わりません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreTarget(null)}>
              キャンセル
            </Button>
            <Button disabled={isRestoring} onClick={handleConfirmRestore}>
              {isRestoring ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RotateCcw className="size-4" />
              )}
              本文を戻す
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
