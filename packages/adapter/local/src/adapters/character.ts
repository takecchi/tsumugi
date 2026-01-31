import type { CharacterAdapter, Character, TreeNode, NodeType } from '@tsumugi/adapter';
import { ensureDir, readJson, writeJson, removeFile, listDir, join } from '@/internal/utils/fs';
import { generateId, now } from '@/internal/utils/id';
import { extractParentPath } from '@/internal/utils/path';
import { getProjectDataDir } from '@/internal/utils/project-index';

/**
 * character.json に保存される形式
 * id, projectId は含まない（パスから自動計算）
 */
interface CharacterJson {
  parentId: string | null;
  name: string;
  nodeType: string;
  order: number;
  aliases?: string;
  role?: string;
  gender?: string;
  age?: string;
  appearance?: string;
  personality?: string;
  background?: string;
  motivation?: string;
  relationships?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

function getProjectIdFromPath(fullPath: string): string {
  return extractParentPath(fullPath, 'characters');
}

export function createCharacterAdapter(_workDir?: string): CharacterAdapter {
  const getCharactersDir = async (projectId: string) => {
    const projectDir = await getProjectDataDir(projectId);
    return join(projectDir, 'characters');
  };

  const toNodeType = (raw: string): NodeType => raw === 'folder' ? 'folder' : 'character';

  const toCharacter = (json: CharacterJson, fullPath: string): Character => ({
    id: fullPath,
    projectId: getProjectIdFromPath(fullPath),
    parentId: json.parentId,
    name: json.name,
    nodeType: toNodeType(json.nodeType),
    order: json.order,
    aliases: json.aliases,
    role: json.role,
    gender: json.gender,
    age: json.age,
    appearance: json.appearance,
    personality: json.personality,
    background: json.background,
    motivation: json.motivation,
    relationships: json.relationships,
    notes: json.notes,
    createdAt: new Date(json.createdAt),
    updatedAt: new Date(json.updatedAt),
  });

  const getAllCharacters = async (projectId: string): Promise<Character[]> => {
    const dir = await getCharactersDir(projectId);
    await ensureDir(dir);
    const files = await listDir(dir);
    const items: Character[] = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        const path = await join(dir, file);
        const json = await readJson<CharacterJson>(path);
        if (json) items.push(toCharacter(json, path));
      }
    }
    return items.sort((a, b) => a.order - b.order);
  };

  const buildTree = (items: Character[], parentId: string | null): TreeNode[] => {
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
    async getByProjectId(projectId: string): Promise<Character[]> {
      return getAllCharacters(projectId);
    },

    async getTreeByProjectId(projectId: string): Promise<TreeNode[]> {
      const items = await getAllCharacters(projectId);
      return buildTree(items, null);
    },

    async getById(id: string): Promise<Character | null> {
      const json = await readJson<CharacterJson>(id);
      if (!json) return null;
      return toCharacter(json, id);
    },

    async getChildren(parentId: string): Promise<Character[]> {
      const parent = await this.getById(parentId);
      if (!parent) return [];
      const items = await getAllCharacters(parent.projectId);
      return items.filter((i) => i.parentId === parentId);
    },

    async create(data: Omit<Character, 'id' | 'createdAt' | 'updatedAt'>): Promise<Character> {
      const id = generateId();
      const timestamp = now();
      const dir = await getCharactersDir(data.projectId);
      await ensureDir(dir);

      const filePath = await join(dir, `${id}.json`);
      const json: CharacterJson = {
        parentId: data.parentId,
        name: data.name,
        nodeType: data.nodeType,
        order: data.order,
        aliases: data.aliases,
        role: data.role,
        gender: data.gender,
        age: data.age,
        appearance: data.appearance,
        personality: data.personality,
        background: data.background,
        motivation: data.motivation,
        relationships: data.relationships,
        notes: data.notes,
        createdAt: timestamp.toISOString(),
        updatedAt: timestamp.toISOString(),
      };

      await writeJson(filePath, json);
      return toCharacter(json, filePath);
    },

    async update(id: string, data: Partial<Omit<Character, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>>): Promise<Character> {
      const existing = await readJson<CharacterJson>(id);
      if (!existing) throw new Error(`Character not found: ${id}`);

      const updated: CharacterJson = {
        ...existing,
        ...(data.parentId !== undefined ? { parentId: data.parentId } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.nodeType !== undefined ? { nodeType: data.nodeType } : {}),
        ...(data.order !== undefined ? { order: data.order } : {}),
        ...(data.aliases !== undefined ? { aliases: data.aliases } : {}),
        ...(data.role !== undefined ? { role: data.role } : {}),
        ...(data.gender !== undefined ? { gender: data.gender } : {}),
        ...(data.age !== undefined ? { age: data.age } : {}),
        ...(data.appearance !== undefined ? { appearance: data.appearance } : {}),
        ...(data.personality !== undefined ? { personality: data.personality } : {}),
        ...(data.background !== undefined ? { background: data.background } : {}),
        ...(data.motivation !== undefined ? { motivation: data.motivation } : {}),
        ...(data.relationships !== undefined ? { relationships: data.relationships } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        updatedAt: now().toISOString(),
      };

      await writeJson(id, updated);
      return toCharacter(updated, id);
    },

    async delete(id: string): Promise<void> {
      const children = await this.getChildren(id);
      for (const child of children) {
        await this.delete(child.id);
      }
      await removeFile(id);
    },

    async move(id: string, newParentId: string | null, newOrder: number): Promise<Character> {
      return this.update(id, { parentId: newParentId, order: newOrder });
    },

    async reorder(parentId: string | null, ids: string[]): Promise<void> {
      for (let i = 0; i < ids.length; i++) {
        await this.update(ids[i], { order: i });
      }
    },
  };
}
