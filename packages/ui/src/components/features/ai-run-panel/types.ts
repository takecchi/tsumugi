import type { AiModelOption } from '@/components/features/ai-panel/ai-panel';

// ─── 型（packages/ui は adapter に依存しないため独自定義） ───

export type AiRunStatus =
  | 'queued'
  | 'running'
  | 'paused'
  | 'completed'
  | 'stopped'
  | 'error';

export type AiRunFinishReason =
  | 'agent_completed'
  | 'completed_plan'
  | 'max_steps'
  | 'max_tokens'
  | 'node_limit'
  | 'diminishing_returns'
  | 'stopped'
  | 'error'
  | 'interrupted';

export type AiRunPlanItemStatus = 'pending' | 'in_progress' | 'completed';

export interface AiRunPlanItem {
  /** 命令形の内容 */
  content: string;
  /** 進行形の表示（実行中の項目はこちらを表示する） */
  activeForm: string;
  status: AiRunPlanItemStatus;
}

/** transcript のテキストメッセージ */
export interface AiRunTextMessage {
  id: string;
  kind: 'text';
  role: 'user' | 'assistant';
  content: string;
}

/** AI が適用した編集（自律Runでは承認を挟まず即座に保存される） */
export interface AiRunEditMessage {
  id: string;
  kind: 'edit';
  action: 'create' | 'update';
  contentType: string;
  targetName: string;
  /**
   * 適用結果。`accepted` 以外（編集保護やコンフリクトで弾かれた場合）は
   * 「適用しました」と書かないための情報。
   */
  status: 'pending' | 'accepted' | 'rejected' | 'conflict';
}

export type AiRunMessage = AiRunTextMessage | AiRunEditMessage;

/** 表示中の Run の状態 */
export interface AiRunDetail {
  id: string;
  goal: string;
  status: AiRunStatus;
  finishReason: AiRunFinishReason | null;
  plan: AiRunPlanItem[];
  stepCount: number;
  maxSteps: number;
  totalTokens: number;
  maxTotalTokens: number | null;
  createdNodeCount: number;
  subagentCount: number;
  lastError: string | null;
}

/** Run 一覧の項目 */
export interface AiRunSummary {
  id: string;
  goal: string;
  status: AiRunStatus;
  finishReason: AiRunFinishReason | null;
  createdAt: Date;
}

/** 起動フォームの入力値 */
export interface AiRunStartInput {
  goal: string;
  model?: string;
  maxSteps: number;
  maxTotalTokens: number;
}

/** 起動に失敗したときの表示情報 */
export interface AiRunStartError {
  message: string;
  /** 進行中 Run のID（409 時）。指定すると「進行中の実行を見る」導線を出す */
  runningRunId?: string;
}

export interface AiRunPanelProps {
  /** 表示中の Run。未指定なら起動フォームを表示する */
  run?: AiRunDetail | null;
  /** Run の取得中（`run` が未確定でも起動フォームに戻さない） */
  isLoadingRun?: boolean;
  /** transcript（表示用に整形済み） */
  messages?: AiRunMessage[];
  /** ストリーミング中のテキスト（未確定のアシスタント発言） */
  streamingContent?: string | null;
  /** 過去の Run 一覧（新しい順） */
  runs?: AiRunSummary[];
  onSelectRun?: (runId: string) => void;
  /**
   * 新しい実行を作る（起動フォームに戻す）。
   * 打ち切られた Run の続きを実行しやすくするため、表示中のゴールを渡す。
   */
  onNewRun?: (prefillGoal?: string) => void;
  /** 起動フォームのゴール初期値（打ち切り後の再実行用） */
  initialGoal?: string;
  onStartRun?: (input: AiRunStartInput) => void;
  onStopRun?: () => void;
  /** 起動リクエスト中（二重送信抑止に使う） */
  isStarting?: boolean;
  /** 停止リクエスト中 */
  isStopping?: boolean;
  /** ストリーム切断からの再接続待機中 */
  isReconnecting?: boolean;
  /**
   * 購読を打ち切ったときのエラー（復旧しない）。
   * `transientError` と違い、ユーザーに再接続を促す。
   */
  fatalError?: string | null;
  /** `fatalError` からの再接続 */
  onRetryConnection?: () => void;
  /** Run の取得自体に失敗したときのメッセージ */
  loadError?: string | null;
  /**
   * リトライ中のエラー。
   * 自律Run の `error` は終端ではなく自動リトライされるため、
   * 「失敗」ではなく「リトライ中」として表示する。
   */
  transientError?: string | null;
  /** 起動時のエラー（同時実行の 409 等） */
  startError?: AiRunStartError | null;
  /** 選択可能なモデル一覧（省略・空の場合はモデル選択UIを出さない） */
  models?: AiModelOption[];
  /** ゴールの最大文字数 */
  goalMaxLength?: number;
  /** ステップ上限の入力範囲と既定値 */
  maxStepsRange?: { min: number; max: number; default: number };
  /** トークン予算の入力範囲と既定値 */
  maxTotalTokensRange?: { min: number; max: number; default: number };
  className?: string;
}
