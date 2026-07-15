import { useAdapter } from '~/hooks/useAdapter';
import useSWR, { type SWRConfiguration } from 'swr';
import useSWRMutation from 'swr/mutation';
import type {
  CreateGlossaryTermData,
  GlossaryTerm,
  UpdateGlossaryTermData,
} from '@tsumugi/adapter';

interface GlossaryTermsKey {
  type: 'glossaryTerms';
  projectId: string;
}

/**
 * プロジェクトの用語集一覧を取得する
 * @param projectId - プロジェクトID
 * @param config
 */
export function useGlossaryTerms(
  projectId: string,
  config?: SWRConfiguration<GlossaryTerm[], Error>,
) {
  const adapter = useAdapter();
  return useSWR<GlossaryTerm[], Error, GlossaryTermsKey>(
    { type: 'glossaryTerms', projectId },
    ({ projectId }) => adapter.glossary.list(projectId),
    config,
  );
}

/**
 * 用語集項目を作成する
 * @param projectId - プロジェクトID
 * @revalidates useGlossaryTerms - 用語集一覧を再フェッチする
 */
export function useCreateGlossaryTerm(projectId: string) {
  const adapter = useAdapter();
  return useSWRMutation<
    GlossaryTerm,
    Error,
    GlossaryTermsKey,
    CreateGlossaryTermData
  >({ type: 'glossaryTerms', projectId }, ({ projectId }, { arg }) =>
    adapter.glossary.create(projectId, arg),
  );
}

interface UpdateGlossaryTermArg {
  termId: string;
  data: UpdateGlossaryTermData;
}

/**
 * 用語集項目を更新する
 * @param projectId - プロジェクトID
 * @revalidates useGlossaryTerms - 用語集一覧を再フェッチする
 */
export function useUpdateGlossaryTerm(projectId: string) {
  const adapter = useAdapter();
  return useSWRMutation<
    GlossaryTerm,
    Error,
    GlossaryTermsKey,
    UpdateGlossaryTermArg
  >({ type: 'glossaryTerms', projectId }, (_, { arg }) =>
    adapter.glossary.update(arg.termId, arg.data),
  );
}

/**
 * 用語集項目を削除する
 * @param projectId - プロジェクトID
 * @revalidates useGlossaryTerms - 用語集一覧を再フェッチする
 */
export function useDeleteGlossaryTerm(projectId: string) {
  const adapter = useAdapter();
  return useSWRMutation<undefined, Error, GlossaryTermsKey, string>(
    { type: 'glossaryTerms', projectId },
    async (_, { arg: termId }) => {
      await adapter.glossary.delete(termId);
      return undefined;
    },
  );
}
