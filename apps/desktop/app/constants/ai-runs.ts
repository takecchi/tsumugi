import type { AiModelOption } from '@tsumugi/ui';

/**
 * 自律Run の入力値の制約と既定値。
 * バックエンド（CreateAIRunRequest）のバリデーションと一致させること。
 */

/**
 * 自律Run で選択できるモデル一覧。
 *
 * 対話チャットの `AI_MODELS` とは意図的に分けている。`CreateAIRunRequest.model` の
 * enum に無い値を送ると adapter が黙って落としてバックエンド既定になるため、
 * チャット側にモデルが追加されたときに Run が勝手に既定へ降格しないようにする。
 */
export const AI_RUN_MODELS: AiModelOption[] = [
  { value: 'gpt-5.4', label: 'GPT-5.4' },
  { value: 'gpt-5.2', label: 'GPT-5.2' },
  { value: 'gpt-4o-mini', label: 'GPT-4o mini' },
  { value: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku' },
];

/** ゴールの最大文字数 */
export const AI_RUN_GOAL_MAX_LENGTH = 4000;

/** Run 全体の step 総上限 */
export const AI_RUN_MAX_STEPS = {
  min: 1,
  max: 200,
  /** 未指定時にバックエンドが使う既定値 */
  default: 60,
} as const;

/**
 * トークン予算。
 * **出力だけでなく入力を含む合計**であることに注意（毎バッチでコンテキスト全文を再送する）。
 */
export const AI_RUN_MAX_TOTAL_TOKENS = {
  min: 1000,
  max: 5_000_000,
  /** 未指定時にバックエンドが使う既定値 */
  default: 2_000_000,
} as const;

/**
 * 実行中の Run の状態をポーリングする間隔（ミリ秒）。
 *
 * 進捗（step / トークンの累積）は AIRun から読む必要があるが、バッチ境界を知らせる
 * チャンク（`start`）が Run では流れないため、実行中はポーリングで追う。
 */
export const AI_RUN_POLL_INTERVAL_MS = 3000;
