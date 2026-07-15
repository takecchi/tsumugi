import type { AiModelOption } from '@tsumugi/ui';

/**
 * AIチャットで選択可能なモデル一覧。
 * value はバックエンド（API）が受け付けるモデル名と一致させること。
 */
export const AI_MODELS: AiModelOption[] = [
  { value: 'gpt-5.4', label: 'GPT-5.4' },
  { value: 'gpt-5.2', label: 'GPT-5.2' },
  { value: 'gpt-4o-mini', label: 'GPT-4o mini' },
  { value: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku' },
];
