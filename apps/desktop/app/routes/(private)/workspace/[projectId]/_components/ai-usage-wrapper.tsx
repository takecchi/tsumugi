import { AIUsage, type AIUsageSessionItem } from '@tsumugi/ui';
import { useAIUsage } from '~/hooks/ai';

interface AIUsageWrapperProps {
  projectId: string;
}

const EMPTY_TOTAL = {
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
};

/**
 * プロジェクトのAIトークン使用量を表示するラッパー。
 */
export function AIUsageWrapper({ projectId }: AIUsageWrapperProps) {
  const { data, isLoading, mutate } = useAIUsage(projectId);

  const sessions: AIUsageSessionItem[] = (data?.sessions ?? []).map((s) => ({
    sessionId: s.sessionId,
    title: s.title,
    promptTokens: s.usage.promptTokens,
    completionTokens: s.usage.completionTokens,
    totalTokens: s.usage.totalTokens,
  }));

  return (
    <AIUsage
      sessions={sessions}
      total={data?.total ?? EMPTY_TOTAL}
      isLoading={isLoading}
      onRefresh={() => void mutate()}
    />
  );
}
