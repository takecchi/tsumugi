import { useAdapter } from '~/hooks/useAdapter';
import useSWR, { type SWRConfiguration } from 'swr';
import useSWRMutation from 'swr/mutation';
import type { Writing, TreeNode } from '@tsumugi/adapter';
import type { ContentItemKey, ContentTreeKey } from '~/hooks/keys';

type WritingTreeKey = ContentTreeKey<'writing'>;


/**
 * プロジェクト内の執筆ツリーを取得する
 * @param projectId - プロジェクトID
 */
export function useWritingTree(projectId: string) {
  const adapter = useAdapter();
  return useSWR<TreeNode[], Error, WritingTreeKey>({ type: 'writingTree', projectId }, ({ projectId }) =>
    adapter.writings.getTreeByProjectId(projectId),
  );
}

type WritingKey = ContentItemKey<'writing'>;

/**
 * 執筆をIDで取得する
 * @param id - 執筆ID
 * @param config
 */
export function useWriting(id: string, config?: SWRConfiguration<Writing | null, Error>) {
  const adapter = useAdapter();
  return useSWR<Writing | null, Error, WritingKey>(
    { type: 'writing', id },
    ({ id }) => adapter.writings.getById(id),
    config,
  );
}

type CreateWritingData = Omit<Writing, 'projectId' | 'id' | 'createdAt' | 'updatedAt'>;

/**
 * 執筆を作成する
 * @param projectId - プロジェクトID
 * @revalidates useWritingTree - 執筆ツリーを再フェッチする
 */
export function useCreateWriting(projectId: string) {
  const adapter = useAdapter();
  return useSWRMutation<Writing, Error, WritingTreeKey, CreateWritingData>(
    { type: 'writingTree', projectId },
    ({ projectId }, { arg }) => adapter.writings.create({
      projectId,
      ...arg,
    }),
  );
}

type UpdateWritingData = Partial<Omit<Writing, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>>;

/**
 * 執筆を更新する
 * @param id - 執筆ID
 * @revalidates useWriting - 執筆を再フェッチする
 */
export function useUpdateWriting(id: string) {
  const adapter = useAdapter();
  return useSWRMutation<Writing, Error, WritingKey, UpdateWritingData>(
    { type: 'writing', id },
    ({ id }, { arg }) => adapter.writings.update(id, arg),
  );
}

/**
 * 執筆を削除する
 * @param id - 執筆ID
 * @revalidates useWriting - キャッシュをnullに上書きする
 */
export function useDeleteWriting(id: string) {
  const adapter = useAdapter();
  return useSWRMutation<null, Error, WritingKey>(
    { type: 'writing', id },
    async ({ id }) => {
      await adapter.writings.delete(id);
      return null;
    },
    { populateCache: true, revalidate: false },
  );
}

/**
 * 執筆を削除する（sidebar用、triggerにIDを渡す）
 * @param projectId - プロジェクトID
 * @revalidates useWritingTree - 執筆ツリーを再フェッチする
 */
export function useDeleteWritingFromTree(projectId: string) {
  const adapter = useAdapter();
  return useSWRMutation<undefined, Error, WritingTreeKey, string>(
    { type: 'writingTree', projectId },
    async (_, { arg: id }) => {
      await adapter.writings.delete(id);
      return undefined;
    },
  );
}

interface ReorderWritingsArg {
  parentId: string | null;
  orderedIds: string[];
}

/**
 * 執筆の並び替えを更新する
 * @param projectId - プロジェクトID
 * @revalidates useWritingTree - 執筆ツリーを再フェッチする
 */
export function useReorderWritings(projectId: string) {
  const adapter = useAdapter();
  return useSWRMutation<undefined, Error, WritingTreeKey, ReorderWritingsArg>(
    { type: 'writingTree', projectId },
    async (_, { arg }) => {
      await adapter.writings.reorder(arg.parentId, arg.orderedIds);
      return undefined;
    },
  );
}

interface TotalWordCountKey {
  type: 'totalWordCount';
  projectId: string;
}

/**
 * プロジェクトの総文字数を取得する
 * @param projectId - プロジェクトID
 */
export function useTotalWordCount(projectId: string) {
  const adapter = useAdapter();
  return useSWR<number, Error, TotalWordCountKey>({ type: 'totalWordCount', projectId }, ({ projectId }) =>
    adapter.writings.getTotalWordCount(projectId),
  );
}
