import type {
  Project,
  ProjectSettings,
  Node,
  TreeNode,
  Plot,
  Character,
  Memo,
  Writing,
  CanonStatus,
  ContextPolicy,
  EditPolicy,
  AIChatMessageRequest,
  AIChatMode,
  AIChatRequest,
  AIChatSession,
  AIMessage,
  AIProposalResult,
  AIStreamChunk,
  AIMemory,
  AIProjectUsage,
  AIContextPack,
  AIRun,
  AIRunStreamChunk,
  CreateAIRunData,
  CreateAIRunResult,
  ConsistencyCheck,
  ConsistencyCheckSummary,
  ConsistencyFinding,
  ConsistencyStreamChunk,
  FindingStatus,
  GlossaryTerm,
  CreateGlossaryTermData,
  UpdateGlossaryTermData,
  Instruction,
  CreateInstructionData,
  UpdateInstructionData,
  AuthState,
  GoogleAuthUrl,
} from './types';

/**
 * アダプター設定
 */
export interface AdapterConfig {
  /**
   * Web APIアダプター設定
   */
  api?: ApiAdapterConfig;
}

/**
 * Web APIアダプター設定
 */
export interface ApiAdapterConfig {
  /**
   * APIエンドポイント
   */
  baseUrl: string;
}

/**
 * 作成時に除外するフィールド
 * canonStatus / contextPolicy / editPolicy はバックエンドが払い出す AI 属性のため作成データには含めない。
 */
type CreateOmit =
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'canonStatus'
  | 'contextPolicy'
  | 'editPolicy';

/**
 * 更新時に除外するフィールド
 * canonStatus / contextPolicy / editPolicy は `nodes.updateAttributes()` で個別に更新する。
 */
type UpdateOmit =
  | 'id'
  | 'projectId'
  | 'createdAt'
  | 'updatedAt'
  | 'canonStatus'
  | 'contextPolicy'
  | 'editPolicy';

/**
 * ノードアダプター共通の操作
 */
interface NodeAdapterBase<T extends Node> {
  getByProjectId(projectId: string): Promise<T[]>;
  getTreeByProjectId(projectId: string): Promise<TreeNode[]>;
  getById(id: string): Promise<T | null>;
  create(data: Omit<T, CreateOmit>): Promise<T>;
  update(id: string, data: Partial<Omit<T, UpdateOmit>>): Promise<T>;
  delete(id: string): Promise<void>;
  move(id: string, newParentId: string | null, newOrder: number): Promise<T>;
  reorder(parentId: string | null, ids: string[]): Promise<void>;
}

/**
 * プロジェクト操作のインターフェース
 */
export interface ProjectAdapter {
  getAll(): Promise<Project[]>;
  getById(id: string): Promise<Project | null>;
  create(data: Omit<Project, CreateOmit>): Promise<Project>;
  update(
    id: string,
    data: Partial<Omit<Project, CreateOmit>>,
  ): Promise<Project>;
  delete(id: string): Promise<void>;
}

/**
 * プロット操作のインターフェース
 */
export type PlotAdapter = NodeAdapterBase<Plot>;

/**
 * キャラクター操作のインターフェース
 */
export type CharacterAdapter = NodeAdapterBase<Character>;

/**
 * メモ操作のインターフェース
 */
export type MemoAdapter = NodeAdapterBase<Memo>;

/**
 * 執筆操作のインターフェース
 */
export type WritingAdapter = NodeAdapterBase<Writing>;

/**
 * AI操作のインターフェース
 */
export interface AIAdapter {
  /**
   * チャット（ストリーミング）
   * ReadableStream<AIStreamChunk> を返す
   */
  chat(
    sessionId: string,
    request: AIChatRequest,
  ): Promise<ReadableStream<AIStreamChunk>>;

  /**
   * チャットセッション一覧取得
   */
  getSessions(projectId: string): Promise<AIChatSession[]>;

  /**
   * チャットセッション取得
   */
  getSession(sessionId: string): Promise<AIChatSession | null>;

  /**
   * セッションのメッセージ一覧取得
   */
  getMessages(sessionId: string): Promise<AIMessage[]>;

  /**
   * チャットセッション作成（初回メッセージ送信）
   */
  createSession(
    projectId: string,
    request: AIChatMessageRequest,
  ): Promise<{ session: AIChatSession; stream: ReadableStream<AIStreamChunk> }>;

  /**
   * 提案を承認（コンフリクト検出 + データ更新 + ステータス更新）
   * 全提案が処理済みになった場合、自動的に AI へフィードバックを送信しその応答ストリームを含む result.stream を返す。
   */
  acceptProposal(
    sessionId: string,
    toolCallId: string,
  ): Promise<AIProposalResult>;

  /**
   * 提案を拒否（ステータス更新のみ）
   * 全提案が処理済みになった場合、自動的に AI へフィードバックを送信しその応答ストリームを含む result.stream を返す。
   */
  rejectProposal(
    sessionId: string,
    toolCallId: string,
  ): Promise<AIProposalResult>;

  /**
   * チャットセッション削除
   */
  deleteSession(sessionId: string): Promise<void>;

  /**
   * AIメモリ一覧取得
   */
  getMemories(projectId: string): Promise<AIMemory[]>;

  /**
   * AIメモリ削除
   */
  deleteMemory(projectId: string, memoryId: string): Promise<void>;

  /**
   * プロジェクトのトークン使用量を取得
   */
  getUsage(projectId: string): Promise<AIProjectUsage>;

  /**
   * AIに渡るコンテキスト一式（プレビュー）を取得
   * @param projectId - プロジェクトID
   * @param mode - チャットモード（ask/write でコンテキストが変わる）
   */
  getContext(projectId: string, mode: AIChatMode): Promise<AIContextPack>;
}

/**
 * 自律Run 購読時のオプション
 */
export interface AIRunSubscribeOptions {
  /**
   * 終端に達する前に切断された場合の再接続試行回数の上限。
   * 既定は adapter 実装依存。
   */
  maxReconnectAttempts?: number;
  /**
   * 再接続までの待機時間（ミリ秒）の列。
   * n 回目の再接続では `reconnectDelaysMs[n - 1]`（範囲外なら末尾の値）を待つ。
   */
  reconnectDelaysMs?: number[];
}

/**
 * 自律エージェント Run 操作のインターフェース
 *
 * 対話チャット（{@link AIAdapter}）とは別系統。AI が自分で計画を立てて
 * 複数ステップを自動実行する。
 */
export interface AIRunAdapter {
  /**
   * 自律Run を作成して起動する。
   *
   * 1プロジェクトにつき同時に走れる Run は1本だけ。既に進行中の Run がある場合は
   * throw せず `{ status: 'conflict' }` を返すので、必ず `status` で分岐して
   * 進行中 Run への導線を出すこと。
   */
  create(projectId: string, data: CreateAIRunData): Promise<CreateAIRunResult>;

  /**
   * プロジェクトの自律Run 一覧を取得する（新しい順）
   */
  list(projectId: string): Promise<AIRun[]>;

  /**
   * 自律Run の現在の状態を取得する。
   * 進捗（step / トークン）の累積値はここから読む。
   */
  get(runId: string): Promise<AIRun>;

  /**
   * Run の transcript（メッセージ一覧）を取得する。
   *
   * SSE は過去チャンクをリプレイしないため、これが表示内容の正となる。
   * 到着順に依存せず、提案とツール呼び出しの正しい順序はこの結果の順序に従う。
   * バッチ境界（`usage` チャンク）や再接続のたびに取り直すとよい。
   */
  getMessages(runId: string): Promise<AIMessage[]>;

  /**
   * 自律Run を停止する（冪等）。
   *
   * 停止は現在のバッチ終了後に確定するため、**戻り値の `status` はまだ
   * `running` のことがある。** これをそのまま「停止済み」として UI に反映しないこと。
   * 確定は購読ストリームの `run_status`（`finishReason: 'stopped'`）で検知する。
   */
  stop(runId: string): Promise<AIRun>;

  /**
   * 自律Run を購読する。
   *
   * 実行中・終了済みのどちらでも購読できる（途中参加可）。返すストリームは
   * 切断時の再接続まで面倒をみるため、受け取り側は届いたチャンクを
   * 反映するだけでよい。
   *
   * - 購読開始時と再接続時に `transcript` チャンクが流れる。
   *   SSE は過去チャンクをリプレイしないため、これでメッセージ状態を**置き換える**
   * - 終端は `run_status` かつ `finishReason` が付いたチャンク。
   *   ストリームはその後クローズされる
   * - `error` チャンクは終端ではない（バックエンドが最大2回リトライする）
   */
  subscribe(
    runId: string,
    options?: AIRunSubscribeOptions,
  ): ReadableStream<AIRunStreamChunk>;
}

/**
 * ノードのAI属性
 * 未指定（undefined）のフィールドは「変更しない」を意味する。
 */
export interface NodeAttributes {
  /** 正典ステータス（確定/検討中） */
  canonStatus?: CanonStatus;
  /** AIコンテキストへの露出ポリシー */
  contextPolicy?: ContextPolicy;
  /** AIによる編集の保護ポリシー */
  editPolicy?: EditPolicy;
}

/**
 * ノード共通操作のインターフェース（型に依存しないノード横断の操作）
 */
export interface NodeAdapter {
  /**
   * ノードのAI属性（canonStatus / contextPolicy / editPolicy）を更新する
   */
  updateAttributes(nodeId: string, attributes: NodeAttributes): Promise<Node>;
}

/**
 * 矛盾チェック操作のインターフェース
 */
export interface ConsistencyAdapter {
  /**
   * 矛盾チェックを実行する（ストリーミング）。
   * finding が逐次流れる ReadableStream を返す。実行中の再実行はエラー（409）。
   */
  run(writingId: string): Promise<ReadableStream<ConsistencyStreamChunk>>;

  /**
   * 執筆ノードの矛盾チェック履歴（一覧、finding 件数のみ）を取得する
   */
  list(writingId: string): Promise<ConsistencyCheckSummary[]>;

  /**
   * 矛盾チェックの詳細（finding 全件）を取得する
   */
  get(checkId: string): Promise<ConsistencyCheck>;

  /**
   * 指摘（finding）のトリアージ状態を更新する
   */
  updateFinding(
    findingId: string,
    status: FindingStatus,
  ): Promise<ConsistencyFinding>;

  /**
   * 指摘から修正依頼を合成し、write モードのチャットセッションを作成する（ストリーミング）。
   * 以降は通常のチャット→提案フローとなる。
   */
  createFixSession(findingId: string): Promise<{
    session: AIChatSession;
    stream: ReadableStream<AIStreamChunk>;
  }>;
}

/**
 * 用語集操作のインターフェース
 */
export interface GlossaryAdapter {
  list(projectId: string): Promise<GlossaryTerm[]>;
  create(
    projectId: string,
    data: CreateGlossaryTermData,
  ): Promise<GlossaryTerm>;
  get(termId: string): Promise<GlossaryTerm | null>;
  update(termId: string, data: UpdateGlossaryTermData): Promise<GlossaryTerm>;
  delete(termId: string): Promise<void>;
}

/**
 * 執筆指示（カスタムインストラクション）操作のインターフェース
 */
export interface InstructionAdapter {
  list(projectId: string): Promise<Instruction[]>;
  create(projectId: string, data: CreateInstructionData): Promise<Instruction>;
  get(instructionId: string): Promise<Instruction | null>;
  update(
    instructionId: string,
    data: UpdateInstructionData,
  ): Promise<Instruction>;
  delete(instructionId: string): Promise<void>;
}

/**
 * プロジェクト設定操作のインターフェース
 */
export interface ProjectSettingsAdapter {
  get(projectId: string): Promise<ProjectSettings>;
  update(
    projectId: string,
    data: Partial<ProjectSettings>,
  ): Promise<ProjectSettings>;
}

/**
 * 認証操作のインターフェース
 */
export interface AuthAdapter {
  /**
   * 現在の認証状態を取得
   */
  getAuthState(): Promise<AuthState>;

  /**
   * Google OAuth認証を開始（認可URLを取得）
   */
  getGoogleAuthUrl(): Promise<GoogleAuthUrl>;
  /**
   * ログアウト
   */
  logout(): Promise<void>;
  /**
   * アクセストークンをリフレッシュ
   */
  refreshAccessToken(): Promise<AuthState>;
}

/**
 * エクスポート操作のインターフェース
 */
export interface ExportAdapter {
  /**
   * プロジェクトをエクスポート（全コンテンツを zip-markdown で出力）
   * @param projectId - エクスポートするプロジェクトID
   */
  exportProject(projectId: string): Promise<void>;
}

/**
 * 統合アダプター
 */
export interface Adapter {
  readonly auth: AuthAdapter;
  readonly projects: ProjectAdapter;
  readonly settings: ProjectSettingsAdapter;
  readonly nodes: NodeAdapter;
  readonly plots: PlotAdapter;
  readonly characters: CharacterAdapter;
  readonly memos: MemoAdapter;
  readonly writings: WritingAdapter;
  readonly ai: AIAdapter;
  readonly runs: AIRunAdapter;
  readonly consistency: ConsistencyAdapter;
  readonly glossary: GlossaryAdapter;
  readonly instructions: InstructionAdapter;
  readonly export: ExportAdapter;
}
