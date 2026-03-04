import {
  shouldIndentLine,
  stripIndent,
  formatWritingText,
  DEFAULT_NO_INDENT_MARKERS,
} from './writing-format';

describe('shouldIndentLine', () => {
  it('通常のテキストには true を返す', () => {
    expect(shouldIndentLine('本文のテキスト', DEFAULT_NO_INDENT_MARKERS)).toBe(
      true,
    );
  });

  it('空文字列には false を返す', () => {
    expect(shouldIndentLine('', DEFAULT_NO_INDENT_MARKERS)).toBe(false);
  });

  it('「で始まる行には false を返す', () => {
    expect(shouldIndentLine('「こんにちは」', DEFAULT_NO_INDENT_MARKERS)).toBe(
      false,
    );
  });

  it('『で始まる行には false を返す', () => {
    expect(shouldIndentLine('『心の声』', DEFAULT_NO_INDENT_MARKERS)).toBe(
      false,
    );
  });

  it('空のマーカー配列ではすべての非空行で true を返す', () => {
    expect(shouldIndentLine('「こんにちは」', [])).toBe(true);
  });

  it('カスタムマーカーで判定できる', () => {
    expect(shouldIndentLine('（註釈）', ['（'])).toBe(false);
  });
});

describe('stripIndent', () => {
  it('全角スペースで始まる行からインデントを除去する', () => {
    expect(stripIndent('\u3000本文')).toBe('本文');
  });

  it('全角スペースがない行はそのまま返す', () => {
    expect(stripIndent('本文')).toBe('本文');
  });

  it('空文字列はそのまま返す', () => {
    expect(stripIndent('')).toBe('');
  });
});

describe('formatWritingText', () => {
  const SP = '\u3000';

  it('地の文に全角スペースを追加する', () => {
    const result = formatWritingText('本文テキスト', 0);
    expect(result.text).toBe(`${SP}本文テキスト`);
  });

  it('既にインデントがある地の文はそのまま', () => {
    const result = formatWritingText(`${SP}本文テキスト`, 0);
    expect(result.text).toBe(`${SP}本文テキスト`);
  });

  it('会話文（「始まり）のインデントを除去する', () => {
    const result = formatWritingText(`${SP}「こんにちは」`, 0);
    expect(result.text).toBe('「こんにちは」');
  });

  it('空行にはインデントを追加しない', () => {
    const result = formatWritingText('', 0);
    expect(result.text).toBe('');
  });

  it('複数行を正規化する', () => {
    const text = `本文\n「セリフ」\n続き`;
    const result = formatWritingText(text, 0);
    expect(result.text).toBe(`${SP}本文\n「セリフ」\n${SP}続き`);
  });

  it('カーソル位置をインデント追加に合わせて補正する', () => {
    const result = formatWritingText('本文テキスト', 2);
    expect(result.cursorPosition).toBe(3);
  });

  it('カーソル位置をインデント除去に合わせて補正する', () => {
    const result = formatWritingText(`${SP}「こんにちは」`, 1);
    expect(result.cursorPosition).toBe(0);
  });

  describe('autoIndent: false', () => {
    it('何も変更しない', () => {
      const text = '本文テキスト';
      const result = formatWritingText(text, 2, { autoIndent: false });
      expect(result.text).toBe(text);
      expect(result.cursorPosition).toBe(2);
    });
  });

  describe('skipDialogueIndent: false', () => {
    it('会話文も字下げ対象にする', () => {
      const text = '「こんにちは」';
      const result = formatWritingText(text, 0, {
        skipDialogueIndent: false,
      });
      expect(result.text).toBe(`${SP}「こんにちは」`);
    });

    it('既にインデント付きの会話文はそのまま', () => {
      const text = `${SP}「こんにちは」`;
      const result = formatWritingText(text, 0, {
        skipDialogueIndent: false,
      });
      expect(result.text).toBe(`${SP}「こんにちは」`);
    });
  });
});
