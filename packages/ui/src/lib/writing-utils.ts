const FULLWIDTH_SPACE = '\u3000';

export const DEFAULT_NO_INDENT_MARKERS: readonly string[] = ['「', '『'];

/**
 * 行の内容（インデントを除いた本文）に対して、一字下げが必要かを判定する。
 * - 空行には不要
 * - noIndentMarkers のいずれかで始まる行には不要
 * - それ以外は必要
 */
export function shouldIndent(
  lineContent: string,
  noIndentMarkers: readonly string[] = DEFAULT_NO_INDENT_MARKERS,
): boolean {
  if (lineContent.length === 0) return false;
  if (noIndentMarkers.some((m) => lineContent.startsWith(m))) return false;
  return true;
}

/**
 * 行テキストからインデント（先頭の全角スペース）を除いた本文を返す。
 */
export function stripIndent(line: string): string {
  return line.startsWith(FULLWIDTH_SPACE) ? line.slice(FULLWIDTH_SPACE.length) : line;
}

/**
 * テキスト全体のインデントを正規化する。
 * 各行に対して shouldIndent で判定し、インデントを自動付与・自動除去する。
 * カーソル位置も補正して返す。
 */
export function normalizeIndent(
  text: string,
  cursorPosition: number,
  noIndentMarkers: readonly string[] = DEFAULT_NO_INDENT_MARKERS,
): { text: string; cursorPosition: number } {
  const lines = text.split('\n');
  let newCursor = cursorPosition;
  let offset = 0; // 現在の行の開始位置（元テキスト上）

  const normalized = lines.map((line) => {
    const lineStart = offset;
    offset += line.length + 1; // +1 for '\n'

    const content = stripIndent(line);
    const hadIndent = line.startsWith(FULLWIDTH_SPACE);
    const needsIndent = shouldIndent(content, noIndentMarkers);

    if (needsIndent && !hadIndent) {
      // インデントを追加
      if (cursorPosition > lineStart) {
        newCursor += FULLWIDTH_SPACE.length;
      }
      return FULLWIDTH_SPACE + content;
    }

    if (!needsIndent && hadIndent) {
      // インデントを除去
      if (cursorPosition > lineStart) {
        newCursor = Math.max(lineStart, newCursor - FULLWIDTH_SPACE.length);
      }
      return content;
    }

    return line;
  });

  return { text: normalized.join('\n'), cursorPosition: newCursor };
}

/**
 * textarea の Enter キー押下時に改行を挿入し、インデントを正規化した結果を返す。
 *
 * @returns 変換後のテキストと新しいカーソル位置。null の場合はデフォルト動作に任せる。
 */
export function applyAutoIndentOnEnter(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  noIndentMarkers: readonly string[] = DEFAULT_NO_INDENT_MARKERS,
): { text: string; cursorPosition: number } | null {
  // 選択範囲がある場合はデフォルト動作に任せる
  if (selectionStart !== selectionEnd) return null;

  const before = text.slice(0, selectionStart);
  const after = text.slice(selectionStart);
  const withNewline = before + '\n' + after;
  const cursorAfterNewline = selectionStart + 1;

  const result = normalizeIndent(withNewline, cursorAfterNewline, noIndentMarkers);

  // カーソルがある行が空行なら、インデント用の全角スペースを挿入する
  const lines = result.text.split('\n');
  let pos = 0;
  for (let i = 0; i < lines.length; i++) {
    const lineStart = pos;
    pos += lines[i].length + 1;
    if (result.cursorPosition >= lineStart && result.cursorPosition < pos) {
      if (lines[i].length === 0) {
        lines[i] = FULLWIDTH_SPACE;
        return {
          text: lines.join('\n'),
          cursorPosition: result.cursorPosition + FULLWIDTH_SPACE.length,
        };
      }
      break;
    }
  }

  return result;
}
