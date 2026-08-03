import { useCallback, useMemo, useState } from 'react';
import { CommitDiffView, CommitTimeline } from '@tsumugi/ui';
import {
  useCommits,
  useCreateCommit,
  useProjectDiff,
  useRestoreCommit,
} from '~/hooks/versions';
import { CommitDiffLoader } from './commit-diff-loader';
import { toDiffEntryItem, toTimelineItem } from './converters';

/** 履歴パネルで選択中の対象 */
type Selection =
  | { kind: 'uncommitted' }
  | { kind: 'commit'; commitId: string }
  | null;

interface VersionHistoryWrapperProps {
  projectId: string;
}

/**
 * プロジェクトの変更履歴タイムラインと差分ビューをつなぐラッパー。
 *
 * 「変更がない」「既にこの状態」はバックエンドが正常系として返すため、
 * エラー扱いにせず穏当な通知として表示する。
 */
export function VersionHistoryWrapper({
  projectId,
}: VersionHistoryWrapperProps) {
  const {
    data: pages,
    error: commitsError,
    isLoading,
    isValidating,
    size,
    setSize,
    mutate: mutateCommits,
  } = useCommits(projectId);
  const {
    data: projectDiff,
    error: projectDiffError,
    isValidating: isValidatingProjectDiff,
    mutate: mutateProjectDiff,
  } = useProjectDiff(projectId);
  const { trigger: createCommit, isMutating: isSaving } =
    useCreateCommit(projectId);
  const { trigger: restoreCommit, isMutating: isRestoring } =
    useRestoreCommit(projectId);

  const [selection, setSelection] = useState<Selection>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [undoBackupCommitId, setUndoBackupCommitId] = useState<string | null>(
    null,
  );

  const commits = useMemo(
    () => (pages ?? []).flatMap((page) => page.commits),
    [pages],
  );
  const timelineItems = useMemo(() => commits.map(toTimelineItem), [commits]);

  // next_cursor === null が終端（has_more は存在しない）
  const hasMore =
    pages !== undefined &&
    pages.length > 0 &&
    pages[pages.length - 1].nextCursor !== null;
  const isLoadingMore =
    isValidating && pages !== undefined && size > pages.length;
  // 初回読み込み後の再検証（再取得ボタン / フォーカス復帰）
  const isRefreshing = !isLoading && (isValidating || isValidatingProjectDiff);

  const uncommittedEntries = useMemo(
    () => (projectDiff?.entries ?? []).map(toDiffEntryItem),
    [projectDiff],
  );
  // 取得に失敗したときも行を残す。隠すと「未保存の編集が無い」と誤解させるため、
  // クリックしてエラーと再試行を見せられるようにする。
  const hasUncommittedChanges =
    uncommittedEntries.length > 0 || projectDiffError !== undefined;

  const refresh = useCallback(async () => {
    await Promise.all([mutateCommits(), mutateProjectDiff()]);
  }, [mutateCommits, mutateProjectDiff]);

  const handleSave = useCallback(
    (message: string) => {
      void (async () => {
        try {
          const result = await createCommit(message);
          if (result === undefined) return;
          if (result.status === 'no_changes') {
            setNotice('変更はありません。');
            return;
          }
          setNotice(null);
          setUndoBackupCommitId(null);
          setSelection({ kind: 'commit', commitId: result.commit.id });
          await mutateCommits();
        } catch (e: unknown) {
          console.error('[versions] createCommit failed:', e);
          setNotice('保存に失敗しました。もう一度お試しください。');
        }
      })();
    },
    [createCommit, mutateCommits],
  );

  const handleRestore = useCallback(
    (commitId: string) => {
      void (async () => {
        try {
          const result = await restoreCommit(commitId);
          if (result === undefined) return;
          if (result.status === 'already_at_commit') {
            setNotice('既にこの状態です。');
            return;
          }
          setNotice(null);
          // 復元前の状態はバックアップコミットに退避される（未コミット変更が無ければ null）
          setUndoBackupCommitId(result.result.backupCommitId);
          setSelection({
            kind: 'commit',
            commitId: result.result.restoreCommitId,
          });
          await mutateCommits();
        } catch (e: unknown) {
          console.error('[versions] restoreCommit failed:', e);
          setNotice('復元に失敗しました。もう一度お試しください。');
        }
      })();
    },
    [restoreCommit, mutateCommits],
  );

  const selectedCommit =
    selection?.kind === 'commit'
      ? commits.find((commit) => commit.id === selection.commitId)
      : undefined;

  const detail = (() => {
    if (selection === null) {
      return (
        <CommitDiffView
          entries={[]}
          emptyMessage="履歴を選ぶと、その時点の差分が表示されます。"
        />
      );
    }
    if (selection.kind === 'uncommitted') {
      return (
        <CommitDiffView
          entries={uncommittedEntries}
          title="未コミットの変更"
          subtitle="最新コミットとの差分"
          emptyMessage="未コミットの変更はありません。"
          hasError={projectDiffError !== undefined}
          onRetry={() => void mutateProjectDiff()}
        />
      );
    }
    return (
      <CommitDiffLoader
        commitId={selection.commitId}
        title={selectedCommit?.message ?? 'このコミットの差分'}
        subtitle="親コミットとの差分"
      />
    );
  })();

  return (
    <CommitTimeline
      commits={timelineItems}
      hasUncommittedChanges={hasUncommittedChanges}
      selectedCommitId={
        selection?.kind === 'commit' ? selection.commitId : null
      }
      isUncommittedSelected={selection?.kind === 'uncommitted'}
      isLoading={isLoading}
      isLoadingMore={isLoadingMore}
      isRefreshing={isRefreshing}
      hasError={commitsError !== undefined}
      hasMore={hasMore}
      isSaving={isSaving}
      isRestoring={isRestoring}
      notice={notice}
      onDismissNotice={() => setNotice(null)}
      undoBackupCommitId={undoBackupCommitId}
      onUndoRestore={handleRestore}
      onDismissUndo={() => setUndoBackupCommitId(null)}
      onSave={handleSave}
      onSelectCommit={(commitId) => setSelection({ kind: 'commit', commitId })}
      onSelectUncommitted={() => setSelection({ kind: 'uncommitted' })}
      onRestore={handleRestore}
      onLoadMore={() => void setSize(size + 1)}
      onRefresh={() => void refresh()}
      detail={detail}
    />
  );
}
