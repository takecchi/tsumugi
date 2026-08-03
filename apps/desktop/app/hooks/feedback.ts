import useSWRMutation from 'swr/mutation';
import type { CreateFeedbackData, ProductSignal } from '@tsumugi/adapter';
import { useAdapter } from '~/hooks/useAdapter';

interface FeedbackKey {
  type: 'feedback';
}

/**
 * プロダクトへの要望・不満を送信する
 *
 * 返り値の `summary` はサーバー側で伏字化・280文字への切り詰めが行われた結果なので、
 * 送信した文章とは一致しない。「送った内容」としてそのまま表示しないこと。
 *
 * @revalidates なし - 送信専用で一覧を取得する hook が無いため、再フェッチしない
 */
export function useSubmitFeedback() {
  const adapter = useAdapter();
  return useSWRMutation<ProductSignal, Error, FeedbackKey, CreateFeedbackData>(
    { type: 'feedback' },
    (_, { arg }) => adapter.feedback.send(arg),
  );
}
