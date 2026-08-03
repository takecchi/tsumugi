import type { ProductSignal as ApiProductSignal } from '@tsumugi-chan/client';
import type { CreateFeedbackData } from '@tsumugi/adapter';
import {
  FEEDBACK_SUMMARY_MAX_LENGTH,
  FEEDBACK_SURFACE_MAX_LENGTH,
  countChars,
  normalizeFeedbackText,
  normalizeSurface,
  toCreateProductSignalRequest,
  toProductSignal,
} from './feedback';

describe('countChars', () => {
  it('BMP内の文字はそのまま数える', () => {
    expect(countChars('あいうえお')).toBe(5);
  });

  it('サロゲートペア（絵文字）を1文字として数える', () => {
    // String.length では 2 になる
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

  it('改行以外の制御文字を除去する', () => {
    const withControls = `a${String.fromCharCode(0)}b${String.fromCharCode(7)}c\td`;
    expect(normalizeFeedbackText(withControls)).toBe('abcd');
  });

  it('空白のみの入力は空文字になる', () => {
    expect(normalizeFeedbackText('   \n\t  ')).toBe('');
  });

  it('制御文字のみの入力は空文字になる', () => {
    const onlyControls = `${String.fromCharCode(0)}${String.fromCharCode(1)}`;
    expect(normalizeFeedbackText(onlyControls)).toBe('');
  });
});

describe('normalizeSurface', () => {
  it('前後の空白を落とす', () => {
    expect(normalizeSurface('  ai.chat  ')).toBe('ai.chat');
  });

  it('内部の空白は残す（検証側で弾くため黙って繋げない）', () => {
    expect(normalizeSurface('ai chat')).toBe('ai chat');
  });
});

describe('toCreateProductSignalRequest', () => {
  it('surface と summary のみを持つオブジェクトを返す', () => {
    const request = toCreateProductSignalRequest({
      surface: 'ai.chat',
      summary: 'チャットが遅いです',
    });

    expect(request).toEqual({
      surface: 'ai.chat',
      summary: 'チャットが遅いです',
    });
  });

  it('kind / evidence を含まない（含めると400になるため）', () => {
    // 余分なフィールドを持つオブジェクトを作る。
    // 変数に代入してから返すことで、余剰プロパティチェックを通さずに
    // 「実行時に余分なフィールドを持つ入力」を構造的に再現する（キャスト不要）。
    const buildDataWithExtraFields = (): CreateFeedbackData => {
      const withExtras = {
        surface: 'plots.create',
        summary: 'プロット作成が使いにくい',
        kind: 'friction',
        evidence: ['作品本文が混入したエビデンス'],
      };
      return withExtras;
    };

    const request = toCreateProductSignalRequest(buildDataWithExtraFields());

    // スプレッドで組み立てる実装（`{ ...data, surface, summary }`）だと
    // ここで kind / evidence が漏れて落ちる
    expect(Object.keys(request).sort()).toEqual(['summary', 'surface']);
    expect(request).toEqual({
      surface: 'plots.create',
      summary: 'プロット作成が使いにくい',
    });
  });

  it('正規化された値を送る', () => {
    const request = toCreateProductSignalRequest({
      surface: '  ai.chat  ',
      summary: '  要望です\r\nもう一つ  ',
    });

    expect(request.surface).toBe('ai.chat');
    expect(request.summary).toBe('要望です\nもう一つ');
  });

  it('surface が空なら例外', () => {
    expect(() =>
      toCreateProductSignalRequest({ surface: '   ', summary: '要望' }),
    ).toThrow('surface は必須です');
  });

  it(`surface が${FEEDBACK_SURFACE_MAX_LENGTH}文字を超えると例外`, () => {
    const surface = 'a'.repeat(FEEDBACK_SURFACE_MAX_LENGTH + 1);
    expect(() =>
      toCreateProductSignalRequest({ surface, summary: '要望' }),
    ).toThrow(`${FEEDBACK_SURFACE_MAX_LENGTH}文字以内`);
  });

  it(`surface が${FEEDBACK_SURFACE_MAX_LENGTH}文字ちょうどなら通る`, () => {
    const surface = 'a'.repeat(FEEDBACK_SURFACE_MAX_LENGTH);
    expect(
      toCreateProductSignalRequest({ surface, summary: '要望' }).surface,
    ).toBe(surface);
  });

  it('surface に空白が含まれると例外', () => {
    expect(() =>
      toCreateProductSignalRequest({ surface: 'ai chat', summary: '要望' }),
    ).toThrow('空白・制御文字');
  });

  it('surface に制御文字が含まれると例外', () => {
    expect(() =>
      toCreateProductSignalRequest({
        surface: `ai${String.fromCharCode(0)}chat`,
        summary: '要望',
      }),
    ).toThrow('空白・制御文字');
  });

  it('summary が空白のみなら例外（サーバー側で500になり得るため）', () => {
    expect(() =>
      toCreateProductSignalRequest({ surface: 'ai.chat', summary: '   \n  ' }),
    ).toThrow('内容を入力してください');
  });

  it('summary が制御文字のみなら例外', () => {
    expect(() =>
      toCreateProductSignalRequest({
        surface: 'ai.chat',
        summary: `${String.fromCharCode(0)}${String.fromCharCode(7)}`,
      }),
    ).toThrow('内容を入力してください');
  });

  it(`summary が${FEEDBACK_SUMMARY_MAX_LENGTH}文字を超えると例外`, () => {
    const summary = 'あ'.repeat(FEEDBACK_SUMMARY_MAX_LENGTH + 1);
    expect(() =>
      toCreateProductSignalRequest({ surface: 'ai.chat', summary }),
    ).toThrow(`${FEEDBACK_SUMMARY_MAX_LENGTH}文字以内`);
  });

  it(`summary が${FEEDBACK_SUMMARY_MAX_LENGTH}文字ちょうどなら通る`, () => {
    const summary = 'あ'.repeat(FEEDBACK_SUMMARY_MAX_LENGTH);
    expect(
      toCreateProductSignalRequest({ surface: 'ai.chat', summary }).summary,
    ).toBe(summary);
  });

  it('絵文字はコードポイント単位で数えるため上限ちょうどでも通る', () => {
    const summary = '🎉'.repeat(FEEDBACK_SUMMARY_MAX_LENGTH);
    // String.length では上限の2倍だが、ルーン数では上限ちょうど
    expect(summary.length).toBe(FEEDBACK_SUMMARY_MAX_LENGTH * 2);
    expect(() =>
      toCreateProductSignalRequest({ surface: 'ai.chat', summary }),
    ).not.toThrow();
  });
});

describe('toProductSignal', () => {
  it('APIレスポンスをドメイン型に変換する', () => {
    const api: ApiProductSignal = {
      id: 'ps_1',
      createdAt: new Date('2026-08-04T00:00:00Z'),
      updatedAt: new Date('2026-08-04T00:00:01Z'),
      kind: 'explicit_request',
      surface: 'ai.chat',
      summary: '要約済みの内容',
      occurredAt: new Date('2026-08-03T23:59:59Z'),
    };

    expect(toProductSignal(api)).toEqual({
      id: 'ps_1',
      kind: 'explicit_request',
      surface: 'ai.chat',
      summary: '要約済みの内容',
      occurredAt: new Date('2026-08-03T23:59:59Z'),
      createdAt: new Date('2026-08-04T00:00:00Z'),
      updatedAt: new Date('2026-08-04T00:00:01Z'),
    });
  });
});
