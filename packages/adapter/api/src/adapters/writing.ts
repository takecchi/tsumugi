import type { Writing, WritingAdapter, TreeNode } from '@tsumugi/adapter';
import type { ApiClients } from '@/client';
import type { Writing as ApiWriting } from '@tsumugi-chan/client';
import { findNodeInTree } from '@/internal/helpers/node-tree';

function countWords(text: string): number {
  // 日本語の文字数カウント（空白・改行を除く）
  return text.replace(/\s/g, '').length;
}

function toWriting(api: ApiWriting): Writing {
  return {
    id: api.id,
    projectId: api.projectId,
    parentId: api.parentId,
    name: api.name,
    nodeType: api.nodeType,
    order: api.order,
    content: api.content,
    wordCount: countWords(api.content),
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
  };
}

export function createWritingAdapter(clients: ApiClients): WritingAdapter {
  return {
    async getByProjectId(projectId: string): Promise<Writing[]> {
      const writings = await clients.projects.getWritings({
        projectId,
      });
      return writings.map(toWriting);
    },

    async getTreeByProjectId(projectId: string): Promise<TreeNode[]> {
      return await clients.projects.getNodeTree({
        projectId,
        nodeTypes: ['writing', 'folder'],
      });
    },

    async getById(id: string): Promise<Writing | null> {
      try {
        const writing = await clients.writings.getWriting({
          writingId: id,
        });
        return toWriting(writing);
      } catch {
        return null;
      }
    },

    // FIXME 未対応
    async getChildren(parentId: string): Promise<Writing[]> {
      const writing = await clients.writings.getWriting({
        writingId: parentId,
      });
      const nodes = await clients.projects.getNodeTree({
        projectId: writing.projectId,
        nodeTypes: ['writing', 'folder'],
      });
      const parentNode = findNodeInTree(nodes, parentId);
      if (!parentNode) return [];
      const writings = await Promise.all(
        parentNode.children.map((node) =>
          clients.writings.getWriting({ writingId: node.id }),
        ),
      );
      return writings.map(toWriting);
    },

    async create(
      data: Omit<Writing, 'id' | 'createdAt' | 'updatedAt'>,
    ): Promise<Writing> {
      const writing = await clients.projects.createWriting({
        projectId: data.projectId,
        createWritingRequest: {
          parentId: data.parentId ?? undefined,
          name: data.name,
          content: data.content,
        },
      });
      return toWriting(writing);
    },

    async update(
      id: string,
      data: Partial<
        Omit<Writing, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>
      >,
    ): Promise<Writing> {
      const writing = await clients.writings.updateWriting({
        writingId: id,
        updateWritingRequest: {
          name: data.name,
          content: data.content,
        },
      });
      return toWriting(writing);
    },

    async delete(id: string): Promise<void> {
      await clients.writings.deleteWriting({ writingId: id });
    },

    async move(
      id: string,
      newParentId: string | null,
      newOrder: number,
    ): Promise<Writing> {
      const writing = await clients.writings.getWriting({
        writingId: id,
      });
      await clients.projects.reorderNodes({
        projectId: writing.projectId,
        reorderNodesRequest: {
          changedNodes: [
            { nodeId: id, parentId: newParentId, order: newOrder },
          ],
        },
      });
      const result = await clients.writings.getWriting({ writingId: id });
      return toWriting(result);
    },

    async reorder(parentId: string | null, ids: string[]): Promise<void> {
      if (ids.length === 0) return;
      const first = await clients.writings.getWriting({
        writingId: ids[0],
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

    async getTotalWordCount(projectId: string): Promise<number> {
      const writings = await this.getByProjectId(projectId);
      return writings.reduce((sum, w) => sum + w.wordCount, 0);
    },
  };
}
