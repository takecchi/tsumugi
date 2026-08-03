/**
 * バージョン管理（コミット履歴 / 差分表示）用のピュアロジック。
 * 表示コンポーネントから副作用のない計算を切り出したもの。
 */

/** コミット種別 */
export type CommitTypeValue = 'manual' | 'auto' | 'backup' | 'restore';

/** 差分エントリの変更種別 */
export type DiffChangeTypeValue = 'added' | 'removed' | 'modified';

/** 行差分の操作種別 */
export type DiffLineOpValue = 'eq' | 'add' | 'del';

/** 差分エントリの対象種別 */
export type RevisionEntryTypeValue =
  | 'project'
  | 'node'
  | 'instruction'
  | 'glossary_term';

/** コミットメッセージの最大文字数（バックエンド仕様） */
export const COMMIT_MESSAGE_MAX_LENGTH = 500;

/**
 * コミットメッセージを検証する。
 * @returns エラーメッセージ。問題なければ null
 */
export function validateCommitMessage(message: string): string | null {
  const trimmed = message.trim();
  if (trimmed.length === 0) return 'メッセージを入力してください';
  if (trimmed.length > COMMIT_MESSAGE_MAX_LENGTH) {
    return `メッセージは${COMMIT_MESSAGE_MAX_LENGTH}文字以内で入力してください`;
  }
  return null;
}

/** 変更エントリの件数（文字数や行数ではない） */
export interface ChangeCounts {
  added: number;
  modified: number;
  removed: number;
}

/**
 * 変更エントリ件数の合計
 */
export function totalChangeCount(counts: ChangeCounts): number {
  return counts.added + counts.modified + counts.removed;
}

/**
 * 変更エントリ件数を「追加 2件・変更 1件」のような表示文字列にする。
 * 0 件の種別は省略し、すべて 0 なら「変更なし」を返す。
 *
 * 件数はエントリ（変更対象）の数であり、文字数や行数ではない。
 */
export function formatChangeCounts(counts: ChangeCounts): string {
  const parts: string[] = [];
  if (counts.added > 0) parts.push(`追加 ${counts.added}件`);
  if (counts.modified > 0) parts.push(`変更 ${counts.modified}件`);
  if (counts.removed > 0) parts.push(`削除 ${counts.removed}件`);
  return parts.length === 0 ? '変更なし' : parts.join('・');
}

/** 行差分の入力（op と本文のみ） */
export interface DiffLineInput {
  op: DiffLineOpValue;
  text: string;
}

/**
 * 差分ビューに描画する 1 行。
 * `gap` は変更箇所から離れた変更なし行を折りたたんだプレースホルダ。
 */
export type DiffRow =
  | {
      kind: 'line';
      op: DiffLineOpValue;
      text: string;
      /** 変更前の行番号（追加行は null） */
      oldLineNumber: number | null;
      /** 変更後の行番号（削除行は null） */
      newLineNumber: number | null;
    }
  | { kind: 'gap'; hiddenCount: number };

/**
 * 行差分に行番号を振り、変更箇所から離れた変更なし行を折りたたむ。
 *
 * 変更行が 1 つも無い場合は折りたたまず全行を返す。
 *
 * @param lines - バックエンドが計算済みの行差分
 * @param contextLines - 変更行の前後に残す変更なし行の数
 */
export function buildDiffRows(
  lines: readonly DiffLineInput[],
  contextLines = 3,
): DiffRow[] {
  const numbered = numberDiffLines(lines);
  const hasChange = lines.some((line) => line.op !== 'eq');
  if (!hasChange) {
    return numbered.map((line) => ({ kind: 'line', ...line }));
  }

  const keep = markKeptLines(lines, Math.max(0, contextLines));

  const rows: DiffRow[] = [];
  let hiddenCount = 0;
  for (let i = 0; i < numbered.length; i++) {
    if (keep[i]) {
      if (hiddenCount > 0) {
        rows.push({ kind: 'gap', hiddenCount });
        hiddenCount = 0;
      }
      rows.push({ kind: 'line', ...numbered[i] });
    } else {
      hiddenCount++;
    }
  }
  if (hiddenCount > 0) rows.push({ kind: 'gap', hiddenCount });
  return rows;
}

interface NumberedDiffLine extends DiffLineInput {
  oldLineNumber: number | null;
  newLineNumber: number | null;
}

function numberDiffLines(lines: readonly DiffLineInput[]): NumberedDiffLine[] {
  let oldLine = 0;
  let newLine = 0;
  return lines.map((line) => {
    // eq は両方、del は変更前のみ、add は変更後のみ行番号を進める
    const oldLineNumber = line.op === 'add' ? null : ++oldLine;
    const newLineNumber = line.op === 'del' ? null : ++newLine;
    return { op: line.op, text: line.text, oldLineNumber, newLineNumber };
  });
}

function markKeptLines(
  lines: readonly DiffLineInput[],
  contextLines: number,
): boolean[] {
  const keep = lines.map(() => false);
  lines.forEach((line, index) => {
    if (line.op === 'eq') return;
    const from = Math.max(0, index - contextLines);
    const to = Math.min(lines.length - 1, index + contextLines);
    for (let i = from; i <= to; i++) keep[i] = true;
  });
  return keep;
}

/**
 * 行差分に含まれる追加行 / 削除行の数を数える
 */
export function countDiffLineOps(lines: readonly DiffLineInput[]): {
  added: number;
  removed: number;
} {
  let added = 0;
  let removed = 0;
  for (const line of lines) {
    if (line.op === 'add') added++;
    else if (line.op === 'del') removed++;
  }
  return { added, removed };
}

/** 同じ日付でまとめたグループ */
export interface DateGroup<T> {
  /** ローカルタイムゾーンでの `YYYY-MM-DD` */
  key: string;
  items: T[];
}

/**
 * 並び順を保ったまま、連続する同じ日付の要素をグループ化する。
 *
 * コミット履歴は新しい順で返るため、連続グループ化で日付見出しが作れる。
 * 並べ替えは行わない（入力順を尊重する）。
 */
export function groupByDay<T>(
  items: readonly T[],
  getDate: (item: T) => Date,
): DateGroup<T>[] {
  const groups: DateGroup<T>[] = [];
  for (const item of items) {
    const key = toLocalDateKey(getDate(item));
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(item);
    } else {
      groups.push({ key, items: [item] });
    }
  }
  return groups;
}

/**
 * Date をローカルタイムゾーンの `YYYY-MM-DD` 文字列にする
 */
export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}
