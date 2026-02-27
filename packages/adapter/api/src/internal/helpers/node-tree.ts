import { NodeTree } from '@tsumugi-chan/client';

export function findNodeInTree(nodes: NodeTree[], id: string): NodeTree | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeInTree(node.children, id);
      if (found) return found;
    }
  }
  return null;
}
