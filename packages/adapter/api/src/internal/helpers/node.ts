import type { Node } from '@tsumugi/adapter';
import type { Node as ApiNode } from '@tsumugi-chan/client';

/**
 * 生成クライアントの Node を adapter-core の Node に変換する。
 */
export function toNode(api: ApiNode): Node {
  return {
    id: api.id,
    projectId: api.projectId,
    parentId: api.parentId,
    name: api.name,
    nodeType: api.nodeType,
    order: api.order,
    canonStatus: api.canonStatus,
    contextPolicy: api.contextPolicy,
    editPolicy: api.editPolicy,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
  };
}
