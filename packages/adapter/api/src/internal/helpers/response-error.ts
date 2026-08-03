import { ResponseError } from '@tsumugi-chan/client';

/**
 * 生成クライアントが投げたエラーが、指定した HTTP ステータスのレスポンスエラーかどうかを判定する。
 *
 * ネットワークエラー（`FetchError`）やパラメータ不足（`RequiredError`）を
 * 誤って握り潰さないために、`catch` では必ずこの判定を通すこと。
 */
export function isResponseErrorWithStatus(
  error: unknown,
  status: number,
): boolean {
  return error instanceof ResponseError && error.response.status === status;
}

/**
 * 404 Not Found かどうか（`getXxx()` が null を返すべきケース）
 */
export function isNotFoundError(error: unknown): boolean {
  return isResponseErrorWithStatus(error, 404);
}

/**
 * 409 Conflict かどうか
 *
 * バージョン管理では 409 が正常系として返る箇所があるため、
 * 呼び出し側で専用のドメインエラーに変換する。
 */
export function isConflictError(error: unknown): boolean {
  return isResponseErrorWithStatus(error, 409);
}
