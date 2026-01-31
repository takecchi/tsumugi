import { useAdapter } from '~/hooks/useAdapter';
import useSWR, { type SWRConfiguration } from 'swr';
import useSWRMutation from 'swr/mutation';
import type { Plot, TreeNode } from '@tsumugi/adapter';
import type { ContentItemKey, ContentTreeKey } from '~/hooks/keys';

type PlotTreeKey = ContentTreeKey<'plot'>;


/**
 * プロジェクト内のプロットツリーを取得する
 * @param projectId - プロジェクトID
 */
export function usePlotTree(projectId: string) {
  const adapter = useAdapter();
  return useSWR<TreeNode[], Error, PlotTreeKey>({ type: 'plotTree', projectId }, ({ projectId }) =>
    adapter.plots.getTreeByProjectId(projectId),
  );
}

type PlotKey = ContentItemKey<'plot'>;

/**
 * プロットをIDで取得する
 * @param id - プロットID
 * @param config
 */
export function usePlot(id: string, config?: SWRConfiguration<Plot | null, Error>) {
  const adapter = useAdapter();
  return useSWR<Plot | null, Error, PlotKey>(
    { type: 'plot', id },
    ({ id }) => adapter.plots.getById(id),
    config,
  );
}

type CreatePlotData = Omit<Plot, 'projectId' | 'id' | 'createdAt' | 'updatedAt'>;

/**
 * プロットを作成する
 * @param projectId - プロジェクトID
 * @revalidates usePlotTree - プロットツリーを再フェッチする
 */
export function useCreatePlot(projectId: string) {
  const adapter = useAdapter();
  return useSWRMutation<Plot, Error, PlotTreeKey, CreatePlotData>(
    { type: 'plotTree', projectId },
    ({ projectId }, { arg }) => adapter.plots.create({
      projectId,
      ...arg,
    }),
  );
}

type UpdatePlotData = Partial<Omit<Plot, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>>;

/**
 * プロットを更新する
 * @param id - プロットID
 * @revalidates usePlot - プロットを再フェッチする
 */
export function useUpdatePlot(id: string) {
  const adapter = useAdapter();
  return useSWRMutation<Plot, Error, PlotKey, UpdatePlotData>(
    { type: 'plot', id },
    ({ id }, { arg }) => adapter.plots.update(id, arg),
  );
}

/**
 * プロットを削除する
 * @param id - プロットID
 * @revalidates usePlot - キャッシュをnullに上書きする
 */
export function useDeletePlot(id: string) {
  const adapter = useAdapter();
  return useSWRMutation<null, Error, PlotKey>(
    { type: 'plot', id },
    async ({ id }) => {
      await adapter.plots.delete(id);
      return null;
    },
    { populateCache: true, revalidate: false },
  );
}

/**
 * プロットを削除する（sidebar用、triggerにIDを渡す）
 * @param projectId - プロジェクトID
 * @revalidates usePlotTree - プロットツリーを再フェッチする
 */
export function useDeletePlotFromTree(projectId: string) {
  const adapter = useAdapter();
  return useSWRMutation<undefined, Error, PlotTreeKey, string>(
    { type: 'plotTree', projectId },
    async (_, { arg: id }) => {
      await adapter.plots.delete(id);
      return undefined;
    },
  );
}

interface ReorderPlotsArg {
  parentId: string | null;
  orderedIds: string[];
}

/**
 * プロットの並び替えを更新する
 * @param projectId - プロジェクトID
 * @revalidates usePlotTree - プロットツリーを再フェッチする
 */
export function useReorderPlots(projectId: string) {
  const adapter = useAdapter();
  return useSWRMutation<undefined, Error, PlotTreeKey, ReorderPlotsArg>(
    { type: 'plotTree', projectId },
    async (_, { arg }) => {
      await adapter.plots.reorder(arg.parentId, arg.orderedIds);
      return undefined;
    },
  );
}
