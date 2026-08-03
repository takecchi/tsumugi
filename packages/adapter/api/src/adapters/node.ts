import type { Node, NodeAdapter, NodeAttributes } from '@tsumugi/adapter';
import type { ApiClients } from '@/client';
import { toNode } from '@/internal/helpers/node';

export function createNodeAdapter(clients: ApiClients): NodeAdapter {
  return {
    async updateAttributes(
      nodeId: string,
      attributes: NodeAttributes,
    ): Promise<Node> {
      const node = await clients.nodes.updateNode({
        nodeId,
        // 未指定のフィールドは送らない（バックエンド側で「変更しない」扱いになる）
        updateNodeRequest: {
          canonStatus: attributes.canonStatus,
          contextPolicy: attributes.contextPolicy,
          editPolicy: attributes.editPolicy,
        },
      });
      return toNode(node);
    },
  };
}
