import { useAdapter } from '~/hooks/useAdapter';
import useSWR, { type SWRConfiguration } from 'swr';
import useSWRMutation from 'swr/mutation';
import type { Project } from '@tsumugi/adapter';

interface ProjectsKey {
  type: 'projects';
}

/**
 * 全プロジェクト一覧を取得する
 */
export function useProjects() {
  const adapter = useAdapter();
  return useSWR<Project[], Error, ProjectsKey>({ type: 'projects' }, () =>
    adapter.projects.getAll(),
  );
}

interface ProjectKey {
  type: 'project';
  id: string;
}

/**
 * プロジェクトをIDで取得する
 * @param id - プロジェクトID
 * @param config
 */
export function useProject(id: string, config?: SWRConfiguration<Project | null, Error>) {
  const adapter = useAdapter();
  return useSWR<Project | null, Error, ProjectKey>(
    { type: 'project', id },
    ({ id }) => adapter.projects.getById(id),
    config,
  );
}

type CreateProjectData = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * プロジェクトを作成する
 * @revalidates useProjects - プロジェクト一覧を再フェッチする
 */
export function useCreateProject() {
  const adapter = useAdapter();
  return useSWRMutation<Project, Error, ProjectsKey, CreateProjectData>(
    { type: 'projects' },
    (_, { arg }) => adapter.projects.create(arg),
  );
}

type UpdateProjectData = Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>;

/**
 * プロジェクトを更新する
 * @param id - プロジェクトID
 * @revalidates useProject - プロジェクトを再フェッチする
 */
export function useUpdateProject(id: string) {
  const adapter = useAdapter();
  return useSWRMutation<Project, Error, ProjectKey, UpdateProjectData>(
    { type: 'project', id },
    ({ id }, { arg }) => adapter.projects.update(id, arg),
  );
}

/**
 * プロジェクトを削除する
 * @param id - プロジェクトID
 * @revalidates useProject - キャッシュをnullに上書きする
 */
export function useDeleteProject(id: string) {
  const adapter = useAdapter();
  return useSWRMutation<null, Error, ProjectKey>(
    { type: 'project', id },
    async ({ id }) => {
      await adapter.projects.delete(id);
      return null;
    },
    { populateCache: true, revalidate: false },
  );
}
