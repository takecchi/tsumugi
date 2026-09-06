/**
 * 未保存の編集内容（フィールド名 → 入力値）。
 *
 * エディタはサーバから取得した値をそのまま描画しているため、保存が終わる前に
 * 再フェッチが挟まると入力中のテキストがサーバ側の古い値へ巻き戻る。
 * 保存が確定するまでの入力をここに保持し、描画時にサーバ値へ重ねることで防ぐ。
 */
export type FieldDrafts = Record<string, unknown>;

/**
 * 下書きの値が等しいか判定する。
 * タグのような配列フィールドは要素単位で比較する（参照比較では常に不一致になるため）。
 */
function isSameDraftValue(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((value, i) => value === b[i]);
  }
  return a === b;
}

/**
 * サーバ値に未保存の編集を重ねた、画面に表示する値を作る。
 *
 * 編集中のフィールドだけローカルの入力が勝ち、
 * 編集していないフィールドはサーバ値がそのまま反映される（他端末の更新も届く）。
 * @param data - サーバ由来の値
 * @param drafts - 未保存の編集内容
 */
export function applyFieldDrafts<T extends object>(
  data: T,
  drafts: FieldDrafts,
): T {
  if (Object.keys(drafts).length === 0) return data;
  return Object.assign({}, data, drafts);
}

/**
 * 保存できたフィールドを未保存の一覧から外す。
 *
 * 保存リクエストを投げてから応答が返るまでの間に更に入力されていた場合、
 * その入力はまだサーバに届いていない。下書きを残してサーバ値に負けないようにする。
 * @param drafts - 未保存の編集内容
 * @param field - 保存できたフィールド名
 * @param savedValue - そのフィールドについて実際にサーバへ送った値
 */
export function clearSavedDraft(
  drafts: FieldDrafts,
  field: string,
  savedValue: unknown,
): FieldDrafts {
  if (!(field in drafts)) return drafts;
  if (!isSameDraftValue(drafts[field], savedValue)) return drafts;
  const next = { ...drafts };
  delete next[field];
  return next;
}

const NO_DRAFTS: FieldDrafts = {};

/**
 * 未保存の編集と、それを記録した対象のID。
 *
 * エディタは同じ種別のノード間では再マウントされない（`workspace-editor.tsx` は
 * `id` prop を差し替えるだけ）ため、下書きだけを持つと別ノードへ持ち越してしまう。
 * どのノードの下書きなのかを一緒に持って取り違えを防ぐ。
 */
export interface FieldDraftState {
  /** 下書きを記録した対象のID（ノードID / プロジェクトID） */
  ownerId: string;
  /** 未保存の編集内容 */
  drafts: FieldDrafts;
}

/** 表示中の対象の下書きを取り出す。別の対象へ切り替わっていれば空を返す。 */
export function draftsOf(state: FieldDraftState, ownerId: string): FieldDrafts {
  return state.ownerId === ownerId ? state.drafts : NO_DRAFTS;
}

/** 入力を未保存として記録する */
export function markFieldDraft(
  state: FieldDraftState,
  ownerId: string,
  field: string,
  value: unknown,
): FieldDraftState {
  return {
    ownerId,
    drafts: { ...draftsOf(state, ownerId), [field]: value },
  };
}

/**
 * 保存できた入力を未保存から外す。
 * 保存の往復中に別の対象へ切り替わっていた場合は、今の下書きに手を出さない。
 */
export function releaseFieldDraft(
  state: FieldDraftState,
  ownerId: string,
  field: string,
  savedValue: unknown,
): FieldDraftState {
  if (state.ownerId !== ownerId) return state;
  const drafts = clearSavedDraft(state.drafts, field, savedValue);
  return drafts === state.drafts ? state : { ownerId, drafts };
}
