import type { PaginationParams } from '@tsumugi/adapter';

/** limit の下限 */
const MIN_PAGE_LIMIT = 1;
/** limit の上限（バックエンド仕様） */
const MAX_PAGE_LIMIT = 100;

/**
 * URL から「値が空文字のクエリパラメータ」を取り除く。
 *
 * 生成クライアントは `limit` / `cursor` / `base_commit_id` といった
 * 本来は省略可能なクエリパラメータを必須（`string`）として型付けしている。
 * そのため省略を表現できず、`RequiredError` を避けるには空文字を渡すしかない。
 * 空文字をそのまま送ると `?cursor=` のような無意味なクエリになりバックエンドで
 * 不正なカーソルとして扱われるため、リクエスト直前にここで落とす。
 *
 * 値を持たないパラメータ（`?flag`）は空文字ではないため残す。
 */
export function stripEmptyQueryParams(url: string): string {
  const queryStart = url.indexOf('?');
  if (queryStart === -1) return url;

  const base = url.slice(0, queryStart);
  const rest = url.slice(queryStart + 1);
  const hashStart = rest.indexOf('#');
  const rawQuery = hashStart === -1 ? rest : rest.slice(0, hashStart);
  const hash = hashStart === -1 ? '' : rest.slice(hashStart);

  const kept = rawQuery.split('&').filter((part) => {
    if (part.length === 0) return false;
    const eq = part.indexOf('=');
    // `?flag` のような値なしパラメータは空文字ではないので残す
    if (eq === -1) return true;
    return part.slice(eq + 1).length > 0;
  });

  if (kept.length === 0) return `${base}${hash}`;
  return `${base}?${kept.join('&')}${hash}`;
}

/**
 * 省略可能な文字列クエリパラメータを、生成クライアントが要求する `string` に変換する。
 *
 * 未指定は空文字で表現し、実際のリクエストからは
 * {@link stripEmptyQueryParams} が取り除く。
 */
export function toOptionalQueryValue(value: string | null | undefined): string {
  return value ?? '';
}

/**
 * ページネーションパラメータを、生成クライアントが要求する形（必須の string）に変換する。
 *
 * - `limit` 未指定時は空文字を返し、バックエンドのデフォルト（50）に任せる
 * - `limit` 指定時は整数に丸めた上で 1〜100 にクランプする
 * - `cursor` 未指定時は空文字を返す
 */
export function toPaginationQuery(params: PaginationParams = {}): {
  limit: string;
  cursor: string;
} {
  return {
    limit: toLimitQueryValue(params.limit),
    cursor: toOptionalQueryValue(params.cursor),
  };
}

function toLimitQueryValue(limit: number | undefined): string {
  if (limit === undefined || !Number.isFinite(limit)) return '';
  const clamped = Math.min(
    MAX_PAGE_LIMIT,
    Math.max(MIN_PAGE_LIMIT, Math.trunc(limit)),
  );
  return String(clamped);
}
