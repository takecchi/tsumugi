import { useCallback, useEffect, useMemo, useState } from 'react';
import { CommitDiffView, type CommitEntryContentItem } from '@tsumugi/ui';
import { useCommitDiff, useCommitEntry } from '~/hooks/versions';
import {
  EMPTY_ENTRY_CONTENT,
  toDiffEntryItem,
  toEntryContentItem,
} from './converters';

type EntryContentMap = Record<string, CommitEntryContentItem | undefined>;

interface EntryContentLoaderProps {
  commitId: string;
  targetId: string;
  onLoaded: (targetId: string, content: CommitEntryContentItem) => void;
  onFailed: (targetId: string) => void;
}

/**
 * コミット時点のエントリ内容を1件ロードして親に引き上げる。
 * targetId が確定してからマウントされる（条件付きレンダリング）。
 */
function EntryContentLoader({
  commitId,
  targetId,
  onLoaded,
  onFailed,
}: EntryContentLoaderProps) {
  const { data, error } = useCommitEntry(commitId, targetId);

  useEffect(() => {
    if (data !== undefined) {
      // 404（null）は「中身が無い」ので空の内容として確定させる
      onLoaded(
        targetId,
        data === null ? EMPTY_ENTRY_CONTENT : toEntryContentItem(data),
      );
      return;
    }
    if (error !== undefined) {
      // 通信エラーは確定させない。要求を取り下げて再試行できる状態に戻す
      onFailed(targetId);
    }
  }, [data, error, targetId, onLoaded, onFailed]);

  return null;
}

interface CommitDiffLoaderProps {
  commitId: string;
  title: string;
  subtitle?: string | null;
  /** 指定するとそのエントリの差分だけを表示する（ノード単位の履歴用） */
  targetId?: string;
  emptyMessage?: string;
}

/**
 * コミットの差分を取得して表示する。
 *
 * 差分APIは `added` / `removed` の中身を返さないため、
 * ユーザーが「中身を表示」を押したときだけ `getCommitEntry` を追加で叩く。
 */
export function CommitDiffLoader({
  commitId,
  title,
  subtitle,
  targetId,
  emptyMessage,
}: CommitDiffLoaderProps) {
  const { data, error, isLoading, mutate } = useCommitDiff(commitId);
  const [requestedIds, setRequestedIds] = useState<string[]>([]);
  const [contents, setContents] = useState<EntryContentMap>({});

  // 別のコミットを選び直したら取得済みの内容は捨てる
  useEffect(() => {
    setRequestedIds([]);
    setContents({});
  }, [commitId]);

  const handleLoaded = useCallback(
    (loadedTargetId: string, content: CommitEntryContentItem) => {
      setContents((prev) => ({ ...prev, [loadedTargetId]: content }));
    },
    [],
  );

  // 取得に失敗したら要求を取り下げ、「中身を表示」ボタンを復活させる。
  // ローダーがアンマウントされるので、押し直せば SWR が再取得する。
  const handleFailed = useCallback((failedTargetId: string) => {
    setRequestedIds((prev) => prev.filter((id) => id !== failedTargetId));
  }, []);

  const entries = useMemo(() => {
    const all = data?.entries ?? [];
    const filtered =
      targetId === undefined
        ? all
        : all.filter((entry) => entry.targetId === targetId);
    return filtered.map(toDiffEntryItem);
  }, [data, targetId]);

  const loadingEntryIds = useMemo(
    () => requestedIds.filter((id) => contents[id] === undefined),
    [requestedIds, contents],
  );

  const handleShowEntryContent = useCallback((id: string) => {
    setRequestedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  return (
    <>
      {requestedIds.map((id) => (
        <EntryContentLoader
          key={id}
          commitId={commitId}
          targetId={id}
          onLoaded={handleLoaded}
          onFailed={handleFailed}
        />
      ))}
      <CommitDiffView
        entries={entries}
        title={title}
        subtitle={subtitle}
        isLoading={isLoading}
        entryContents={contents}
        loadingEntryIds={loadingEntryIds}
        onShowEntryContent={handleShowEntryContent}
        emptyMessage={emptyMessage}
        hasError={error !== undefined}
        onRetry={() => void mutate()}
      />
    </>
  );
}
