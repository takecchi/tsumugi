import {
  readTextFile,
  writeTextFile,
  exists,
  mkdir,
  readDir,
  remove,
} from '@tauri-apps/plugin-fs';
export { join } from '@tauri-apps/api/path';
export { exists } from '@tauri-apps/plugin-fs';

export async function ensureDir(path: string): Promise<void> {
  if (!(await exists(path))) {
    await mkdir(path, { recursive: true });
  }
}

export async function readJson<T>(path: string): Promise<T | null> {
  if (!(await exists(path))) {
    return null;
  }
  const content = await readTextFile(path);
  return JSON.parse(content) as T;
}

export async function writeJson<T>(path: string, data: T): Promise<void> {
  await writeTextFile(path, JSON.stringify(data, null, 2));
}

export async function removeFile(path: string): Promise<void> {
  if (await exists(path)) {
    await remove(path);
  }
}

export async function removeDir(path: string): Promise<void> {
  if (await exists(path)) {
    await remove(path, { recursive: true });
  }
}

export async function listDir(path: string): Promise<string[]> {
  if (!(await exists(path))) {
    return [];
  }
  const entries = await readDir(path);
  return entries.map((e) => e.name);
}

export async function listSubDirs(path: string): Promise<string[]> {
  if (!(await exists(path))) {
    return [];
  }
  const entries = await readDir(path);
  return entries.filter((e) => e.isDirectory).map((e) => e.name);
}

