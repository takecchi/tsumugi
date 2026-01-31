import { useAdapter } from '~/hooks/useAdapter';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import type { ProjectSettings } from '@tsumugi/adapter';

interface ProjectSettingKey {
  type: 'projectSettings';
  projectId: string;
}

/**
 * プロジェクト設定を取得する
 * @param projectId - プロジェクトID
 */
export function useProjectSettings(projectId: string) {
  const adapter = useAdapter();
  return useSWR<ProjectSettings, Error, ProjectSettingKey>(
    { type: 'projectSettings', projectId },
    ({ projectId }) => adapter.settings.get(projectId),
  );
}

/**
 * プロジェクト設定を更新する
 * @param projectId - プロジェクトID
 * @revalidates useProjectSettings - プロジェクト設定を再フェッチする
 */
export function useUpdateProjectSettings(projectId: string) {
  const adapter = useAdapter();
  return useSWRMutation<ProjectSettings, Error, ProjectSettingKey, Partial<ProjectSettings>>(
    { type: 'projectSettings', projectId },
    ({ projectId }, { arg }) => adapter.settings.update(projectId, arg),
  );
}
