import type { AiRunEditMessage, AiRunFinishReason, AiRunStatus } from './types';

// ─── ラベル定義 ───

export const STATUS_META: Record<
  AiRunStatus,
  { label: string; className: string }
> = {
  queued: { label: '待機中', className: 'bg-muted text-muted-foreground' },
  running: { label: '実行中', className: 'bg-primary/10 text-primary' },
  paused: { label: '一時停止', className: 'bg-muted text-muted-foreground' },
  completed: { label: '終了', className: 'bg-muted text-muted-foreground' },
  stopped: { label: '停止', className: 'bg-muted text-muted-foreground' },
  error: { label: 'エラー', className: 'bg-destructive/10 text-destructive' },
};

export type FinishTone = 'success' | 'warning' | 'danger' | 'neutral';

/**
 * 終了理由ごとの文言。
 *
 * `status: 'completed'` は「成功」を意味せず、打ち切りも completed になるため、
 * ユーザーに見せる文言は必ずこの表で出し分ける。
 */
export const FINISH_REASON_META: Record<
  AiRunFinishReason,
  { label: string; description: string; tone: FinishTone }
> = {
  agent_completed: {
    label: '完了しました',
    description: 'AIが目標を達成したと判断して終了しました。',
    tone: 'success',
  },
  completed_plan: {
    label: '完了しました',
    description: '計画のすべての項目を消化して終了しました。',
    tone: 'success',
  },
  max_steps: {
    label: 'ステップ上限で打ち切りました',
    description:
      'ステップ数の上限に達したため途中で終了しています。続きを実行するには、上限を増やして再実行してください。',
    tone: 'warning',
  },
  max_tokens: {
    label: 'トークン上限で打ち切りました',
    description:
      'トークン予算の上限に達したため途中で終了しています。続きを実行するには、予算を増やして再実行してください。',
    tone: 'warning',
  },
  node_limit: {
    label: 'ノード作成上限で打ち切りました',
    description:
      '1回の実行で作成できるノード数の上限（40件）に達したため終了しています。',
    tone: 'warning',
  },
  diminishing_returns: {
    label: '進捗が出なくなり停止しました',
    description:
      'これ以上進捗が出ないと判断して停止しています。ゴールを具体的にして再実行すると改善することがあります。',
    tone: 'warning',
  },
  stopped: {
    label: '停止しました',
    description: '操作により停止しました。',
    tone: 'neutral',
  },
  error: {
    label: 'エラーで終了しました',
    description: 'エラーが発生したため終了しています。',
    tone: 'danger',
  },
  interrupted: {
    label: '中断されました',
    description:
      'サーバーの再起動などで中断されました。自動では再開しないため、必要であれば再実行してください。',
    tone: 'danger',
  },
};

export const FINISH_TONE_CLASS: Record<FinishTone, string> = {
  success:
    'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300',
  warning:
    'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  danger: 'border-destructive/30 bg-destructive/10 text-destructive',
  neutral: 'border-border bg-muted/50 text-muted-foreground',
};

export const EDIT_ACTION_LABELS: Record<AiRunEditMessage['action'], string> = {
  create: '作成',
  update: '更新',
};

export const CONTENT_TYPE_LABELS: Record<string, string> = {
  plot: 'プロット',
  character: 'キャラクター',
  memo: 'メモ',
  writing: '本文',
  project: 'プロジェクト',
};

export const DEFAULT_MAX_STEPS_RANGE = { min: 1, max: 200, default: 60 };
export const DEFAULT_MAX_TOTAL_TOKENS_RANGE = {
  min: 1000,
  max: 5_000_000,
  default: 2_000_000,
};

/** 実行が続いている（停止操作が意味を持つ）ステータス */
export function isActiveStatus(status: AiRunStatus): boolean {
  return status === 'queued' || status === 'running' || status === 'paused';
}
