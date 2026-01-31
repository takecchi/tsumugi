import { useAdapter } from '~/hooks/useAdapter';
import useSWR, { type SWRConfiguration } from 'swr';
import useSWRMutation from 'swr/mutation';
import type { Memo, TreeNode } from '@tsumugi/adapter';
import type { ContentItemKey, ContentTreeKey } from '~/hooks/keys';

type MemoTreeKey = ContentTreeKey<'memo'>;


/**
 * プロジェクト内のメモツリーを取得する
 * @param projectId - プロジェクトID
 */
export function useMemoTree(projectId: string) {
  const adapter = useAdapter();
  return useSWR<TreeNode[], Error, MemoTreeKey>({ type: 'memoTree', projectId }, ({ projectId }) =>
    adapter.memos.getTreeByProjectId(projectId),
  );
}

type MemoKey = ContentItemKey<'memo'>;

/**
 * メモをIDで取得する
 * @param id - メモID
 * @param config
 */
export function useMemo(id: string, config?: SWRConfiguration<Memo | null, Error>) {
  const adapter = useAdapter();
  return useSWR<Memo | null, Error, MemoKey>(
    { type: 'memo', id },
    ({ id }) => adapter.memos.getById(id),
    config,
  );
}

type CreateMemoData = Omit<Memo, 'projectId' | 'id' | 'createdAt' | 'updatedAt'>;

/**
 * メモを作成する
 * @param projectId - プロジェクトID
 * @revalidates useMemoTree - メモツリーを再フェッチする
 */
export function useCreateMemo(projectId: string) {
  const adapter = useAdapter();
  return useSWRMutation<Memo, Error, MemoTreeKey, CreateMemoData>(
    { type: 'memoTree', projectId },
    ({ projectId }, { arg }) => adapter.memos.create({
      projectId,
      ...arg,
    }),
  );
}

type UpdateMemoData = Partial<Omit<Memo, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>>;

/**
 * メモを更新する
 * @param id - メモID
 * @revalidates useMemo - メモを再フェッチする
 */
export function useUpdateMemo(id: string) {
  const adapter = useAdapter();
  return useSWRMutation<Memo, Error, MemoKey, UpdateMemoData>(
    { type: 'memo', id },
    ({ id }, { arg }) => adapter.memos.update(id, arg),
  );
}

/**
 * メモを削除する
 * @param id - メモID
 * @revalidates useMemo - キャッシュをnullに上書きする
 */
export function useDeleteMemo(id: string) {
  const adapter = useAdapter();
  return useSWRMutation<null, Error, MemoKey>(
    { type: 'memo', id },
    async ({ id }) => {
      await adapter.memos.delete(id);
      return null;
    },
    { populateCache: true, revalidate: false },
  );
}

/**
 * メモを削除する（sidebar用、triggerにIDを渡す）
 * @param projectId - プロジェクトID
 * @revalidates useMemoTree - メモツリーを再フェッチする
 */
export function useDeleteMemoFromTree(projectId: string) {
  const adapter = useAdapter();
  return useSWRMutation<undefined, Error, MemoTreeKey, string>(
    { type: 'memoTree', projectId },
    async (_, { arg: id }) => {
      await adapter.memos.delete(id);
      return undefined;
    },
  );
}

interface ReorderMemosArg {
  parentId: string | null;
  orderedIds: string[];
}

/**
 * メモの並び替えを更新する
 * @param projectId - プロジェクトID
 * @revalidates useMemoTree - メモツリーを再フェッチする
 */
export function useReorderMemos(projectId: string) {
  const adapter = useAdapter();
  return useSWRMutation<undefined, Error, MemoTreeKey, ReorderMemosArg>(
    { type: 'memoTree', projectId },
    async (_, { arg }) => {
      await adapter.memos.reorder(arg.parentId, arg.orderedIds);
      return undefined;
    },
  );
}

interface MemosByTagKey {
  type: 'memosByTag';
  projectId: string;
  tag: string;
}

/**
 * タグでメモを検索する
 * @param projectId - プロジェクトID
 * @param tag - 検索タグ
 */
export function useMemosByTag(projectId: string, tag: string) {
  const adapter = useAdapter();
  return useSWR<Memo[], Error, MemosByTagKey>({ type: 'memosByTag', projectId, tag }, ({ projectId, tag }) =>
    adapter.memos.getByTag(projectId, tag),
  );
}
