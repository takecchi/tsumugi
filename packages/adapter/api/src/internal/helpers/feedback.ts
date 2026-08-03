import type {
  CreateProductSignalRequest,
  ProductSignal as ApiProductSignal,
} from '@tsumugi-chan/client';
import type { CreateFeedbackData, ProductSignal } from '@tsumugi/adapter';

/**
 * `surface` の最大文字数（サーバー制約）
 */
export const FEEDBACK_SURFACE_MAX_LENGTH = 64;

/**
 * `summary` としてサーバーが受け付ける最大文字数
 *
 * ただし実際に保存・返却されるのは **280文字**まで（超過分は切り詰められて失われる）。
 * そのため入力欄の上限にこの値を使わないこと。入力側の上限は
 * `packages/ui` の `FEEDBACK_MAX_LENGTH` が持つ。
 */
export const FEEDBACK_SUMMARY_MAX_LENGTH = 2000;

/** 制御文字（Unicode カテゴリ Cc）。改行・タブも含む */
const CONTROL_CHARS_GLOBAL = /\p{Cc}/gu;

/** 制御文字の有無判定用（`test()` は lastIndex を持たない非グローバル版を使う） */
const CONTROL_CHAR = /\p{Cc}/u;

/** 空白文字の有無判定用 */
const WHITESPACE = /\s/u;

/**
 * 文字数を「コードポイント数」で数える。
 *
 * サーバーはルーン単位で数えるため、サロゲートペア（絵文字など）を2文字として扱う
 * `String.length` では実際より厳しく弾いてしまう。
 */
export function countChars(value: string): number {
  return [...value].length;
}

/**
 * 本文を正規化する（ピュア）
 *
 * - CRLF / CR を LF に統一する
 * - 改行以外の制御文字を除去する（空白・制御文字のみの送信はサーバー側で500になり得るため）
 * - 前後の空白を落とす
 */
export function normalizeFeedbackText(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(CONTROL_CHARS_GLOBAL, ''))
    .join('\n')
    .trim();
}

/**
 * `surface` を正規化する（ピュア）
 *
 * 集計軸なので前後の空白を落とすだけに留め、内部に空白・制御文字が入っている場合は
 * 呼び出し側のバグとして検証で弾く（黙って繋げない）。
 */
export function normalizeSurface(value: string): string {
  return value.trim();
}

/**
 * フィードバック送信データを検証し、API リクエストに変換する（ピュア）
 *
 * 戻り値の型を生成クライアントの {@link CreateProductSignalRequest} にすることで、
 * `kind` / `evidence` が混入しないことを型で保証する
 * （サーバーが whitelist 検証しているため、含めると無視ではなく 400 になる）。
 *
 * @throws 検証に失敗した場合（trim後の空文字・文字数超過・surface の空白/制御文字）
 */
export function toCreateProductSignalRequest(
  data: CreateFeedbackData,
): CreateProductSignalRequest {
  const surface = normalizeSurface(data.surface);
  const summary = normalizeFeedbackText(data.summary);

  if (surface.length === 0) {
    throw new Error('feedback: surface は必須です');
  }
  if (countChars(surface) > FEEDBACK_SURFACE_MAX_LENGTH) {
    throw new Error(
      `feedback: surface は${FEEDBACK_SURFACE_MAX_LENGTH}文字以内にしてください`,
    );
  }
  if (WHITESPACE.test(surface) || CONTROL_CHAR.test(surface)) {
    throw new Error(
      'feedback: surface に空白・制御文字を含めることはできません',
    );
  }
  if (summary.length === 0) {
    throw new Error('feedback: 内容を入力してください');
  }
  if (countChars(summary) > FEEDBACK_SUMMARY_MAX_LENGTH) {
    throw new Error(
      `feedback: 内容は${FEEDBACK_SUMMARY_MAX_LENGTH}文字以内にしてください`,
    );
  }

  return { surface, summary };
}

/**
 * API レスポンスをドメイン型に変換する
 */
export function toProductSignal(api: ApiProductSignal): ProductSignal {
  return {
    id: api.id,
    kind: api.kind,
    surface: api.surface,
    summary: api.summary,
    occurredAt: api.occurredAt,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
  };
}
