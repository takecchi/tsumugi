import { useAdapter } from '~/hooks/useAdapter';
import useSWRMutation from 'swr/mutation';
import type { ExportResult } from '@tsumugi/adapter';

interface ExportKey {
  type: 'export';
}

/**
 * プロジェクトをエクスポートする
 */
export function useExportProject() {
  const adapter = useAdapter();
  return useSWRMutation<ExportResult, Error, ExportKey, string>(
    { type: 'export' },
    (_, { arg: projectId }) => adapter.export.exportProject(projectId),
  );
}
