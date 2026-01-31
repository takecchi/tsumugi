import { readJson, ensureDir, join, listSubDirs, exists } from './fs';
import { homeDir } from '@tauri-apps/api/path';

/**
 * project.json に保存される形式
 * id は含まない（id = fullPath のため）
 */
export interface ProjectJson {
  name: string;
  synopsis?: string;
  theme?: string;
  goal?: string;
  targetWordCount?: number;
  targetAudience?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * メモリ上で使用する形式
 * path = fullPath = id
 */
export interface ProjectWithPath extends ProjectJson {
  path: string;
}

export async function getWorkDir(workDir?: string): Promise<string> {
  if (workDir) return workDir;
  const home = await homeDir();
  return join(home, 'TsumugiProjects');
}

/**
 * workDir 配下のディレクトリをスキャンし、.tsumugi/project.json があるものをプロジェクトとして返す
 */
export async function scanProjects(workDir?: string): Promise<ProjectWithPath[]> {
  const baseDir = await getWorkDir(workDir);
  await ensureDir(baseDir);

  const dirs = await listSubDirs(baseDir);
  const projects: ProjectWithPath[] = [];

  for (const dirName of dirs) {
    if (dirName.startsWith('.')) continue;

    const projectPath = await join(baseDir, dirName);
    const metaPath = await join(projectPath, '.tsumugi', 'project.json');

    if (await exists(metaPath)) {
      const json = await readJson<ProjectJson>(metaPath);
      if (json) {
        projects.push({
          ...json,
          path: projectPath,
        });
      }
    }
  }

  return projects;
}

/**
 * projectId = fullPath なのでそのまま返す
 */
export async function getProjectDataDir(projectId: string): Promise<string> {
  return projectId;
}
