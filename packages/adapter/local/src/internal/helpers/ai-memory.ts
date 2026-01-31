import { join, readJson, writeJson } from '@/internal/utils/fs';
import { now } from '@/internal/utils/id';
import { getProjectDataDir } from '@/internal/utils/project-index';

/**
 * AIメモリの保存形式
 */
export interface AIMemoryJson {
  id: string;
  content: string;
  createdAt: string;
}

/**
 * プロジェクトのAIメモリファイルパスを取得
 * projectDir/.tsumugi/ai-memories.json
 */
async function getMemoriesPath(projectId: string): Promise<string> {
  const projectDir = await getProjectDataDir(projectId);
  return join(projectDir, '.tsumugi', 'ai-memories.json');
}

/**
 * AIメモリを全件読み込む
 */
export async function readMemories(projectId: string): Promise<AIMemoryJson[]> {
  const path = await getMemoriesPath(projectId);
  return (await readJson<AIMemoryJson[]>(path)) ?? [];
}

/**
 * AIメモリを追加する
 */
export async function addMemory(projectId: string, content: string): Promise<AIMemoryJson> {
  const memories = await readMemories(projectId);
  const memory: AIMemoryJson = {
    id: crypto.randomUUID(),
    content,
    createdAt: now().toISOString(),
  };
  memories.push(memory);
  const path = await getMemoriesPath(projectId);
  await writeJson(path, memories);
  return memory;
}

/**
 * AIメモリを削除する
 */
export async function removeMemory(projectId: string, memoryId: string): Promise<boolean> {
  const memories = await readMemories(projectId);
  const index = memories.findIndex((m) => m.id === memoryId);
  if (index === -1) return false;
  memories.splice(index, 1);
  const path = await getMemoriesPath(projectId);
  await writeJson(path, memories);
  return true;
}

/**
 * AIメモリをシステムプロンプト用テキストに変換
 */
export async function buildMemoriesSection(projectId: string): Promise<string> {
  const memories = await readMemories(projectId);
  if (memories.length === 0) return '';

  const lines = memories.map((m) => `- ${m.content} (id: ${m.id})`);
  return `\n\n## AIメモリ\nあなたが過去の会話で記録した重要な情報です。回答時にこれらを考慮してください。不要になったメモリは delete_memory で削除できます。\n${lines.join('\n')}`;
}
