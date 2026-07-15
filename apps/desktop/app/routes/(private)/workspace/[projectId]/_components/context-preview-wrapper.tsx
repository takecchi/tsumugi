import { ContextPreview } from '@tsumugi/ui';
import { useAIContext } from '~/hooks/ai';
import type { AIChatMode } from '@tsumugi/adapter';

interface ContextPreviewWrapperProps {
  projectId: string;
  mode: AIChatMode;
}

/**
 * AIに渡るコンテキスト一式（プレビュー）を表示するラッパー。
 * mode（ask/write）に応じて内容が変わる。
 */
export function ContextPreviewWrapper({
  projectId,
  mode,
}: ContextPreviewWrapperProps) {
  const { data, isLoading, mutate } = useAIContext(projectId, mode);
  return (
    <ContextPreview
      sections={data?.sections ?? []}
      totalCharCount={data?.totalCharCount ?? 0}
      isLoading={isLoading}
      onRefresh={() => void mutate()}
    />
  );
}
