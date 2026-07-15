import type { Node, NodeAdapter, NodeAttributes } from '@tsumugi/adapter';
import type { ApiClients } from '@/client';
import type { Node as ApiNode } from '@tsumugi-chan/client';

function toNode(api: ApiNode): Node {
  return {
    id: api.id,
    projectId: api.projectId,
    parentId: api.parentId,
    name: api.name,
    nodeType: api.nodeType,
    order: api.order,
    canonStatus: api.canonStatus,
    contextPolicy: api.contextPolicy,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
  };
}

export function createNodeAdapter(clients: ApiClients): NodeAdapter {
  return {
    async updateAttributes(
      nodeId: string,
      attributes: NodeAttributes,
    ): Promise<Node> {
      const node = await clients.nodes.updateNode({
        nodeId,
        updateNodeRequest: {
          canonStatus: attributes.canonStatus,
          contextPolicy: attributes.contextPolicy,
        },
      });
      return toNode(node);
    },
  };
}
