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
}

/**
 * コミット時点のエントリ内容を1件ロードして親に引き上げる。
 * targetId が確定してからマウントされる（条件付きレンダリング）。
 */
function EntryContentLoader({
  commitId,
  targetId,
  onLoaded,
}: EntryContentLoaderProps) {
  const { data, error } = useCommitEntry(commitId, targetId);

  useEffect(() => {
    // 取得できなかった場合も空の内容を返し、読み込み中のまま止めない
    if (data !== undefined) {
      onLoaded(
        targetId,
        data === null ? EMPTY_ENTRY_CONTENT : toEntryContentItem(data),
      );
    } else if (error !== undefined) {
      onLoaded(targetId, EMPTY_ENTRY_CONTENT);
    }
  }, [data, error, targetId, onLoaded]);

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
  const { data, isLoading } = useCommitDiff(commitId);
  const [requestedIds, setRequestedIds] = useState<string[]>([]);
  const [contents, setContents] = useState<EntryContentMap>({});

  // 別のコミットを選び直したら取得済みの内容は捨てる
  useEffect(() => {
    setRequestedIds([]);
    setContents({});
  }, [commitId]);

  const handleLoaded = useCallback(
    (loadedTargetId: string, content: CommitEntryContentItem) => {
      setContents((prev) =>
        prev[loadedTargetId] === content
          ? prev
          : { ...prev, [loadedTargetId]: content },
      );
    },
    [],
  );

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
      />
    </>
  );
}
