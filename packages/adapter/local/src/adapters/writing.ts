import type { WritingAdapter, Writing, TreeNode, NodeType } from '@tsumugi/adapter';
import { ensureDir, readJson, writeJson, removeFile, listDir, join } from '@/internal/utils/fs';
import { generateId, now } from '@/internal/utils/id';
import { extractParentPath } from '@/internal/utils/path';
import { getProjectDataDir } from '@/internal/utils/project-index';

/**
 * writing.json に保存される形式
 * id, projectId は含まない（パスから自動計算）
 */
interface WritingJson {
  parentId: string | null;
  name: string;
  nodeType: string;
  order: number;
  content: string;
  createdAt: string;
  updatedAt: string;
}

function getProjectIdFromPath(fullPath: string): string {
  return extractParentPath(fullPath, 'writings');
}

function countWords(content: string): number {
  const japaneseChars = content.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g);
  const englishWords = content.match(/[a-zA-Z]+/g);
  return (japaneseChars?.length ?? 0) + (englishWords?.length ?? 0);
}

export function createWritingAdapter(_workDir?: string): WritingAdapter {
  const getWritingsDir = async (projectId: string) => {
    const projectDir = await getProjectDataDir(projectId);
    return join(projectDir, 'writings');
  };

  const toNodeType = (raw: string): NodeType => raw === 'folder' ? 'folder' : 'writing';

  const toWriting = (json: WritingJson, fullPath: string): Writing => ({
    id: fullPath,
    projectId: getProjectIdFromPath(fullPath),
    parentId: json.parentId,
    name: json.name,
    nodeType: toNodeType(json.nodeType),
    order: json.order,
    content: json.nodeType !== 'folder' ? json.content : '',
    wordCount: json.nodeType !== 'folder' ? countWords(json.content) : 0,
    createdAt: new Date(json.createdAt),
    updatedAt: new Date(json.updatedAt),
  });

  const getAllWritings = async (projectId: string): Promise<Writing[]> => {
    const dir = await getWritingsDir(projectId);
    await ensureDir(dir);
    const files = await listDir(dir);
    const items: Writing[] = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        const path = await join(dir, file);
        const json = await readJson<WritingJson>(path);
        if (json) items.push(toWriting(json, path));
      }
    }
    return items.sort((a, b) => a.order - b.order);
  };

  const buildTree = (items: Writing[], parentId: string | null): TreeNode[] => {
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
    async getByProjectId(projectId: string): Promise<Writing[]> {
      return getAllWritings(projectId);
    },

    async getTreeByProjectId(projectId: string): Promise<TreeNode[]> {
      const items = await getAllWritings(projectId);
      return buildTree(items, null);
    },

    async getById(id: string): Promise<Writing | null> {
      const json = await readJson<WritingJson>(id);
      if (!json) return null;
      return toWriting(json, id);
    },

    async getChildren(parentId: string): Promise<Writing[]> {
      const parent = await this.getById(parentId);
      if (!parent) return [];
      const items = await getAllWritings(parent.projectId);
      return items.filter((i) => i.parentId === parentId);
    },

    async create(data: Omit<Writing, 'id' | 'createdAt' | 'updatedAt'>): Promise<Writing> {
      const id = generateId();
      const timestamp = now();
      const dir = await getWritingsDir(data.projectId);
      await ensureDir(dir);

      const filePath = await join(dir, `${id}.json`);
      const json: WritingJson = {
        parentId: data.parentId,
        name: data.name,
        nodeType: data.nodeType,
        order: data.order,
        content: data.nodeType !== 'folder' ? data.content : '',
        createdAt: timestamp.toISOString(),
        updatedAt: timestamp.toISOString(),
      };

      await writeJson(filePath, json);
      return toWriting(json, filePath);
    },

    async update(id: string, data: Partial<Omit<Writing, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>>): Promise<Writing> {
      const existing = await readJson<WritingJson>(id);
      if (!existing) throw new Error(`Writing not found: ${id}`);

      const updated: WritingJson = {
        ...existing,
        ...(data.parentId !== undefined ? { parentId: data.parentId } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.nodeType !== undefined ? { nodeType: data.nodeType } : {}),
        ...(data.order !== undefined ? { order: data.order } : {}),
        ...(data.content !== undefined ? { content: data.content } : {}),
        updatedAt: now().toISOString(),
      };

      await writeJson(id, updated);
      return toWriting(updated, id);
    },

    async delete(id: string): Promise<void> {
      // 子要素も再帰的に削除
      const children = await this.getChildren(id);
      for (const child of children) {
        await this.delete(child.id);
      }
      await removeFile(id);
    },

    async move(id: string, newParentId: string | null, newOrder: number): Promise<Writing> {
      return this.update(id, { parentId: newParentId, order: newOrder });
    },

    async reorder(parentId: string | null, ids: string[]): Promise<void> {
      for (let i = 0; i < ids.length; i++) {
        await this.update(ids[i], { order: i });
      }
    },

    async getTotalWordCount(projectId: string): Promise<number> {
      const writings = await getAllWritings(projectId);
      return writings
        .filter((w) => w.nodeType !== 'folder')
        .reduce((sum, w) => sum + w.wordCount, 0);
    },
  };
}
