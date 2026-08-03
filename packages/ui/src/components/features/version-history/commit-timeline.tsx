import * as React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  History,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  Undo2,
  X,
} from 'lucide-react';
import {
  COMMIT_MESSAGE_MAX_LENGTH,
  formatChangeCounts,
  groupByDay,
  validateCommitMessage,
  type CommitTypeValue,
} from '@/lib/version-history-utils';
import {
  CommitTypeBadge,
  formatDateHeading,
  formatTimeOfDay,
} from './version-badges';

/** タイムラインに並べるコミット */
export interface CommitTimelineItem {
  id: string;
  message: string;
  commitType: CommitTypeValue;
  /** 追加されたエントリ件数（文字数や行数ではない） */
  addedCount: number;
  /** 変更されたエントリ件数 */
  modifiedCount: number;
  /** 削除されたエントリ件数 */
  removedCount: number;
  createdAt: Date;
}

export interface CommitTimelineProps {
  commits: CommitTimelineItem[];
  /** 未コミットの作業差分があるか */
  hasUncommittedChanges?: boolean;
  /** 選択中のコミットID */
  selectedCommitId?: string | null;
  /** 未コミットの作業差分が選択されているか */
  isUncommittedSelected?: boolean;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  /** 次ページがあるか（next_cursor !== null） */
  hasMore?: boolean;
  isSaving?: boolean;
  isRestoring?: boolean;
  /** 穏当に見せる通知（例: 「変更はありません」） */
  notice?: string | null;
  onDismissNotice?: () => void;
  /** 直前の復元で作られたバックアップコミットID（「元に戻す」導線） */
  undoBackupCommitId?: string | null;
  onUndoRestore?: (backupCommitId: string) => void;
  onDismissUndo?: () => void;
  onSave?: (message: string) => void;
  onSelectCommit?: (commitId: string) => void;
  onSelectUncommitted?: () => void;
  onRestore?: (commitId: string) => void;
  onLoadMore?: () => void;
  onRefresh?: () => void;
  /** 右側に並べる差分ビュー */
  detail?: React.ReactNode;
  className?: string;
}

function SaveForm({
  isSaving,
  onSave,
}: {
  isSaving: boolean;
  onSave?: (message: string) => void;
}) {
  const [message, setMessage] = React.useState('');
  const [touched, setTouched] = React.useState(false);
  const error = validateCommitMessage(message);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (error !== null) return;
    onSave?.(message.trim());
    setMessage('');
    setTouched(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-1.5">
      <div className="flex gap-2">
        <Input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="変更内容を書いて保存（例: 第一章を書き上げた）"
          maxLength={COMMIT_MESSAGE_MAX_LENGTH}
          aria-label="コミットメッセージ"
          aria-invalid={touched && error !== null}
          disabled={isSaving}
        />
        <Button type="submit" size="sm" disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          保存
        </Button>
      </div>
      {touched && error !== null && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </form>
  );
}

function NoticeBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss?: () => void;
}) {
  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-md bg-muted px-2.5 py-2"
    >
      <p className="min-w-0 flex-1 text-xs text-muted-foreground">{message}</p>
      {onDismiss && (
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label="通知を閉じる"
          onClick={onDismiss}
        >
          <X className="size-3" />
        </Button>
      )}
    </div>
  );
}

function UndoBanner({
  backupCommitId,
  isRestoring,
  onUndoRestore,
  onDismiss,
}: {
  backupCommitId: string;
  isRestoring: boolean;
  onUndoRestore?: (backupCommitId: string) => void;
  onDismiss?: () => void;
}) {
  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-2 dark:border-amber-800 dark:bg-amber-950/40"
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-xs">
          復元しました。復元前の状態はバックアップコミットに保存されています。
        </p>
        <Button
          size="xs"
          variant="outline"
          disabled={isRestoring}
          onClick={() => onUndoRestore?.(backupCommitId)}
        >
          {isRestoring ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Undo2 className="size-3" />
          )}
          元に戻す
        </Button>
      </div>
      {onDismiss && (
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label="通知を閉じる"
          onClick={onDismiss}
        >
          <X className="size-3" />
        </Button>
      )}
    </div>
  );
}

function CommitRow({
  commit,
  isSelected,
  isRestoring,
  onSelect,
  onRequestRestore,
}: {
  commit: CommitTimelineItem;
  isSelected: boolean;
  isRestoring: boolean;
  onSelect?: () => void;
  onRequestRestore?: () => void;
}) {
  return (
    <div
      className={cn(
        'group/commit rounded-md border px-2.5 py-2 transition-colors',
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
          <CommitTypeBadge commitType={commit.commitType} />
          <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
            {formatTimeOfDay(commit.createdAt)}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-xs font-medium">
          {commit.message}
        </p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          {formatChangeCounts({
            added: commit.addedCount,
            modified: commit.modifiedCount,
            removed: commit.removedCount,
          })}
        </p>
      </button>
      <div className="mt-1 flex justify-end">
        <Button
          size="xs"
          variant="ghost"
          className="opacity-0 transition-opacity group-hover/commit:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
          disabled={isRestoring}
          onClick={onRequestRestore}
        >
          <RotateCcw className="size-3" />
          この状態に戻す
        </Button>
      </div>
    </div>
  );
}

/**
 * プロジェクトの変更履歴タイムライン。
 *
 * コミット種別（保存 / 自動保存 / バックアップ / 復元）で見た目を分け、
 * 保存ボタン・未コミット変更の表示・コミット単位の復元導線を持つ。
 * 復元は破壊的なため、必ず確認ダイアログを経由する。
 *
 * 自動保存コミットはバックエンドが勝手に増やすため、`onRefresh` で再取得できるようにしている。
 * 表示専用コンポーネント（データ取得は行わない）。
 */
export function CommitTimeline({
  commits,
  hasUncommittedChanges = false,
  selectedCommitId = null,
  isUncommittedSelected = false,
  isLoading = false,
  isLoadingMore = false,
  hasMore = false,
  isSaving = false,
  isRestoring = false,
  notice = null,
  onDismissNotice,
  undoBackupCommitId = null,
  onUndoRestore,
  onDismissUndo,
  onSave,
  onSelectCommit,
  onSelectUncommitted,
  onRestore,
  onLoadMore,
  onRefresh,
  detail,
  className,
}: CommitTimelineProps) {
  const [restoreTarget, setRestoreTarget] =
    React.useState<CommitTimelineItem | null>(null);

  const groups = React.useMemo(
    () => groupByDay(commits, (commit) => commit.createdAt),
    [commits],
  );

  const handleConfirmRestore = () => {
    if (restoreTarget === null) return;
    onRestore?.(restoreTarget.id);
    setRestoreTarget(null);
  };

  return (
    <div className={cn('flex h-full min-h-0 flex-col md:flex-row', className)}>
      {/* 狭い画面では縦積み、md 以上で左カラム固定の2カラム */}
      <div className="flex max-h-72 min-w-0 flex-col border-b md:h-full md:max-h-none md:w-72 md:shrink-0 md:border-b-0 md:border-r">
        {/* ヘッダー + 保存 */}
        <div className="shrink-0 space-y-2 border-b px-3 py-2">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              <History className="size-4" />
              変更履歴
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
          <SaveForm isSaving={isSaving} onSave={onSave} />
          {notice !== null && (
            <NoticeBanner message={notice} onDismiss={onDismissNotice} />
          )}
          {undoBackupCommitId !== null && (
            <UndoBanner
              backupCommitId={undoBackupCommitId}
              isRestoring={isRestoring}
              onUndoRestore={onUndoRestore}
              onDismiss={onDismissUndo}
            />
          )}
        </div>

        {/* タイムライン */}
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-3 p-2">
            {hasUncommittedChanges && (
              <button
                type="button"
                aria-current={isUncommittedSelected}
                className={cn(
                  'w-full rounded-md border border-dashed px-2.5 py-2 text-left transition-colors',
                  isUncommittedSelected
                    ? 'border-primary bg-accent'
                    : 'hover:bg-accent/50',
                )}
                onClick={onSelectUncommitted}
              >
                <p className="text-xs font-medium">未コミットの変更</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  まだ保存されていない編集内容
                </p>
              </button>
            )}

            {isLoading && commits.length === 0 && (
              <p className="animate-pulse py-8 text-center text-sm text-muted-foreground">
                履歴を読み込んでいます…
              </p>
            )}

            {!isLoading && commits.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                まだ履歴がありません。メッセージを付けて保存すると履歴に残ります。
              </p>
            )}

            {groups.map((group) => (
              <div key={group.key} className="space-y-1.5">
                <p className="px-0.5 text-[10px] font-medium text-muted-foreground">
                  {formatDateHeading(group.key)}
                </p>
                {group.items.map((commit) => (
                  <CommitRow
                    key={commit.id}
                    commit={commit}
                    isSelected={commit.id === selectedCommitId}
                    isRestoring={isRestoring}
                    onSelect={() => onSelectCommit?.(commit.id)}
                    onRequestRestore={() => setRestoreTarget(commit)}
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

      {/* 差分ビュー */}
      <div className="min-h-0 min-w-0 flex-1">{detail}</div>

      {/* 復元の確認（破壊的操作） */}
      <Dialog
        open={restoreTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRestoreTarget(null);
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>この状態に戻しますか？</DialogTitle>
            <DialogDescription>
              「{restoreTarget?.message}
              」の時点にプロジェクト全体を戻します。この時点に存在しないノード・執筆指示・用語は削除されます。
              復元前の状態はバックアップとして自動保存されるため、あとから元に戻せます。
              なお、AIの編集保護設定は復元の対象外で、現在の設定が維持されます。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreTarget(null)}>
              キャンセル
            </Button>
            <Button
              variant="destructive"
              disabled={isRestoring}
              onClick={handleConfirmRestore}
            >
              {isRestoring ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RotateCcw className="size-4" />
              )}
              復元する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
