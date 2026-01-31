import type { PlotAdapter, Plot, TreeNode, NodeType } from '@tsumugi/adapter';
import { ensureDir, readJson, writeJson, removeFile, listDir, join } from '@/internal/utils/fs';
import { generateId, now } from '@/internal/utils/id';
import { extractParentPath } from '@/internal/utils/path';
import { getProjectDataDir } from '@/internal/utils/project-index';

/**
 * plot.json に保存される形式
 * id, projectId は含まない（パスから自動計算）
 */
interface PlotJson {
  parentId: string | null;
  name: string;
  nodeType: string;
  order: number;
  synopsis?: string;
  setting?: string;
  theme?: string;
  structure?: string;
  conflict?: string;
  resolution?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

function getProjectIdFromPath(fullPath: string): string {
  return extractParentPath(fullPath, 'plots');
}

export function createPlotAdapter(_workDir?: string): PlotAdapter {
  const getPlotsDir = async (projectId: string) => {
    const projectDir = await getProjectDataDir(projectId);
    return join(projectDir, 'plots');
  };

  const toNodeType = (raw: string): NodeType => raw === 'folder' ? 'folder' : 'plot';

  const toPlot = (json: PlotJson, fullPath: string): Plot => ({
    id: fullPath,
    projectId: getProjectIdFromPath(fullPath),
    parentId: json.parentId,
    name: json.name,
    nodeType: toNodeType(json.nodeType),
    order: json.order,
    synopsis: json.synopsis,
    setting: json.setting,
    theme: json.theme,
    structure: json.structure,
    conflict: json.conflict,
    resolution: json.resolution,
    notes: json.notes,
    createdAt: new Date(json.createdAt),
    updatedAt: new Date(json.updatedAt),
  });

  const getAllPlots = async (projectId: string): Promise<Plot[]> => {
    const dir = await getPlotsDir(projectId);
    await ensureDir(dir);
    const files = await listDir(dir);
    const items: Plot[] = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        const path = await join(dir, file);
        const json = await readJson<PlotJson>(path);
        if (json) items.push(toPlot(json, path));
      }
    }
    return items.sort((a, b) => a.order - b.order);
  };

  const buildTree = (items: Plot[], parentId: string | null): TreeNode[] => {
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
    async getByProjectId(projectId: string): Promise<Plot[]> {
      return getAllPlots(projectId);
    },

    async getTreeByProjectId(projectId: string): Promise<TreeNode[]> {
      const items = await getAllPlots(projectId);
      return buildTree(items, null);
    },

    async getById(id: string): Promise<Plot | null> {
      const json = await readJson<PlotJson>(id);
      if (!json) return null;
      return toPlot(json, id);
    },

    async getChildren(parentId: string): Promise<Plot[]> {
      const parent = await this.getById(parentId);
      if (!parent) return [];
      const items = await getAllPlots(parent.projectId);
      return items.filter((i) => i.parentId === parentId);
    },

    async create(data: Omit<Plot, 'id' | 'createdAt' | 'updatedAt'>): Promise<Plot> {
      const id = generateId();
      const timestamp = now();
      const dir = await getPlotsDir(data.projectId);
      await ensureDir(dir);

      const filePath = await join(dir, `${id}.json`);
      const json: PlotJson = {
        parentId: data.parentId,
        name: data.name,
        nodeType: data.nodeType,
        order: data.order,
        synopsis: data.synopsis,
        setting: data.setting,
        theme: data.theme,
        structure: data.structure,
        conflict: data.conflict,
        resolution: data.resolution,
        notes: data.notes,
        createdAt: timestamp.toISOString(),
        updatedAt: timestamp.toISOString(),
      };

      await writeJson(filePath, json);
      return toPlot(json, filePath);
    },

    async update(id: string, data: Partial<Omit<Plot, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>>): Promise<Plot> {
      const existing = await readJson<PlotJson>(id);
      if (!existing) throw new Error(`Plot not found: ${id}`);

      const updated: PlotJson = {
        ...existing,
        ...(data.parentId !== undefined ? { parentId: data.parentId } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.nodeType !== undefined ? { nodeType: data.nodeType } : {}),
        ...(data.order !== undefined ? { order: data.order } : {}),
        ...(data.synopsis !== undefined ? { synopsis: data.synopsis } : {}),
        ...(data.setting !== undefined ? { setting: data.setting } : {}),
        ...(data.theme !== undefined ? { theme: data.theme } : {}),
        ...(data.structure !== undefined ? { structure: data.structure } : {}),
        ...(data.conflict !== undefined ? { conflict: data.conflict } : {}),
        ...(data.resolution !== undefined ? { resolution: data.resolution } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        updatedAt: now().toISOString(),
      };

      await writeJson(id, updated);
      return toPlot(updated, id);
    },

    async delete(id: string): Promise<void> {
      const children = await this.getChildren(id);
      for (const child of children) {
        await this.delete(child.id);
      }
      await removeFile(id);
    },

    async move(id: string, newParentId: string | null, newOrder: number): Promise<Plot> {
      return this.update(id, { parentId: newParentId, order: newOrder });
    },

    async reorder(parentId: string | null, ids: string[]): Promise<void> {
      for (let i = 0; i < ids.length; i++) {
        await this.update(ids[i], { order: i });
      }
    },
  };
}
