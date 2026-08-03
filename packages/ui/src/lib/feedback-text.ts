/** 制御文字（Unicode カテゴリ Cc） */
const CONTROL_CHARS_GLOBAL = /\p{Cc}/gu;

/**
 * フィードバック本文を正規化する。
 *
 * `String.trim()` は C0 制御文字を落とさないため、制御文字だけの入力を
 * 「入力あり」と誤判定しないよう、改行以外の制御文字を除去する。
 *
 * 送信値をアダプター側の正規化結果と一致させる意図もある
 * （最終的な検証は adapter-api 側が改めて行うため、ここは UI のガード）。
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
 * 文字数をコードポイント数で数える。
 *
 * サーバーはルーン単位で数えるため、サロゲートペア（絵文字など）を2文字として扱う
 * `String.length` では実際より厳しくなってしまう。
 */
export function countChars(value: string): number {
  return [...value].length;
}
