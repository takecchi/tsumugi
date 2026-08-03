import { useAdapter } from '~/hooks/useAdapter';
import { useSWRConfig } from 'swr';
import useSWRMutation from 'swr/mutation';
import type { ContentType, Node, NodeAttributes } from '@tsumugi/adapter';
import type { ContentItemKey, ContentTreeKey } from '~/hooks/keys';

interface UpdateNodeAttributesArg {
  nodeId: string;
  attributes: NodeAttributes;
}

/**
 * AI属性の変更を、個別コンテンツのキャッシュにマージする。
 *
 * 個別コンテンツ（Writing 等）固有のフィールド（本文など）は保持し、
 * 指定された属性のみを差し替える。再フェッチではなくマージすることで、
 * 編集中の未保存テキストを巻き戻さない。
 */
function mergeNodeAttributes<T extends Node>(
  current: T,
  attributes: NodeAttributes,
): T {
  return {
    ...current,
    canonStatus: attributes.canonStatus ?? current.canonStatus,
    contextPolicy: attributes.contextPolicy ?? current.contextPolicy,
    editPolicy: attributes.editPolicy ?? current.editPolicy,
  };
}

/**
 * サーバーが返したノードのAI属性・更新日時を、個別コンテンツのキャッシュに取り込む。
 */
function applyUpdatedNode<T extends Node>(current: T, updated: Node): T {
  return {
    ...mergeNodeAttributes(current, {
      canonStatus: updated.canonStatus,
      contextPolicy: updated.contextPolicy,
      editPolicy: updated.editPolicy,
    }),
    updatedAt: updated.updatedAt,
  };
}

/**
 * ノードのAI属性（canonStatus / contextPolicy / editPolicy）を更新する。
 *
 * 個別コンテンツのキャッシュは楽観更新で即座に反映し、サーバー応答後にその値で確定させる
 * （失敗時は再フェッチせずロールバックするため、編集中の未保存テキストを巻き戻さない）。
 * あわせて対応するコンテンツツリーを再フェッチし、ツリー上の表示も更新する。
 * @param projectId - プロジェクトID
 * @param contentType - ノードのコンテンツ種別（更新するキャッシュの特定に使用）
 * @revalidates use{Plot,Character,Memo,Writing}Tree - 対応するコンテンツツリーを再フェッチする
 * @revalidates use{Plot,Character,Memo,Writing} - 個別コンテンツのキャッシュをマージ更新する（再フェッチはしない）
 */
export function useUpdateNodeAttributes(
  projectId: string,
  contentType: ContentType,
) {
  const adapter = useAdapter();
  const { mutate } = useSWRConfig();

  return useSWRMutation<Node, Error, ContentTreeKey, UpdateNodeAttributesArg>(
    { type: `${contentType}Tree`, projectId },
    async (_, { arg }) => {
      const itemKey: ContentItemKey = { type: contentType, id: arg.nodeId };
      const request = adapter.nodes.updateAttributes(
        arg.nodeId,
        arg.attributes,
      );

      await mutate<Node | null | undefined>(
        itemKey,
        async (current) =>
          current ? applyUpdatedNode(current, await request) : current,
        {
          optimisticData: (current) =>
            current ? mergeNodeAttributes(current, arg.attributes) : current,
          rollbackOnError: true,
          revalidate: false,
        },
      );

      return request;
    },
  );
}
