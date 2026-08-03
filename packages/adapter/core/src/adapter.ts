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
import type {
  Commit,
  CommitDiff,
  CommitEntry,
  CommitList,
  CreateCommitResult,
  NodeRevisionList,
  PaginationParams,
  RestoreCommitResult,
} from './version-types';

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
 * バージョン管理（コミット / 差分 / 復元）操作のインターフェース
 *
 * コンテンツを変更する API を叩くと、最後の変更から一定時間操作が止まった時点で
 * `commitType: 'auto'` のコミットがバックエンドで自動生成される。
 * タイマーはインメモリでサーバー再起動により消えるため、
 * 「一定時間後に必ずコミットされる」前提の UI（カウントダウン等）を作ってはならない。
 */
export interface VersionAdapter {
  /**
   * 手動コミット（保存）を作成する
   *
   * 前回コミットから変更が無い場合は `{ status: 'no_changes' }` を返す（正常系）。
   * 保存ボタンを無効化するのではなく、「変更はありません」と穏当に見せること。
   * @param projectId - プロジェクトID
   * @param message - コミットメッセージ（1〜500文字）
   */
  createCommit(projectId: string, message: string): Promise<CreateCommitResult>;

  /**
   * プロジェクトのコミット履歴を取得する（新しい順）
   */
  listCommits(
    projectId: string,
    params?: PaginationParams,
  ): Promise<CommitList>;

  /**
   * コミットを 1 件取得する（存在しない場合は null）
   */
  getCommit(commitId: string): Promise<Commit | null>;

  /**
   * コミットの差分を取得する
   * @param commitId - 差分を見るコミットID
   * @param baseCommitId - 比較元コミットID。省略時は親コミットとの差分
   */
  getCommitDiff(commitId: string, baseCommitId?: string): Promise<CommitDiff>;

  /**
   * 未コミットの作業差分を取得する
   *
   * 返り値の `commitId` は常に null になる。
   * @param projectId - プロジェクトID
   * @param baseCommitId - 比較元コミットID。省略時は最新コミットとの差分
   */
  getProjectDiff(projectId: string, baseCommitId?: string): Promise<CommitDiff>;

  /**
   * コミット時点のエントリのスナップショットを取得する（存在しない場合は null）
   *
   * 差分 API では `added` / `removed` の中身が返らないため、
   * 追加された本文を表示したい場合にこれを使う。
   */
  getCommitEntry(
    commitId: string,
    targetId: string,
  ): Promise<CommitEntry | null>;

  /**
   * プロジェクト全体をコミット時点の状態に復元する
   *
   * 破壊的操作。復元先に存在しないノード・指示文・用語は物理削除される。
   * 呼び出し前に必ず確認ダイアログを出すこと。
   * 復元前の状態は自動でバックアップコミットに退避される
   * （`RestoreResult.backupCommitId`）。
   *
   * `editPolicy` はバージョン管理の対象外であり、復元しても現在の保護設定が維持される。
   *
   * 現在の状態が復元先と完全一致している場合は
   * `{ status: 'already_at_commit' }` を返す（正常系）。
   */
  restoreCommit(commitId: string): Promise<RestoreCommitResult>;

  /**
   * ノードの変更履歴を取得する（新しい順）
   */
  listNodeRevisions(
    nodeId: string,
    params?: PaginationParams,
  ): Promise<NodeRevisionList>;

  /**
   * ノードの本文をコミット時点の状態に復元する
   *
   * 本文のみが戻る。名前・親・並び順・canonStatus / contextPolicy は変わらない。
   * フォルダノードに対して呼ぶとエラー（400）になる。
   * @returns 復元後のノード（`RestoreResult` ではない）
   */
  restoreNode(nodeId: string, commitId: string): Promise<Node>;
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
  readonly consistency: ConsistencyAdapter;
  readonly glossary: GlossaryAdapter;
  readonly instructions: InstructionAdapter;
  readonly versions: VersionAdapter;
  readonly export: ExportAdapter;
}
