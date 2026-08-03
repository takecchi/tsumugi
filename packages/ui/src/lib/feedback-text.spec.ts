import { countChars, normalizeFeedbackText } from './feedback-text';

describe('countChars', () => {
  it('BMP内の文字はそのまま数える', () => {
    expect(countChars('あいうえお')).toBe(5);
  });

  it('サロゲートペア（絵文字）を1文字として数える', () => {
    expect('🎉'.length).toBe(2);
    expect(countChars('🎉')).toBe(1);
  });

  it('空文字は0', () => {
    expect(countChars('')).toBe(0);
  });
});

describe('normalizeFeedbackText', () => {
  it('前後の空白を落とす', () => {
    expect(normalizeFeedbackText('  要望です  ')).toBe('要望です');
  });

  it('CRLF / CR を LF に統一する', () => {
    expect(normalizeFeedbackText('1行目\r\n2行目\r3行目')).toBe(
      '1行目\n2行目\n3行目',
    );
  });

  it('改行は保持する', () => {
    expect(normalizeFeedbackText('1行目\n2行目')).toBe('1行目\n2行目');
  });

  it('改行以外の制御文字を除去しつつ改行は残す', () => {
    const input = `a${String.fromCharCode(0)}b\nc\td`;
    expect(normalizeFeedbackText(input)).toBe('ab\ncd');
  });

  it('空白のみの入力は空文字になる', () => {
    expect(normalizeFeedbackText('   \n\t  ')).toBe('');
  });

  it('制御文字のみの入力は空文字になる（trim では落ちないため）', () => {
    const onlyControls = `${String.fromCharCode(0)}${String.fromCharCode(7)}`;
    // String.trim() では落ちないことを明示
    expect(onlyControls.trim()).not.toBe('');
    expect(normalizeFeedbackText(onlyControls)).toBe('');
  });
});
