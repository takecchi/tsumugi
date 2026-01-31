/**
 * LLM が変更のないフィールドも送ってきた場合に、現在値と同じフィールドを除外する
 */
export function filterUnchangedFields(data: Record<string, unknown>, current: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== current[key]) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * 変更差分と元値を一括で算出する。変更がなければ null を返す。
 */
export function diffFields(
  data: Record<string, unknown>,
  current: Record<string, unknown>,
): { changed: Record<string, unknown>; original: Record<string, unknown> } | null {
  const changed = filterUnchangedFields(data, current);
  if (Object.keys(changed).length === 0) return null;
  const original: Record<string, unknown> = {};
  for (const key of Object.keys(changed)) {
    original[key] = current[key];
  }
  return { changed, original };
}

/**
 * Record<string, unknown> の各値を { type: 'replace', value } に変換する
 */
export function toReplaceFields(data: Record<string, unknown>): Record<string, { type: 'replace'; value: unknown }> {
  const result: Record<string, { type: 'replace'; value: unknown }> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      result[key] = { type: 'replace', value };
    }
  }
  return result;
}
