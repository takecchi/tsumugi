import type { ProjectAdapter, Project } from '@tsumugi/adapter';
import { ensureDir, writeJson, readJson, removeDir, join, exists } from '@/internal/utils/fs';
import { now } from '@/internal/utils/id';
import {
  ProjectJson,
  ProjectWithPath,
  scanProjects,
  getWorkDir,
} from '@/internal/utils/project-index';

export class ProjectCancelledError extends Error {
  constructor() {
    super('Project creation cancelled by user');
    this.name = 'ProjectCancelledError';
  }
}

export function createProjectAdapter(workDir?: string): ProjectAdapter {
  const toProject = (p: ProjectWithPath): Project => ({
    id: p.path,
    name: p.name,
    synopsis: p.synopsis,
    theme: p.theme,
    goal: p.goal,
    targetWordCount: p.targetWordCount,
    targetAudience: p.targetAudience,
    createdAt: new Date(p.createdAt),
    updatedAt: new Date(p.updatedAt),
  });

  return {
    async getAll(): Promise<Project[]> {
      const projects = await scanProjects(workDir);
      return projects
        .map(toProject)
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    },

    async getById(id: string): Promise<Project | null> {
      // id = fullPath
      const metaPath = await join(id, '.tsumugi', 'project.json');
      const json = await readJson<ProjectJson>(metaPath);
      if (!json) return null;
      return toProject({ ...json, path: id });
    },

    async create(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
      // name をそのままディレクトリ名として使用
      const baseDir = await getWorkDir(workDir);
      const projectPath = await join(baseDir, data.name);
      await ensureDir(projectPath);

      const tsumugiDir = await join(projectPath, '.tsumugi');
      await ensureDir(tsumugiDir);

      const timestamp = now();

      const json: ProjectJson = {
        name: data.name,
        synopsis: data.synopsis,
        theme: data.theme,
        goal: data.goal,
        targetWordCount: data.targetWordCount,
        targetAudience: data.targetAudience,
        createdAt: timestamp.toISOString(),
        updatedAt: timestamp.toISOString(),
      };

      const projectMetaPath = await join(tsumugiDir, 'project.json');
      await writeJson(projectMetaPath, json);

      // id = fullPath
      return toProject({ ...json, path: projectPath });
    },

    async update(id: string, data: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Project> {
      // id = fullPath
      const metaPath = await join(id, '.tsumugi', 'project.json');
      const existing = await readJson<ProjectJson>(metaPath);

      if (!existing) {
        throw new Error(`Project not found: ${id}`);
      }

      const updated: ProjectJson = {
        ...existing,
        ...data,
        updatedAt: now().toISOString(),
      };

      await writeJson(metaPath, updated);

      return toProject({ ...updated, path: id });
    },

    async delete(id: string): Promise<void> {
      // id = fullPath (プロジェクトディレクトリ全体を削除)
      if (await exists(id)) {
        await removeDir(id);
      }
    },
  };
}
