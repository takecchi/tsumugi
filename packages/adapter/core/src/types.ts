/**
 * コンテンツの種類
 */
export type ContentType = 'plot' | 'character' | 'memo' | 'writing';

/**
 * ノードの種類（フォルダ or ファイル）
 */
export type NodeType = 'folder' | ContentType;

/**
 * 共通のタイムスタンプ
 */
export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

/**
 * プロジェクト
 */
export interface Project extends Timestamps {
  /**
   * プロジェクトID
   * ローカル: フルパス(ex:/Users/username/TsumugiProjects/projectName)
   * クラウド: Unique ID
   */
  id: string;
  name: string;
  synopsis?: string;
  theme?: string;
  goal?: string;
  targetWordCount?: number;
  targetAudience?: string;
}

/**
 * エディタタブの種類（コンテンツ種別 + プロジェクト設定）
 */
export type EditorTabType = ContentType | 'project';

/**
 * エディタタブの保存状態
 */
export interface SavedEditorTab {
  id: string;
  name: string;
  type: EditorTabType;
  /** アクティブなタブかどうか */
  active?: boolean;
}

/**
 * プロジェクト設定
 */
export interface ProjectSettings {
  /** AIチャットモード */
  aiChatMode: AIChatMode;
  /** 開いているタブ一覧（active フラグでアクティブタブを識別） */
  openTabs: SavedEditorTab[];
}

/**
 * コンテンツ共通の基底（ノード）
 * 各コンテンツタイプ（Writing, Plot, Character, Memo）はこれを継承する。
 * id, projectId は adapter-local ではパスから自動計算されるため JSON には保存しない。
 */
export interface Node extends Timestamps {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  nodeType: NodeType;
  order: number;
}

/**
 * ツリー表示用のコンテンツノード（子ノードを含む）
 */
export interface TreeNode extends Node {
  children?: TreeNode[];
}

/**
 * プロット
 */
export interface Plot extends Node {
  synopsis?: string;
  setting?: string;
  theme?: string;
  structure?: string;
  conflict?: string;
  resolution?: string;
  notes?: string;
}

/**
 * キャラクター
 */
export interface Character extends Node {
  aliases?: string;
  role?: string;
  gender?: string;
  age?: string;
  appearance?: string;
  personality?: string;
  background?: string;
  motivation?: string;
  relationships?: string;
  notes?: string;
}

/**
 * メモ
 */
export interface Memo extends Node {
  content: string;
  tags?: string[];
}

/**
 * 執筆（本文）
 */
export interface Writing extends Node {
  content: string;
  wordCount: number;
}

/**
 * AIメモリ（セッション横断で保持される知識）
 */
export interface AIMemory {
  id: string;
  content: string;
  createdAt: Date;
}

// ─── AI トークン使用量 ───

/**
 * トークン使用量
 */
export interface AITokenUsage {
  /** 入力トークン数 */
  promptTokens: number;
  /** 出力トークン数 */
  completionTokens: number;
  /** 合計トークン数 */
  totalTokens: number;
}

/**
 * プロジェクト全体のトークン使用量
 */
export interface AIProjectUsage {
  /** プロジェクトID */
  projectId: string;
  /** セッションごとの使用量 */
  sessions: {
    sessionId: string;
    title: string;
    usage: AITokenUsage;
  }[];
  /** プロジェクト全体の合計 */
  total: AITokenUsage;
}

// ─── AI 関連 ───

/**
 * AIツール名
 */
export type AIToolName =
  // 読み取りツール（Ask/Write 共通）
  | 'get_project_overview'
  | 'get_plot'
  | 'get_all_plots'
  | 'get_character'
  | 'get_all_characters'
  | 'get_memo'
  | 'get_all_memos'
  | 'search_memos_by_tag'
  | 'get_writing'
  | 'get_all_writings'
  | 'get_total_word_count'
  // 提案ツール（Write モードのみ）
  | 'propose_create_plot'
  | 'propose_create_character'
  | 'propose_create_memo'
  | 'propose_create_writing'
  | 'propose_update_plot'
  | 'propose_update_character'
  | 'propose_update_memo'
  | 'propose_update_writing'
  | 'propose_update_project'
  // メモリツール（Ask/Write 共通）
  | 'save_memory'
  | 'delete_memory';

/**
 * AIメッセージのロール
 */
export type AIRole = 'system' | 'user' | 'assistant' | 'tool';

/**
 * AIメッセージの種類
 *
 * バックエンドに保存される各メッセージの分類。
 * - text: 自然言語テキスト（LLM の応答 or ユーザー入力）
 * - tool_call: LLM が発行したツール呼び出し（LLM ↔ アダプター間）
 * - tool_result: ツール実行結果（LLM ↔ アダプター間）
 * - proposal: アダプターが生成した変更提案（フロントエンド ↔ アダプター間）。
 *   LLM は proposal を直接認識しない。ツール結果から変換されて保存される。
 */
export type AIMessageType = 'text' | 'tool_call' | 'tool_result' | 'proposal';

/**
 * 提案のステータス
 */
export type AIProposalStatus = 'pending' | 'accepted' | 'rejected' | 'conflict';

/**
 * AIメッセージの共通フィールド
 */
interface AIMessageBase {
  id: string;
  sessionId: string;
  role: AIRole;
}

/**
 * テキストメッセージ（LLM の応答 or ユーザー入力）
 */
export interface AITextMessage extends AIMessageBase {
  messageType: 'text';
  content: string;
}

/**
 * ツール呼び出しメッセージ（LLM が発行）
 */
export interface AIToolCallMessage extends AIMessageBase {
  messageType: 'tool_call';
  content: string;
}

/**
 * ツール実行結果メッセージ
 */
export interface AIToolResultMessage extends AIMessageBase {
  messageType: 'tool_result';
  content: string;
}

/**
 * 変更提案メッセージ（アダプターが生成、フロントエンド ↔ アダプター間）
 *
 * LLM は proposal を直接認識しない。ツール結果から変換されて保存される。
 * proposal と proposalStatus は常にセットで存在する。
 */
export interface AIProposalMessage extends AIMessageBase {
  messageType: 'proposal';
  proposal: AIProposal;
  proposalStatus: AIProposalStatus;
}

/**
 * AIチャットメッセージ（Discriminated Union）
 *
 * messageType で判別可能。型の絞り込みにより各バリアントのフィールドが保証される。
 */
export type AIMessage = AITextMessage | AIToolCallMessage | AIToolResultMessage | AIProposalMessage;

/**
 * AIツール呼び出し
 */
export interface AIToolCall {
  id: string;
  /** ツール名 */
  name: AIToolName;
  /** ツールに渡す引数（JSON文字列） */
  arguments: string;
}

/**
 * AIチャットセッション
 */
export interface AIChatSession extends Timestamps {
  id: string;
  projectId: string;
  title: string;
  /** セッション全体のトークン使用量（累計） */
  totalUsage?: AITokenUsage;
}

/**
 * AIモデル設定
 */
export interface AIModelConfig {
  /** モデル名 (e.g. "gpt-5.2", "claude-sonnet-4-20250514") */
  model: string;
  /** 生成時の温度パラメータ (0.0〜2.0) */
  temperature?: number;
  /** 最大トークン数 */
  maxTokens?: number;
}

/**
 * 提案の操作種別
 */
export type AIProposalAction = 'create' | 'update';

/**
 * 行単位の編集指示
 */
export interface AILineEdit {
  /** 変更開始行（1-indexed） */
  startLine: number;
  /** 変更終了行（1-indexed, inclusive）。startLine > endLine なら挿入 */
  endLine: number;
  /** 置換後のテキスト（空文字列なら削除） */
  newText: string;
}

/**
 * フィールドの変更指示
 *
 * - replace: フィールド全体を置換する（短文フィールド向け）
 * - line_edits: 行単位で部分的に編集する（長文フィールド向け）
 */
export type AIFieldChange =
  | { type: 'replace'; value: unknown }
  | { type: 'line_edits'; edits: AILineEdit[] };

/**
 * AIによる変更提案
 *
 * フロントエンド ↔ アダプター間のインターフェース。
 * LLM には直接送られず、アダプター内部で propose_create_* / propose_update_* ツールの
 * 結果から生成され、フロントエンドに提案カードとして表示される。
 * LLM へのフィードバックは AIProposalFeedback を元にアダプターがテキストに変換して送信する。
 *
 * - update: original は変更対象フィールドの変更前の値（replace のみ）。
 *   line_edits の場合は original に該当行のテキストを保持する。
 *   Accept 時に updatedAt を比較し、フィールド単位でコンフリクトを検出する。
 * - create: proposed のみを含む（original はなし）。コンフリクト検出は不要。
 */
export interface AIProposal {
  /** 提案の一意ID（ツール呼び出しIDを流用） */
  id: string;
  /** 操作種別 */
  action: AIProposalAction;
  /** 対象コンテンツのID（create 時は親フォルダのID） */
  targetId: string;
  /** 対象コンテンツの種別 */
  contentType: EditorTabType;
  /** 対象コンテンツの表示名 */
  targetName: string;
  /** 提案時点の updatedAt（コンフリクト検出用、update 時のみ） */
  updatedAt?: Date;
  /** 変更前の値（update 時のみ、変更対象フィールドのみ） */
  original?: Record<string, unknown>;
  /** フィールドごとの変更指示 */
  proposed: Record<string, AIFieldChange>;
}

/**
 * 提案に対するフィードバックのステータス
 */
export type AIProposalFeedbackStatus = 'accepted' | 'rejected' | 'conflict';

/**
 * 提案に対するフィードバック
 *
 * ユーザーが提案を承認/拒否した結果を、次のチャットリクエストでAIに通知する。
 * - accepted: 提案が承認され、データが更新された
 * - rejected: 提案がユーザーにより拒否された
 * - conflict: 提案後にデータが変更されており、マージできなかった
 */
export interface AIProposalFeedback {
  /** 対象のツール呼び出しID */
  toolCallId: string;
  /** 結果 */
  status: AIProposalFeedbackStatus;
  /** 対象コンテンツの種別（ツリー更新用） */
  contentType?: EditorTabType;
  /** 対象コンテンツのID（エディタ再取得用） */
  targetId?: string;
  /** コンフリクト時の詳細（どのフィールドが変更されていたか等） */
  conflictDetails?: string;
}

/**
 * 提案の承認/拒否の結果
 *
 * feedback: 今回処理した提案のフィードバック
 * stream: 全提案が処理済みになった場合にのみ設定される。
 *   adapter が自動的に AI へフィードバックを送信し、その応答ストリームを返す。
 *   フロント側は stream があればそれを消費するだけでよい。
 */
export interface AIProposalResult {
  feedback: AIProposalFeedback;
  /** 全提案処理済み時の AI 応答ストリーム（未完了時は undefined） */
  stream?: ReadableStream<AIStreamChunk>;
}

/**
 * ストリーミングチャンクの種類
 */
export type AIStreamChunkType = 'text' | 'tool_call' | 'tool_result' | 'proposal' | 'usage' | 'error' | 'done';

/**
 * ストリーミングチャンク
 */
export interface AIStreamChunk {
  type: AIStreamChunkType;
  /** テキストチャンク（type='text'時） */
  content?: string;
  /** ツール呼び出し情報（type='tool_call'時） */
  toolCall?: AIToolCall;
  /** ツール実行結果（type='tool_result'時） */
  toolResult?: { toolCallId: string; toolName: AIToolName; result: string };
  /** AI変更提案（type='proposal'時） */
  proposal?: AIProposal;
  /** トークン使用量（type='usage'時） */
  usage?: AITokenUsage;
  /** エラーメッセージ（type='error'時） */
  error?: string;
}

/**
 * AIチャットモード
 * - ask: 読み取り専用（データを参照して回答するのみ）
 * - write: 書き込み可能（プロットやキャラ設定等を直接編集・作成できる）
 */
export type AIChatMode = 'ask' | 'write';

/**
 * ユーザーが開いているタブの情報
 */
export interface AIChatContextTab {
  /** コンテンツID */
  id: string;
  /** 表示名 */
  name: string;
  /** コンテンツ種別 */
  contentType: EditorTabType;
  /** アクティブなタブかどうか */
  active?: boolean;
}

/**
 * チャットに渡すコンテキスト情報
 */
export interface AIChatContext {
  /** 開いているタブ一覧（active フラグでアクティブタブを識別） */
  openTabs?: AIChatContextTab[];
}

/**
 * チャットリクエストの共通フィールド
 */
interface AIChatRequestBase {
  /** チャットモード */
  mode: AIChatMode;
  /** このメッセージIDの時点まで巻き戻してから送信する（リバート用） */
  revertToMessageId?: string;
  config?: AIModelConfig;
  /** ユーザーの作業コンテキスト */
  context?: AIChatContext;
}

/**
 * ユーザーメッセージ送信リクエスト
 */
export interface AIChatMessageRequest extends AIChatRequestBase {
  /** ユーザーの発言 */
  message: string;
}

/**
 * チャットリクエスト
 *
 * 提案フィードバックは adapter 側で自動的に会話履歴から注入されるため、
 * フロント側から明示的にフィードバックを送信する必要はない。
 */
export type AIChatRequest = AIChatMessageRequest;

// ─── 認証関連 ───

/**
 * 認証状態
 */
export interface AuthState {
  /** ログイン済みかどうか */
  isAuthenticated: boolean;
  /** アクセストークン（API通信用、未ログイン時はnull） */
  accessToken: string | null;
}

/**
 * Google OAuth認証開始の結果
 */
export interface GoogleAuthUrl {
  /** Google OAuth認可URL */
  url: string;
}

