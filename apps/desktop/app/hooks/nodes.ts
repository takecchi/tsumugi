import { useAdapter } from '~/hooks/useAdapter';
import useSWRMutation from 'swr/mutation';
import type { ContentType, Node, NodeAttributes } from '@tsumugi/adapter';
import type { ContentTreeKey } from '~/hooks/keys';

interface UpdateNodeAttributesArg {
  nodeId: string;
  attributes: NodeAttributes;
}

/**
 * ノードのAI属性（canonStatus / contextPolicy）を更新する。
 *
 * 更新後は対応するコンテンツツリーを再フェッチし、ツリー上の表示（確定/検討中・見せ方）を更新する。
 * @param projectId - プロジェクトID
 * @param contentType - ノードのコンテンツ種別（再フェッチするツリーの特定に使用）
 * @revalidates use{Plot,Character,Memo,Writing}Tree - 対応するコンテンツツリーを再フェッチする
 */
export function useUpdateNodeAttributes(
  projectId: string,
  contentType: ContentType,
) {
  const adapter = useAdapter();
  return useSWRMutation<Node, Error, ContentTreeKey, UpdateNodeAttributesArg>(
    { type: `${contentType}Tree`, projectId },
    (_, { arg }) => adapter.nodes.updateAttributes(arg.nodeId, arg.attributes),
  );
}
