import { useAdapter } from '~/hooks/useAdapter';
import useSWRMutation from 'swr/mutation';

interface ExportKey {
  type: 'export';
}

/**
 * プロジェクトをエクスポートする（保存ダイアログを含む）
 */
export function useExportProject() {
  const adapter = useAdapter();
  return useSWRMutation<undefined, Error, ExportKey, string>(
    { type: 'export' },
    async (_, { arg: projectId }) => {
      await adapter.export.exportProject(projectId);
      return undefined;
    },
  );
}
