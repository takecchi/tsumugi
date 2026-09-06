import { useCallback, useState } from 'react';
import {
  applyFieldDrafts,
  draftsOf,
  markFieldDraft,
  releaseFieldDraft,
  type FieldDraftState,
} from '~/routes/(private)/workspace/[projectId]/_utils/field-drafts';

/**
 * 未保存の編集を、サーバから届いた値より優先して表示するための hook。
 *
 * エディタは SWR キャッシュの値をそのまま描画する制御コンポーネントなので、
 * 保存（debounce 500ms + 往復）が終わる前にそのキーが再フェッチされると、
 * キャッシュがサーバ値で置き換わり入力中のテキストが巻き戻る。
 * 再フェッチは AI 提案の反映・自律 Run・バージョン復元・フォーカス復帰・
 * 再マウントなど、ユーザーの入力とは無関係なタイミングで発火する。
 *
 * 編集中のフィールドにだけローカルの入力を被せることでこれを防ぐ。
 * 編集していないフィールドは従来どおりサーバ値で更新されるため、同期は止まらない。
 * @param ownerId - 編集対象のID（ノードID / プロジェクトID）。切り替わると下書きは引き継がない
 */
export function useFieldDrafts(ownerId: string) {
  const [state, setState] = useState<FieldDraftState>(() => ({
    ownerId,
    drafts: {},
  }));

  const drafts = draftsOf(state, ownerId);

  /** 入力を未保存として記録する */
  const markDraft = useCallback(
    (field: string, value: unknown) => {
      setState((prev) => markFieldDraft(prev, ownerId, field, value));
    },
    [ownerId],
  );

  /** 保存できた入力を未保存から外す（保存後に更に編集されていれば残す） */
  const releaseDraft = useCallback(
    (field: string, savedValue: unknown) => {
      setState((prev) => releaseFieldDraft(prev, ownerId, field, savedValue));
    },
    [ownerId],
  );

  /** サーバ値に未保存の入力を重ねた、画面に表示する値を返す */
  const withDrafts = <T extends object>(data: T): T =>
    applyFieldDrafts(data, drafts);

  return { markDraft, releaseDraft, withDrafts };
}
