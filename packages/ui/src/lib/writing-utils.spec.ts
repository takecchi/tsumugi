import {
  shouldIndent,
  stripIndent,
  normalizeIndent,
  applyAutoIndentOnEnter,
  DEFAULT_NO_INDENT_MARKERS,
} from './writing-utils';

describe('shouldIndent', () => {
  it('通常のテキストには true を返す', () => {
    expect(shouldIndent('本文のテキスト')).toBe(true);
  });

  it('空文字列には false を返す（空行にインデントは不要）', () => {
    expect(shouldIndent('')).toBe(false);
  });

  it('「で始まる行（会話文）には false を返す', () => {
    expect(shouldIndent('「こんにちは」')).toBe(false);
  });

  it('『で始まる行（二重括弧）には false を返す', () => {
    expect(shouldIndent('『心の声』')).toBe(false);
  });

  it('半角スペースで始まる行には true を返す', () => {
    expect(shouldIndent(' テキスト')).toBe(true);
  });

  describe('カスタム noIndentMarkers', () => {
    it('指定したマーカーで始まる行には false を返す', () => {
      expect(shouldIndent('（註釈）', ['（'])).toBe(false);
    });

    it('指定していないマーカーで始まる行には true を返す', () => {
      expect(shouldIndent('「こんにちは」', ['（'])).toBe(true);
    });

    it('空配列を渡すとすべての行で true を返す', () => {
      expect(shouldIndent('「こんにちは」', [])).toBe(true);
    });
  });

  it('DEFAULT_NO_INDENT_MARKERS に「と『が含まれる', () => {
    expect(DEFAULT_NO_INDENT_MARKERS).toContain('「');
    expect(DEFAULT_NO_INDENT_MARKERS).toContain('『');
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

describe('normalizeIndent', () => {
  const SP = '\u3000';

  it('インデントのない地の文に全角スペースを追加する', () => {
    const result = normalizeIndent('本文テキスト', 0);
    expect(result.text).toBe(`${SP}本文テキスト`);
  });

  it('既にインデントがある地の文はそのまま', () => {
    const result = normalizeIndent(`${SP}本文テキスト`, 0);
    expect(result.text).toBe(`${SP}本文テキスト`);
  });

  it('会話文（「始まり）のインデントを除去する', () => {
    const result = normalizeIndent(`${SP}「こんにちは」`, 0);
    expect(result.text).toBe('「こんにちは」');
  });

  it('『始まりの会話文のインデントも除去する', () => {
    const result = normalizeIndent(`${SP}『心の声』`, 0);
    expect(result.text).toBe('『心の声』');
  });

  it('空配列を渡すと全行インデントする', () => {
    const result = normalizeIndent(`「こんにちは」`, 0, []);
    expect(result.text).toBe(`${SP}「こんにちは」`);
  });

  it('空行にはインデントを追加しない', () => {
    const result = normalizeIndent('', 0);
    expect(result.text).toBe('');
  });

  it('複数行を正規化する', () => {
    const text = `本文\n「セリフ」\n続き`;
    const result = normalizeIndent(text, 0);
    expect(result.text).toBe(`${SP}本文\n「セリフ」\n${SP}続き`);
  });

  it('会話文に手動で付けたインデントを除去する', () => {
    const text = `${SP}「こんにちは」`;
    const result = normalizeIndent(text, 0);
    expect(result.text).toBe('「こんにちは」');
  });

  it('カーソル位置をインデント追加に合わせて補正する', () => {
    // "本文" の後ろにカーソル → インデント追加で +1
    const result = normalizeIndent('本文テキスト', 2);
    expect(result.cursorPosition).toBe(3);
  });

  it('カーソルが行頭の場合はインデント追加で補正しない', () => {
    const result = normalizeIndent('本文\nテキスト', 3); // 2行目の行頭
    expect(result.cursorPosition).toBe(4); // インデント追加で +1
  });

  it('カーソル位置をインデント除去に合わせて補正する', () => {
    const text = `${SP}「こんにちは」`;
    // カーソルが「の位置（offset 1）
    const result = normalizeIndent(text, 1);
    expect(result.cursorPosition).toBe(0);
  });

});

describe('applyAutoIndentOnEnter', () => {
  const SP = '\u3000';

  it('改行時に全行を正規化する（地の文にインデント追加）', () => {
    // "一行目" はインデントなし → 追加される
    // 改行後の "二行目" もインデントなし → 追加される
    const text = '一行目\n二行目';
    const cursor = 4; // 改行の直後（「二行目」の先頭）
    const result = applyAutoIndentOnEnter(text, cursor, cursor);

    expect(result).not.toBeNull();
    expect(result?.text).toBe(`${SP}一行目\n\n${SP}二行目`);
  });

  it('カーソルが行の途中にある場合、後半部分にもインデントを付与する', () => {
    const text = `${SP}本文テキスト`;
    // eslint-disable-next-line no-irregular-whitespace
    const cursor = 3; // 「　本文」の後
    const result = applyAutoIndentOnEnter(text, cursor, cursor);

    expect(result).not.toBeNull();
    expect(result?.text).toBe(`${SP}本文\n${SP}テキスト`);
  });

  it('改行後のテキストが「で始まる場合、会話文のインデントは付かない', () => {
    const text = `${SP}地の文「セリフ」`;
    // eslint-disable-next-line no-irregular-whitespace
    const cursor = 4; // 「　地の文」の後、次は「
    const result = applyAutoIndentOnEnter(text, cursor, cursor);

    expect(result).not.toBeNull();
    expect(result?.text).toBe(`${SP}地の文\n「セリフ」`);
  });

  it('テキスト末尾で改行する場合、新しい行にインデントが入る', () => {
    const text = `${SP}本文テキスト`;
    const cursor = 7; // テキスト末尾
    const result = applyAutoIndentOnEnter(text, cursor, cursor);

    expect(result).not.toBeNull();
    expect(result?.text).toBe(`${SP}本文テキスト\n${SP}`);
    // eslint-disable-next-line no-irregular-whitespace
    expect(result?.cursorPosition).toBe(9); // 「　本文テキスト\n　」の後
  });

  it('行末（次の行がある場合）で改行すると、空行にインデントが入る', () => {
    const text = `${SP}一行目\n${SP}二行目`;
    // eslint-disable-next-line no-irregular-whitespace
    const cursor = 4; // 「　一行目」の後（\nの前）
    const result = applyAutoIndentOnEnter(text, cursor, cursor);

    expect(result).not.toBeNull();
    expect(result?.text).toBe(`${SP}一行目\n${SP}\n${SP}二行目`);
    // eslint-disable-next-line no-irregular-whitespace
    expect(result?.cursorPosition).toBe(6); // 「　一行目\n　」の後
  });

  it('選択範囲がある場合は null を返す', () => {
    const text = '本文テキスト';
    const result = applyAutoIndentOnEnter(text, 0, 3);

    expect(result).toBeNull();
  });

  it('noIndentMarkers を空配列にすると全行インデントする', () => {
    const text = `${SP}地の文「セリフ」`;
    const cursor = 4;
    const result = applyAutoIndentOnEnter(text, cursor, cursor, []);

    expect(result).not.toBeNull();
    expect(result?.text).toBe(`${SP}地の文\n${SP}「セリフ」`);
  });
});
