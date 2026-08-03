import useSWR, { type SWRConfiguration, useSWRConfig } from 'swr';
import useSWRInfinite from 'swr/infinite';
import useSWRMutation from 'swr/mutation';
import type {
  Commit,
  CommitDiff,
  CommitEntry,
  CommitList,
  CreateCommitResult,
  Node,
  NodeRevisionList,
  RestoreCommitResult,
} from '@tsumugi/adapter';
import { useAdapter } from '~/hooks/useAdapter';

/**
 * baseCommitId を省略したい場合に使うセンチネル。
 * SWR キーには undefined を入れられないため空文字で「既定の比較元」を表す。
 */
const DEFAULT_BASE_COMMIT_ID = '';

function toBaseCommitId(baseCommitId: string): string | undefined {
  return baseCommitId === DEFAULT_BASE_COMMIT_ID ? undefined : baseCommitId;
}

interface CommitsPageKey {
  type: 'commits';
  projectId: string;
  /** 前ページの nextCursor。1ページ目は null */
  cursor: string | null;
}

/**
 * プロジェクトのコミット履歴を取得する（新しい順・カーソルページネーション）。
 *
 * `setSize(size + 1)` で次ページを読み込む。`nextCursor === null` が終端。
 * 自動保存コミットはバックエンドが勝手に増やすため、画面フォーカス時に
 * 1ページ目を再取得する SWR の既定動作をそのまま利用している。
 *
 * @param projectId - プロジェクトID
 * @param limit - 1ページあたりの件数（既定 50 / 最大 100）
 */
export function useCommits(projectId: string, limit?: number) {
  const adapter = useAdapter();
  return useSWRInfinite<CommitList, Error>(
    (_index: number, previous: CommitList | null): CommitsPageKey | null => {
      // 前ページの nextCursor が null なら終端
      if (previous !== null && previous.nextCursor === null) return null;
      return {
        type: 'commits',
        projectId,
        cursor: previous?.nextCursor ?? null,
      };
    },
    ({ projectId, cursor }: CommitsPageKey) =>
      adapter.versions.listCommits(projectId, { limit, cursor }),
  );
}

interface CommitKey {
  type: 'commit';
  commitId: string;
}

/**
 * コミットを1件取得する
 * @param commitId - コミットID
 * @param config
 */
export function useCommit(
  commitId: string,
  config?: SWRConfiguration<Commit | null, Error>,
) {
  const adapter = useAdapter();
  return useSWR<Commit | null, Error, CommitKey>(
    { type: 'commit', commitId },
    ({ commitId }) => adapter.versions.getCommit(commitId),
    config,
  );
}

interface CommitDiffKey {
  type: 'commitDiff';
  commitId: string;
  baseCommitId: string;
}

/**
 * コミットの差分を取得する
 * @param commitId - 差分を見るコミットID
 * @param baseCommitId - 比較元コミットID。空文字なら親コミットとの差分
 * @param config
 */
export function useCommitDiff(
  commitId: string,
  baseCommitId: string = DEFAULT_BASE_COMMIT_ID,
  config?: SWRConfiguration<CommitDiff, Error>,
) {
  const adapter = useAdapter();
  return useSWR<CommitDiff, Error, CommitDiffKey>(
    { type: 'commitDiff', commitId, baseCommitId },
    ({ commitId, baseCommitId }) =>
      adapter.versions.getCommitDiff(commitId, toBaseCommitId(baseCommitId)),
    config,
  );
}

interface ProjectDiffKey {
  type: 'projectDiff';
  projectId: string;
  baseCommitId: string;
}

/**
 * 未コミットの作業差分を取得する（返り値の commitId は常に null）
 * @param projectId - プロジェクトID
 * @param baseCommitId - 比較元コミットID。空文字なら最新コミットとの差分
 * @param config
 */
export function useProjectDiff(
  projectId: string,
  baseCommitId: string = DEFAULT_BASE_COMMIT_ID,
  config?: SWRConfiguration<CommitDiff, Error>,
) {
  const adapter = useAdapter();
  return useSWR<CommitDiff, Error, ProjectDiffKey>(
    { type: 'projectDiff', projectId, baseCommitId },
    ({ projectId, baseCommitId }) =>
      adapter.versions.getProjectDiff(projectId, toBaseCommitId(baseCommitId)),
    config,
  );
}

interface CommitEntryKey {
  type: 'commitEntry';
  commitId: string;
  targetId: string;
}

/**
 * コミット時点のエントリのスナップショットを取得する。
 *
 * 差分APIは `added` / `removed` の中身を返さないため、それを表示したいときに使う。
 * @param commitId - コミットID
 * @param targetId - 変更対象ID
 * @param config
 */
export function useCommitEntry(
  commitId: string,
  targetId: string,
  config?: SWRConfiguration<CommitEntry | null, Error>,
) {
  const adapter = useAdapter();
  return useSWR<CommitEntry | null, Error, CommitEntryKey>(
    { type: 'commitEntry', commitId, targetId },
    ({ commitId, targetId }) =>
      adapter.versions.getCommitEntry(commitId, targetId),
    config,
  );
}

interface NodeRevisionsPageKey {
  type: 'nodeRevisions';
  nodeId: string;
  /** 前ページの nextCursor。1ページ目は null */
  cursor: string | null;
}

/**
 * ノードの変更履歴を取得する（新しい順・カーソルページネーション）。
 *
 * `setSize(size + 1)` で次ページを読み込む。`nextCursor === null` が終端。
 * @param nodeId - ノードID
 * @param limit - 1ページあたりの件数（既定 50 / 最大 100）
 */
export function useNodeRevisions(nodeId: string, limit?: number) {
  const adapter = useAdapter();
  return useSWRInfinite<NodeRevisionList, Error>(
    (
      _index: number,
      previous: NodeRevisionList | null,
    ): NodeRevisionsPageKey | null => {
      if (previous !== null && previous.nextCursor === null) return null;
      return {
        type: 'nodeRevisions',
        nodeId,
        cursor: previous?.nextCursor ?? null,
      };
    },
    ({ nodeId, cursor }: NodeRevisionsPageKey) =>
      adapter.versions.listNodeRevisions(nodeId, { limit, cursor }),
  );
}

/**
 * 復元によって内容が書き換わる可能性のある SWR キーの種別。
 * AIセッションや使用量など、バージョン管理の対象外のキーは含めない。
 */
const RESTORE_AFFECTED_KEY_TYPES: ReadonlySet<string> = new Set([
  'project',
  'projectSettings',
  'plot',
  'plotTree',
  'character',
  'characterTree',
  'memo',
  'memoTree',
  'writing',
  'writingTree',
  'glossaryTerms',
  'instructions',
]);

function hasStringType(key: unknown): key is { type: string } {
  return (
    typeof key === 'object' &&
    key !== null &&
    'type' in key &&
    typeof key.type === 'string'
  );
}

/**
 * 復元後に再フェッチすべきキーかどうかを判定する
 */
function isRestoreAffectedKey(key: unknown): boolean {
  return hasStringType(key) && RESTORE_AFFECTED_KEY_TYPES.has(key.type);
}

/**
 * 手動コミット（保存）を作成する。
 *
 * 前回コミットから変更が無い場合は `{ status: 'no_changes' }` が返る（正常系）。
 * エラーダイアログではなく穏当なメッセージで見せること。
 * @param projectId - プロジェクトID
 * @revalidates useProjectDiff - 保存すると作業差分が空になるため再フェッチする
 */
export function useCreateCommit(projectId: string) {
  const adapter = useAdapter();
  return useSWRMutation<CreateCommitResult, Error, ProjectDiffKey, string>(
    {
      type: 'projectDiff',
      projectId,
      baseCommitId: DEFAULT_BASE_COMMIT_ID,
    },
    ({ projectId }, { arg: message }) =>
      adapter.versions.createCommit(projectId, message),
  );
}

/**
 * プロジェクト全体をコミット時点の状態に復元する（破壊的操作）。
 *
 * 呼び出し前に必ず確認ダイアログを出すこと。復元先に存在しないノード・執筆指示・用語は削除される。
 * 現在の状態が復元先と完全一致している場合は `{ status: 'already_at_commit' }` が返る（正常系）。
 * @param projectId - プロジェクトID
 * @revalidates useProjectDiff - 作業差分が変わるため再フェッチする
 * @revalidates useProject / usePlot / usePlotTree / useCharacter / useCharacterTree / useMemo / useMemoTree / useWriting / useWritingTree / useGlossaryTerms / useInstructions - 内容が書き換わるため再フェッチする
 */
export function useRestoreCommit(projectId: string) {
  const adapter = useAdapter();
  const { mutate } = useSWRConfig();
  return useSWRMutation<RestoreCommitResult, Error, ProjectDiffKey, string>(
    {
      type: 'projectDiff',
      projectId,
      baseCommitId: DEFAULT_BASE_COMMIT_ID,
    },
    async (_, { arg: commitId }) => {
      const result = await adapter.versions.restoreCommit(commitId);
      // 何も変わらなかった場合は再フェッチしない
      if (result.status === 'already_at_commit') return result;
      // 復元はプロジェクト全体を書き換えるため、影響するキーをまとめて再フェッチする
      await mutate(isRestoreAffectedKey);
      return result;
    },
  );
}

interface RestoreNodeArg {
  nodeId: string;
  commitId: string;
}

/**
 * ノードの本文をコミット時点の状態に復元する。
 *
 * 戻るのは本文のみで、名前・親・並び順・正典ステータス・AIコンテキスト設定は変わらない。
 * フォルダノードに対して呼ぶとエラーになる。
 * @param projectId - プロジェクトID
 * @revalidates useProjectDiff - 作業差分が変わるため再フェッチする
 * @revalidates usePlot / useCharacter / useMemo / useWriting - 本文が書き換わるため再フェッチする
 */
export function useRestoreNode(projectId: string) {
  const adapter = useAdapter();
  const { mutate } = useSWRConfig();
  return useSWRMutation<Node, Error, ProjectDiffKey, RestoreNodeArg>(
    {
      type: 'projectDiff',
      projectId,
      baseCommitId: DEFAULT_BASE_COMMIT_ID,
    },
    async (_, { arg }) => {
      const node = await adapter.versions.restoreNode(arg.nodeId, arg.commitId);
      await mutate(isRestoreAffectedKey);
      return node;
    },
  );
}
