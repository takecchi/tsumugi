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
   * プロジェクトID（バックエンドが払い出す Unique ID）
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
 * ノードの正典ステータス
 * - confirmed: 確定（設定として確定した内容）
 * - draft: 検討中（まだ確定していない内容）
 */
export type CanonStatus = 'confirmed' | 'draft';

/**
 * ノードのAIコンテキストへの露出ポリシー
 * - always: 常に全文をAIコンテキストに注入する
 * - auto: 要約のみを注入する
 * - never: AIから隠す
 */
export type ContextPolicy = 'always' | 'auto' | 'never';

/**
 * コンテンツ共通の基底（ノード）
 * 各コンテンツタイプ（Writing, Plot, Character, Memo）はこれを継承する。
 *
 * canonStatus / contextPolicy はバックエンドが払い出す AI 属性。
 * 作成/更新時は含めず、`nodes.updateAttributes()` で個別に更新する。
 */
export interface Node extends Timestamps {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  nodeType: NodeType;
  order: number;
  /** 正典ステータス（確定/検討中） */
  canonStatus: CanonStatus;
  /** AIコンテキストへの露出ポリシー */
  contextPolicy: ContextPolicy;
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
}

/**
 * AIチャットメッセージ（Discriminated Union）
 *
 * messageType で判別可能。型の絞り込みにより各バリアントのフィールドが保証される。
 */
export type AIMessage =
  | AITextMessage
  | AIToolCallMessage
  | AIToolResultMessage
  | AIProposalMessage;

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

interface LineNumber {
  line: number;
  col: number;
}

/**
 * フィールドの変更指示(before/after)
 */
export interface FieldChange<T extends string | unknown> {
  fieldName?: string;
  before: T;
  after: T;
  previewStart?: LineNumber;
  previewEnd?: LineNumber;
}

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
  /** フィールド毎の差分 */
  diffs: FieldChange<string | unknown>[];
  /** ステータス */
  status: AIProposalStatus;
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
export type AIStreamChunkType =
  | 'text'
  | 'tool_call'
  | 'tool_result'
  | 'proposal'
  | 'usage'
  | 'error'
  | 'done';

/**
 * ストリーミングチャンク
 *
 * バックエンドの SSE (v2) はテキストを text-start→text-delta×N→text-end の
 * ブロック単位で流し、完了を finish で通知するが、adapter-api がそれを
 * この安定したドメイン型に正規化する（text-delta→text / finish→done 等）。
 */
export interface AIStreamChunk {
  type: AIStreamChunkType;
  /** テキストチャンク（type='text'時。text-delta の増分） */
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
  /**
   * 保存された最終アシスタントメッセージID（type='done'時）。
   * finish.message_id に由来し、テキストが無かった場合は null（未設定）。
   */
  messageId?: string;
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

// ─── AIコンテキストプレビュー ───

/**
 * AIコンテキストの層（tier）ごとのセクション
 */
export interface AIContextSection {
  /** 層（数値が小さいほど優先度が高い） */
  tier: number;
  /** セクションのタイトル */
  title: string;
  /** セクションの内容 */
  content: string;
  /** 文字数 */
  charCount: number;
}

/**
 * AIに渡されるコンテキスト一式（プレビュー用）
 */
export interface AIContextPack {
  /** 層ごとのセクション一覧 */
  sections: AIContextSection[];
  /** 全体の合計文字数 */
  totalCharCount: number;
}

// ─── 矛盾チェック ───

/**
 * 矛盾チェックの指摘の重要度
 */
export type FindingSeverity = 'info' | 'warning' | 'error';

/**
 * 矛盾チェックの指摘のカテゴリ
 * - setting: 設定 / timeline: 時系列 / character: 人物
 * - notation: 表記 / continuity: 連続性
 */
export type FindingCategory =
  | 'setting'
  | 'timeline'
  | 'character'
  | 'notation'
  | 'continuity';

/**
 * 矛盾チェックの指摘のトリアージ状態
 */
export type FindingStatus = 'open' | 'dismissed' | 'resolved';

/**
 * 矛盾チェック（1回の実行）の状態
 */
export type ConsistencyCheckStatus = 'processing' | 'completed' | 'error';

/**
 * 矛盾チェックの指摘（finding）
 */
export interface ConsistencyFinding {
  id: string;
  /** 属する矛盾チェックのID */
  checkId: string;
  /** 重要度 */
  severity: FindingSeverity;
  /** カテゴリ */
  category: FindingCategory;
  /** 該当箇所の引用 */
  quote: string;
  /** 該当開始行（1始まり、無い場合は null） */
  startLine: number | null;
  /** 該当終了行（1始まり、無い場合は null） */
  endLine: number | null;
  /** 関連するノードのID（無い場合は null） */
  relatedNodeId: string | null;
  /** 指摘の説明 */
  description: string;
  /** 修正提案（無い場合は null） */
  suggestion: string | null;
  /** トリアージ状態 */
  status: FindingStatus;
  createdAt: Date;
}

/**
 * 矛盾チェック（1回の実行）の詳細（finding 全件を含む）
 */
export interface ConsistencyCheck {
  id: string;
  /** 対象執筆ノードのID */
  nodeId: string;
  /** 実行状態 */
  status: ConsistencyCheckStatus;
  /** 総評（無い場合は null） */
  summary: string | null;
  /** 指摘一覧 */
  findings: ConsistencyFinding[];
  createdAt: Date;
}

/**
 * 矛盾チェックの履歴項目（一覧用、finding 件数のみ）
 */
export interface ConsistencyCheckSummary {
  id: string;
  /** 対象執筆ノードのID */
  nodeId: string;
  /** 実行状態 */
  status: ConsistencyCheckStatus;
  /** 総評（無い場合は null） */
  summary: string | null;
  /** 指摘の件数 */
  findingCount: number;
  createdAt: Date;
}

/**
 * 矛盾チェック実行ストリームのチャンク種別
 */
export type ConsistencyStreamChunkType = 'finding' | 'usage' | 'done' | 'error';

/**
 * 矛盾チェック実行（SSE）のストリーミングチャンク
 * start→finding×N→usage→finish を正規化したもの。
 */
export interface ConsistencyStreamChunk {
  type: ConsistencyStreamChunkType;
  /** 指摘（type='finding'時） */
  finding?: ConsistencyFinding;
  /** トークン使用量（type='usage'時） */
  usage?: AITokenUsage;
  /** エラーメッセージ（type='error'時） */
  error?: string;
}

// ─── 用語集 ───

/**
 * 用語集の項目
 */
export interface GlossaryTerm extends Timestamps {
  id: string;
  projectId: string;
  /** 正規表記（必須） */
  term: string;
  /** 読み（無い場合は null） */
  reading: string | null;
  /** 別表記の配列 */
  aliases: string[];
  /** 備考（無い場合は null） */
  notes: string | null;
}

/**
 * 用語集項目の作成データ
 */
export interface CreateGlossaryTermData {
  /** 正規表記（必須） */
  term: string;
  reading?: string;
  aliases?: string[];
  notes?: string;
}

/**
 * 用語集項目の更新データ
 */
export type UpdateGlossaryTermData = Partial<CreateGlossaryTermData>;

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

/**
 * エクスポートのフォーマット
 */
export type ExportFormat = 'zip-markdown';

/**
 * エクスポートオプション
 */
export interface ExportOptions {
  /** エクスポートフォーマット（デフォルト: 'zip-markdown'） */
  format?: ExportFormat;
  /** 執筆データを含めるか（デフォルト: true） */
  includeWritings?: boolean;
  /** プロットデータを含めるか（デフォルト: true） */
  includePlots?: boolean;
  /** キャラクターデータを含めるか（デフォルト: true） */
  includeCharacters?: boolean;
  /** メモデータを含めるか（デフォルト: true） */
  includeMemos?: boolean;
}
