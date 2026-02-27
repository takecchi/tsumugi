import type {
  Project,
  ProjectSettings,
  Node,
  TreeNode,
  Plot,
  Character,
  Memo,
  Writing,
  AIChatMessageRequest,
  AIChatRequest,
  AIChatSession,
  AIMessage,
  AIProposalResult,
  AIStreamChunk,
  AIMemory,
  AIProjectUsage,
  AuthState,
  GoogleAuthUrl,
} from './types';

/**
 * アダプター設定
 */
export interface AdapterConfig {
  /**
   * ローカルアダプター設定
   */
  local?: LocalAdapterConfig;
  /**
   * Web APIアダプター設定
   */
  api?: ApiAdapterConfig;
}

/**
 * ローカルアダプター設定
 */
export interface LocalAdapterConfig {
  /**
   * ワークディレクトリ（未指定時は~/TsumugiProjects）
   */
  workDir?: string;
  /**
   * AI設定
   */
  ai?: AIAdapterConfig;
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
 * AI アダプター設定
 */
export interface AIAdapterConfig {
  /** AIプロバイダー (e.g. "openai", "anthropic") */
  provider: string;
  /** APIキー */
  apiKey: string;
  /** デフォルトモデル名 */
  defaultModel?: string;
  /** APIエンドポイント（カスタムプロキシ等） */
  baseUrl?: string;
}

/**
 * 作成時に除外するフィールド
 */
type CreateOmit = 'id' | 'createdAt' | 'updatedAt';

/**
 * 更新時に除外するフィールド
 */
type UpdateOmit = 'id' | 'projectId' | 'createdAt' | 'updatedAt';

/**
 * ノードアダプター共通の操作
 */
interface NodeAdapterBase<T extends Node> {
  getByProjectId(projectId: string): Promise<T[]>;
  getTreeByProjectId(projectId: string): Promise<TreeNode[]>;
  getById(id: string): Promise<T | null>;
  getChildren(parentId: string): Promise<T[]>;
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
  update(id: string, data: Partial<Omit<Project, CreateOmit>>): Promise<Project>;
  delete(id: string): Promise<void>;
}

/**
 * プロット操作のインターフェース
 */
export type PlotAdapter = NodeAdapterBase<Plot>

/**
 * キャラクター操作のインターフェース
 */
export type CharacterAdapter = NodeAdapterBase<Character>

/**
 * メモ操作のインターフェース
 */
export interface MemoAdapter extends NodeAdapterBase<Memo> {
  getByTag(projectId: string, tag: string): Promise<Memo[]>;
}

/**
 * 執筆操作のインターフェース
 */
export interface WritingAdapter extends NodeAdapterBase<Writing> {
  getTotalWordCount(projectId: string): Promise<number>;
}

/**
 * AI操作のインターフェース
 */
export interface AIAdapter {
  /**
   * チャット（ストリーミング）
   * ReadableStream<AIStreamChunk> を返す
   */
  chat(sessionId: string, request: AIChatRequest): Promise<ReadableStream<AIStreamChunk>>;

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
  createSession(projectId: string, request: AIChatMessageRequest): Promise<{ session: AIChatSession; stream: ReadableStream<AIStreamChunk> }>;

  /**
   * 提案を承認（コンフリクト検出 + データ更新 + ステータス更新）
   * 全提案が処理済みになった場合、自動的に AI へフィードバックを送信しその応答ストリームを含む result.stream を返す。
   */
  acceptProposal(sessionId: string, proposalId: string): Promise<AIProposalResult>;

  /**
   * 提案を拒否（ステータス更新のみ）
   * 全提案が処理済みになった場合、自動的に AI へフィードバックを送信しその応答ストリームを含む result.stream を返す。
   */
  rejectProposal(sessionId: string, proposalId: string): Promise<AIProposalResult>;

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
}

/**
 * プロジェクト設定操作のインターフェース
 */
export interface ProjectSettingsAdapter {
  get(projectId: string): Promise<ProjectSettings>;
  update(projectId: string, data: Partial<ProjectSettings>): Promise<ProjectSettings>;
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
 * 統合アダプター
 */
export interface Adapter {
  readonly auth: AuthAdapter;
  readonly projects: ProjectAdapter;
  readonly settings: ProjectSettingsAdapter;
  readonly plots: PlotAdapter;
  readonly characters: CharacterAdapter;
  readonly memos: MemoAdapter;
  readonly writings: WritingAdapter;
  readonly ai: AIAdapter;
}
