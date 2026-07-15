import { AIMemoryPanel, type AIMemoryItem } from '@tsumugi/ui';
import { useAIMemories, useDeleteAIMemory } from '~/hooks/ai';
import type { AIMemory } from '@tsumugi/adapter';

function toItem(m: AIMemory): AIMemoryItem {
  return {
    id: m.id,
    content: m.content,
    createdAt: m.createdAt,
  };
}

interface AIMemoryWrapperProps {
  projectId: string;
}

/**
 * プロジェクトのAIメモリ一覧を表示・削除するラッパー。
 */
export function AIMemoryWrapper({ projectId }: AIMemoryWrapperProps) {
  const { data, isLoading, mutate } = useAIMemories(projectId);
  const { trigger: remove } = useDeleteAIMemory(projectId);

  return (
    <AIMemoryPanel
      memories={(data ?? []).map(toItem)}
      isLoading={isLoading}
      onRefresh={() => void mutate()}
      onDelete={(id: string) => {
        void remove(id);
      }}
    />
  );
}
