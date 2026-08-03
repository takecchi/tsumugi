/**
 * バージョン管理（コミット / 差分 / 復元）関連の型定義。
 */
import type { NodeType } from './types';

/**
 * コミットの種別
 *
 * - manual: ユーザーが保存ボタンから作成したコミット
 * - auto: 最後の変更から一定時間操作が止まった時点でバックエンドが自動生成するコミット
 * - backup: 復元の直前に、復元前の状態を退避するために作られるコミット
 * - restore: 復元によって作られるコミット
 */
export type CommitType = 'manual' | 'auto' | 'backup' | 'restore';

/**
 * コミットに含まれるエントリ（変更対象）の種別
 */
export type RevisionEntryType =
  | 'project'
  | 'node'
  | 'instruction'
  | 'glossary_term';

/**
 * 差分エントリの変更種別
 */
export type DiffChangeType = 'added' | 'removed' | 'modified';

/**
 * 行差分の操作種別
 *
 * - eq: 変更なし
 * - add: 追加された行
 * - del: 削除された行
 */
export type DiffLineOp = 'eq' | 'add' | 'del';

/**
 * コミット
 *
 * addedCount / modifiedCount / removedCount は「エントリ（変更対象）の件数」であり、
 * 文字数や行数ではない。
 */
export interface Commit {
  id: string;
  projectId: string;
  /** 親コミットID（最初のコミットは null） */
  parentId: string | null;
  /** コミットメッセージ */
  message: string;
  commitType: CommitType;
  /** 追加されたエントリ件数 */
  addedCount: number;
  /** 変更されたエントリ件数 */
  modifiedCount: number;
  /** 削除されたエントリ件数 */
  removedCount: number;
  createdAt: Date;
}

/**
 * コミット一覧（カーソルページネーション）
 *
 * `has_more` は存在しない。`nextCursor === null` が終端を意味する。
 */
export interface CommitList {
  commits: Commit[];
  /** 次ページのカーソル。null なら終端 */
  nextCursor: string | null;
}

/**
 * 短い属性フィールドの before/after
 *
 * `name` / `role` / `tags` / `canonStatus` などの短い属性が対象。
 * 値が変わっていないフィールドは含まれない。
 */
export interface DiffFieldChange {
  /** フィールド名 */
  field: string;
  /** 変更前の値（存在しなかった場合は null） */
  oldValue: string | null;
  /** 変更後の値（削除された場合は null） */
  newValue: string | null;
}

/**
 * 行単位差分の 1 行
 */
export interface DiffLine {
  op: DiffLineOp;
  text: string;
}

/**
 * 長文フィールドの行単位差分
 *
 * `content` / `synopsis` / `notes` などの長文が対象。
 * 差分はバックエンドで計算済みのため、フロントで差分ライブラリを使う必要はない。
 */
export interface TextDiff {
  /** フィールド名 */
  field: string;
  lines: DiffLine[];
}

/**
 * 差分エントリ（変更対象 1 件分の差分）
 *
 * changeType が `added` / `removed` の場合、fieldChanges と textDiffs は必ず空配列になる。
 * 追加された本文の中身を見せたい場合は `getCommitEntry()` を別途呼ぶこと。
 *
 * ノード種別が途中で変わった場合はメタ情報の fieldChanges のみが返る。
 */
export interface CommitDiffEntry {
  entryType: RevisionEntryType;
  /** 変更対象のID（ノードID / 指示ID / 用語ID / プロジェクトID） */
  targetId: string;
  changeType: DiffChangeType;
  /** 変更対象の表示名 */
  name: string;
  /** ノード種別（entryType が node 以外の場合は null） */
  nodeType: NodeType | null;
  /** 短い属性の before/after（added / removed では空配列） */
  fieldChanges: DiffFieldChange[];
  /** 長文の行単位差分（added / removed では空配列） */
  textDiffs: TextDiff[];
}

/**
 * コミット差分
 */
export interface CommitDiff {
  /** 比較元のコミットID（親コミットが無い場合は null） */
  baseCommitId: string | null;
  /** 比較先のコミットID。作業差分（未コミット）の場合は常に null */
  commitId: string | null;
  entries: CommitDiffEntry[];
}

/**
 * コミットエントリのフィールド 1 件
 */
export interface CommitEntryField {
  field: string;
  value: string | null;
}

/**
 * コミット時点のエントリのスナップショット
 *
 * 差分 API では返らない「追加された本文の中身」を取得するために使う。
 */
export interface CommitEntry {
  entryType: RevisionEntryType;
  targetId: string;
  name: string;
  /** ノード種別（entryType が node 以外の場合は null） */
  nodeType: NodeType | null;
  /** 短い属性フィールド */
  metaFields: CommitEntryField[];
  /** 長文フィールド */
  contentFields: CommitEntryField[];
}

/**
 * ノード単位の変更履歴における変更種別
 */
export type NodeRevisionChangeType = 'added' | 'modified';

/**
 * ノード単位の変更履歴（そのノードを変更したコミット）
 */
export interface NodeRevision {
  commitId: string;
  message: string;
  commitType: CommitType;
  createdAt: Date;
  changeType: NodeRevisionChangeType;
}

/**
 * ノード変更履歴一覧（カーソルページネーション）
 *
 * `nextCursor === null` が終端を意味する。
 */
export interface NodeRevisionList {
  revisions: NodeRevision[];
  /** 次ページのカーソル。null なら終端 */
  nextCursor: string | null;
}

/**
 * コミット作成の結果
 *
 * 「変更がない」はバックエンドが 409 で返す**正常系**であり、
 * 通信エラーとは区別して穏当に扱えるよう結果型で表している。
 */
export type CreateCommitResult =
  | { status: 'created'; commit: Commit }
  /** 前回コミットから変更がなかった（保存するものが無い） */
  | { status: 'no_changes' };

/**
 * 復元の結果
 */
export interface RestoreResult {
  /** 復元前の状態を退避したバックアップコミットID（未コミット変更が無ければ null） */
  backupCommitId: string | null;
  /** 復元によって作られたコミットID */
  restoreCommitId: string;
}

/**
 * プロジェクト全体の復元の結果
 *
 * 「既にこの状態」はバックエンドが 409 で返す**正常系**であり、
 * 通信エラーとは区別して穏当に扱えるよう結果型で表している。
 */
export type RestoreCommitResult =
  | { status: 'restored'; result: RestoreResult }
  /** 現在の状態が復元先と完全に一致していた */
  | { status: 'already_at_commit' };

/**
 * カーソルページネーションのパラメータ
 *
 * limit はデフォルト 50 / 最大 100。範囲外の値はバックエンド側で黙って丸められる。
 * cursor にはレスポンスの nextCursor をそのまま渡す。
 */
export interface PaginationParams {
  limit?: number;
  cursor?: string | null;
}
