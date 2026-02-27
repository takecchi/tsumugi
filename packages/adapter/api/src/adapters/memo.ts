import type { Memo, MemoAdapter, TreeNode } from '@tsumugi/adapter';
import type { ApiClients } from '@/client';
import type { Memo as ApiMemo } from '@tsumugi-chan/client';
import { findNodeInTree } from '@/internal/helpers/node-tree';

function toMemo(api: ApiMemo): Memo {
  return {
    id: api.id,
    projectId: api.projectId,
    parentId: api.parentId,
    name: api.name,
    nodeType: api.nodeType,
    order: api.order,
    content: api.content,
    tags: api.tags,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
  };
}

export function createMemoAdapter(clients: ApiClients): MemoAdapter {
  return {
    async getByProjectId(projectId: string): Promise<Memo[]> {
      const memos = await clients.projects.getMemos({
        projectId,
      });
      return memos.map(toMemo);
    },

    async getTreeByProjectId(projectId: string): Promise<TreeNode[]> {
      return await clients.projects.getNodeTree({
        projectId,
        nodeTypes: ['memo', 'folder'],
      });
    },

    async getById(id: string): Promise<Memo | null> {
      try {
        const memo = await clients.memos.getMemo({
          memoId: id,
        });
        return toMemo(memo);
      } catch {
        return null;
      }
    },

    // FIXME 未対応
    async getChildren(parentId: string): Promise<Memo[]> {
      const memo = await clients.memos.getMemo({
        memoId: parentId,
      });
      const nodes = await clients.projects.getNodeTree({
        projectId: memo.projectId,
        nodeTypes: ['memo', 'folder'],
      });
      const parentNode = findNodeInTree(nodes, parentId);
      if (!parentNode) return [];
      const memos = await Promise.all(
        parentNode.children.map((node) =>
          clients.memos.getMemo({ memoId: node.id }),
        ),
      );
      return memos.map(toMemo);
    },

    async create(
      data: Omit<Memo, 'id' | 'createdAt' | 'updatedAt'>,
    ): Promise<Memo> {
      const memo = await clients.projects.createMemo({
        projectId: data.projectId,
        createMemoRequest: {
          parentId: data.parentId ?? undefined,
          name: data.name,
          content: data.content,
          tags: data.tags,
        },
      });
      return toMemo(memo);
    },

    async update(
      id: string,
      data: Partial<
        Omit<Memo, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>
      >,
    ): Promise<Memo> {
      const memo = await clients.memos.updateMemo({
        memoId: id,
        updateMemoRequest: {
          name: data.name,
          content: data.content,
          tags: data.tags,
        },
      });
      return toMemo(memo);
    },

    async delete(id: string): Promise<void> {
      await clients.memos.deleteMemo({ memoId: id });
    },

    async move(
      id: string,
      newParentId: string | null,
      newOrder: number,
    ): Promise<Memo> {
      const memo = await clients.memos.getMemo({
        memoId: id,
      });
      await clients.projects.reorderNodes({
        projectId: memo.projectId,
        reorderNodesRequest: {
          changedNodes: [
            { nodeId: id, parentId: newParentId, order: newOrder },
          ],
        },
      });
      const result = await clients.memos.getMemo({ memoId: id });
      return toMemo(result);
    },

    async reorder(parentId: string | null, ids: string[]): Promise<void> {
      if (ids.length === 0) return;
      const first = await clients.memos.getMemo({
        memoId: ids[0],
      });
      await clients.projects.reorderNodes({
        projectId: first.projectId,
        reorderNodesRequest: {
          changedNodes: ids.map((nodeId, index) => ({
            nodeId,
            parentId: parentId ?? undefined,
            order: index,
          })),
        },
      });
    },

    async getByTag(projectId: string, tag: string): Promise<Memo[]> {
      const all = await this.getByProjectId(projectId);
      return all.filter((m) => m.tags?.includes(tag));
    },
  };
}
