import { useCallback, useMemo, useState } from 'react';
import { CommitDiffView, NodeRevisionPanel } from '@tsumugi/ui';
import { useNodeRevisions, useRestoreNode } from '~/hooks/versions';
import { CommitDiffLoader } from './commit-diff-loader';
import { toNodeRevisionItem } from './converters';

interface NodeRevisionWrapperProps {
  projectId: string;
  /** 履歴を表示するノードID（フォルダノードでは使えない） */
  nodeId: string;
}

/**
 * ノード単位の変更履歴パネルと差分ビューをつなぐラッパー。
 *
 * 復元は本文のみが対象で、名前・置き場所・並び順・AI属性は変わらない。
 */
export function NodeRevisionWrapper({
  projectId,
  nodeId,
}: NodeRevisionWrapperProps) {
  const {
    data: pages,
    error: revisionsError,
    isLoading,
    isValidating,
    size,
    setSize,
    mutate: mutateRevisions,
  } = useNodeRevisions(nodeId);
  const { trigger: restoreNode, isMutating: isRestoring } =
    useRestoreNode(projectId);

  const [selectedCommitId, setSelectedCommitId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const revisions = useMemo(
    () => (pages ?? []).flatMap((page) => page.revisions),
    [pages],
  );
  const revisionItems = useMemo(
    () => revisions.map(toNodeRevisionItem),
    [revisions],
  );

  // next_cursor === null が終端（has_more は存在しない）
  const hasMore =
    pages !== undefined &&
    pages.length > 0 &&
    pages[pages.length - 1].nextCursor !== null;
  const isLoadingMore =
    isValidating && pages !== undefined && size > pages.length;
  const isRefreshing = !isLoading && isValidating;

  const handleRestore = useCallback(
    (commitId: string) => {
      void (async () => {
        try {
          await restoreNode({ nodeId, commitId });
          const target = revisions.find(
            (revision) => revision.commitId === commitId,
          );
          setNotice(
            `「${target?.message ?? ''}」の時点の本文に戻しました。名前や置き場所は変わっていません。`,
          );
          // 復元による変更が履歴に載る場合に取り逃さないよう再取得する
          await mutateRevisions();
        } catch (e: unknown) {
          console.error('[versions] restoreNode failed:', e);
          setNotice('本文の復元に失敗しました。もう一度お試しください。');
        }
      })();
    },
    [restoreNode, nodeId, revisions, mutateRevisions],
  );

  const selected = revisions.find(
    (revision) => revision.commitId === selectedCommitId,
  );

  return (
    <NodeRevisionPanel
      revisions={revisionItems}
      selectedCommitId={selectedCommitId}
      isLoading={isLoading}
      isLoadingMore={isLoadingMore}
      isRefreshing={isRefreshing}
      hasError={revisionsError !== undefined}
      hasMore={hasMore}
      isRestoring={isRestoring}
      notice={notice}
      onDismissNotice={() => setNotice(null)}
      onSelect={setSelectedCommitId}
      onRestore={handleRestore}
      onLoadMore={() => void setSize(size + 1)}
      onRefresh={() => void mutateRevisions()}
      detail={
        selectedCommitId !== null ? (
          <CommitDiffLoader
            commitId={selectedCommitId}
            title={selected?.message ?? 'このコミットの差分'}
            subtitle="このノードの差分"
            targetId={nodeId}
            emptyMessage="このコミットでは、このノードの本文に差分がありません。"
          />
        ) : (
          <CommitDiffView
            entries={[]}
            emptyMessage="履歴を選ぶと、その時点の差分が表示されます。"
          />
        )
      }
    />
  );
}
