import type { MemoAdapter, Memo, TreeNode, NodeType } from '@tsumugi/adapter';
import { ensureDir, readJson, writeJson, removeFile, listDir, join } from '@/internal/utils/fs';
import { generateId, now } from '@/internal/utils/id';
import { extractParentPath } from '@/internal/utils/path';
import { getProjectDataDir } from '@/internal/utils/project-index';

/**
 * memo.json に保存される形式
 * id, projectId は含まない（パスから自動計算）
 */
interface MemoJson {
  parentId: string | null;
  name: string;
  nodeType: string;
  order: number;
  content: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

function getProjectIdFromPath(fullPath: string): string {
  return extractParentPath(fullPath, 'memos');
}

export function createMemoAdapter(_workDir?: string): MemoAdapter {
  const getMemosDir = async (projectId: string) => {
    const projectDir = await getProjectDataDir(projectId);
    return join(projectDir, 'memos');
  };

  const toNodeType = (raw: string): NodeType => raw === 'folder' ? 'folder' : 'memo';

  const toMemo = (json: MemoJson, fullPath: string): Memo => ({
    id: fullPath,
    projectId: getProjectIdFromPath(fullPath),
    parentId: json.parentId,
    name: json.name,
    nodeType: toNodeType(json.nodeType),
    order: json.order,
    content: json.nodeType !== 'folder' ? json.content : '',
    tags: json.tags,
    createdAt: new Date(json.createdAt),
    updatedAt: new Date(json.updatedAt),
  });

  const getAllMemos = async (projectId: string): Promise<Memo[]> => {
    const dir = await getMemosDir(projectId);
    await ensureDir(dir);
    const files = await listDir(dir);
    const items: Memo[] = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        const path = await join(dir, file);
        const json = await readJson<MemoJson>(path);
        if (json) items.push(toMemo(json, path));
      }
    }
    return items.sort((a, b) => a.order - b.order);
  };

  const buildTree = (items: Memo[], parentId: string | null): TreeNode[] => {
    return items
      .filter((i) => i.parentId === parentId)
      .sort((a, b) => a.order - b.order)
      .map((item) => {
        const node: TreeNode = {
          id: item.id,
          projectId: item.projectId,
          parentId: item.parentId,
          name: item.name,
          nodeType: item.nodeType,
          order: item.order,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        };
        const children = buildTree(items, item.id);
        if (children.length > 0) node.children = children;
        return node;
      });
  };

  return {
    async getByProjectId(projectId: string): Promise<Memo[]> {
      return getAllMemos(projectId);
    },

    async getTreeByProjectId(projectId: string): Promise<TreeNode[]> {
      const items = await getAllMemos(projectId);
      return buildTree(items, null);
    },

    async getById(id: string): Promise<Memo | null> {
      const json = await readJson<MemoJson>(id);
      if (!json) return null;
      return toMemo(json, id);
    },

    async getChildren(parentId: string): Promise<Memo[]> {
      const parent = await this.getById(parentId);
      if (!parent) return [];
      const items = await getAllMemos(parent.projectId);
      return items.filter((i) => i.parentId === parentId);
    },

    async create(data: Omit<Memo, 'id' | 'createdAt' | 'updatedAt'>): Promise<Memo> {
      const id = generateId();
      const timestamp = now();
      const dir = await getMemosDir(data.projectId);
      await ensureDir(dir);

      const filePath = await join(dir, `${id}.json`);
      const json: MemoJson = {
        parentId: data.parentId,
        name: data.name,
        nodeType: data.nodeType,
        order: data.order,
        content: data.nodeType !== 'folder' ? data.content : '',
        tags: data.tags,
        createdAt: timestamp.toISOString(),
        updatedAt: timestamp.toISOString(),
      };

      await writeJson(filePath, json);
      return toMemo(json, filePath);
    },

    async update(id: string, data: Partial<Omit<Memo, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>>): Promise<Memo> {
      const existing = await readJson<MemoJson>(id);
      if (!existing) throw new Error(`Memo not found: ${id}`);

      const updated: MemoJson = {
        ...existing,
        ...(data.parentId !== undefined ? { parentId: data.parentId } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.nodeType !== undefined ? { nodeType: data.nodeType } : {}),
        ...(data.order !== undefined ? { order: data.order } : {}),
        ...(data.content !== undefined ? { content: data.content } : {}),
        ...(data.tags !== undefined ? { tags: data.tags } : {}),
        updatedAt: now().toISOString(),
      };

      await writeJson(id, updated);
      return toMemo(updated, id);
    },

    async delete(id: string): Promise<void> {
      const children = await this.getChildren(id);
      for (const child of children) {
        await this.delete(child.id);
      }
      await removeFile(id);
    },

    async move(id: string, newParentId: string | null, newOrder: number): Promise<Memo> {
      return this.update(id, { parentId: newParentId, order: newOrder });
    },

    async reorder(parentId: string | null, ids: string[]): Promise<void> {
      for (let i = 0; i < ids.length; i++) {
        await this.update(ids[i], { order: i });
      }
    },

    async getByTag(projectId: string, tag: string): Promise<Memo[]> {
      const memos = await getAllMemos(projectId);
      return memos.filter((m) => m.tags?.includes(tag));
    },
  };
}
