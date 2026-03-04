const FULLWIDTH_SPACE = '\u3000';

export const DEFAULT_NO_INDENT_MARKERS: readonly string[] = ['「', '『'];

export interface FormatOptions {
  /** 段落先頭に全角スペースを追加する */
  autoIndent: boolean;
  /** 会話文（「」『』で始まる行）を字下げ対象外にする */
  skipDialogueIndent: boolean;
  /** 会話文の判定に使うマーカー（skipDialogueIndent が true のとき使用） */
  noIndentMarkers: readonly string[];
}

export const DEFAULT_FORMAT_OPTIONS: FormatOptions = {
  autoIndent: true,
  skipDialogueIndent: true,
  noIndentMarkers: DEFAULT_NO_INDENT_MARKERS,
};

export interface FormatResult {
  text: string;
  cursorPosition: number;
}

/**
 * 行の内容（インデントを除いた本文）に対して、一字下げが必要かを判定する。
 * - 空行には不要
 * - noIndentMarkers のいずれかで始まる行には不要
 * - それ以外は必要
 */
export function shouldIndentLine(
  lineContent: string,
  noIndentMarkers: readonly string[],
): boolean {
  if (lineContent.length === 0) return false;
  return !noIndentMarkers.some((m) => lineContent.startsWith(m));
}

/**
 * 行テキストからインデント（先頭の全角スペース）を除いた本文を返す。
 */
export function stripIndent(line: string): string {
  return line.startsWith(FULLWIDTH_SPACE)
    ? line.slice(FULLWIDTH_SPACE.length)
    : line;
}

/**
 * テキスト全体にフォーマットを適用する。
 * autoIndent が true のとき、各段落先頭に全角スペースを追加する。
 * skipDialogueIndent が true のとき、会話文は字下げ対象外にする。
 * カーソル位置も補正して返す。
 */
export function formatWritingText(
  text: string,
  cursorPosition: number,
  options: Partial<FormatOptions> = {},
): FormatResult {
  const opts: FormatOptions = { ...DEFAULT_FORMAT_OPTIONS, ...options };

  if (!opts.autoIndent) {
    return { text, cursorPosition };
  }

  const noIndentMarkers = opts.skipDialogueIndent ? opts.noIndentMarkers : [];

  const lines = text.split('\n');
  let newCursor = cursorPosition;
  let offset = 0;

  const normalized = lines.map((line) => {
    const lineStart = offset;
    offset += line.length + 1; // +1 for '\n'

    const content = stripIndent(line);
    const hadIndent = line.startsWith(FULLWIDTH_SPACE);
    const needsIndent = shouldIndentLine(content, noIndentMarkers);

    if (needsIndent && !hadIndent) {
      if (cursorPosition > lineStart) {
        newCursor += FULLWIDTH_SPACE.length;
      }
      return FULLWIDTH_SPACE + content;
    }

    if (!needsIndent && hadIndent) {
      if (cursorPosition > lineStart) {
        newCursor = Math.max(lineStart, newCursor - FULLWIDTH_SPACE.length);
      }
      return content;
    }

    return line;
  });

  return { text: normalized.join('\n'), cursorPosition: newCursor };
}
