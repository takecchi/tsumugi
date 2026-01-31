import { useAdapter } from '~/hooks/useAdapter';
import useSWR, { type SWRConfiguration } from 'swr';
import useSWRMutation from 'swr/mutation';
import type { Character, TreeNode } from '@tsumugi/adapter';
import type { ContentItemKey, ContentTreeKey } from '~/hooks/keys';

type CharacterTreeKey = ContentTreeKey<'character'>;


/**
 * プロジェクト内のキャラクターツリーを取得する
 * @param projectId - プロジェクトID
 */
export function useCharacterTree(projectId: string) {
  const adapter = useAdapter();
  return useSWR<TreeNode[], Error, CharacterTreeKey>(
    { type: 'characterTree', projectId },
    ({ projectId }) => adapter.characters.getTreeByProjectId(projectId),
  );
}

type CharacterKey = ContentItemKey<'character'>;

/**
 * キャラクターをIDで取得する
 * @param id - キャラクターID
 * @param config
 */
export function useCharacter(id: string, config?: SWRConfiguration<Character | null, Error>) {
  const adapter = useAdapter();
  return useSWR<Character | null, Error, CharacterKey>(
    { type: 'character', id },
    ({ id }) => adapter.characters.getById(id),
    config,
  );
}

type CreateCharacterData = Omit<
  Character,
  'projectId' | 'id' | 'createdAt' | 'updatedAt'
>;

/**
 * キャラクターを作成する
 * @param projectId - プロジェクトID
 * @revalidates useCharacterTree - キャラクターツリーを再フェッチする
 */
export function useCreateCharacter(projectId: string) {
  const adapter = useAdapter();
  return useSWRMutation<
    Character,
    Error,
    CharacterTreeKey,
    CreateCharacterData
  >({ type: 'characterTree', projectId }, ({ projectId }, { arg }) =>
    adapter.characters.create({
      projectId,
      ...arg,
    }),
  );
}

type UpdateCharacterData = Partial<
  Omit<Character, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>
>;

/**
 * キャラクターを更新する
 * @param id - キャラクターID
 * @revalidates useCharacter - キャラクターを再フェッチする
 */
export function useUpdateCharacter(id: string) {
  const adapter = useAdapter();
  return useSWRMutation<Character, Error, CharacterKey, UpdateCharacterData>(
    { type: 'character', id },
    ({ id }, { arg }) => adapter.characters.update(id, arg),
  );
}

/**
 * キャラクターを削除する
 * @param id - キャラクターID
 * @revalidates useCharacter - キャッシュをnullに上書きする
 */
export function useDeleteCharacter(id: string) {
  const adapter = useAdapter();
  return useSWRMutation<null, Error, CharacterKey>(
    { type: 'character', id },
    async ({ id }) => {
      await adapter.characters.delete(id);
      return null;
    },
    { populateCache: true, revalidate: false },
  );
}

/**
 * キャラクターを削除する（sidebar用、triggerにIDを渡す）
 * @param projectId - プロジェクトID
 * @revalidates useCharacterTree - キャラクターツリーを再フェッチする
 */
export function useDeleteCharacterFromTree(projectId: string) {
  const adapter = useAdapter();
  return useSWRMutation<undefined, Error, CharacterTreeKey, string>(
    { type: 'characterTree', projectId },
    async (_, { arg: id }) => {
      await adapter.characters.delete(id);
      return undefined;
    },
  );
}

interface ReorderCharactersArg {
  parentId: string | null;
  orderedIds: string[];
}

/**
 * キャラクターの並び替えを更新する
 * @param projectId - プロジェクトID
 * @revalidates useCharacterTree - キャラクターツリーを再フェッチする
 */
export function useReorderCharacters(projectId: string) {
  const adapter = useAdapter();
  return useSWRMutation<undefined, Error, CharacterTreeKey, ReorderCharactersArg>(
    { type: 'characterTree', projectId },
    async (_, { arg }) => {
      await adapter.characters.reorder(arg.parentId, arg.orderedIds);
      return undefined;
    },
  );
}
