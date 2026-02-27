import type { ProjectSettingsAdapter, ProjectSettings } from '@tsumugi/adapter';

const DEFAULT_SETTINGS: ProjectSettings = {
  aiChatMode: 'ask',
  openTabs: [],
};

/**
 * Settings アダプター（API版）
 *
 * サーバー側に設定エンドポイントがないため、インメモリで管理する。
 * ブラウザ環境では localStorage を利用してページリロード後も保持する。
 */
export function createSettingsAdapter(): ProjectSettingsAdapter {
  const cache = new Map<string, ProjectSettings>();

  function storageKey(projectId: string): string {
    return `tsumugi:settings:${projectId}`;
  }

  function loadFromStorage(projectId: string): ProjectSettings | null {
    if (typeof globalThis.localStorage === 'undefined') return null;
    try {
      const raw = globalThis.localStorage.getItem(storageKey(projectId));
      if (!raw) return null;
      return JSON.parse(raw) as ProjectSettings;
    } catch {
      return null;
    }
  }

  function saveToStorage(projectId: string, settings: ProjectSettings): void {
    if (typeof globalThis.localStorage === 'undefined') return;
    try {
      globalThis.localStorage.setItem(storageKey(projectId), JSON.stringify(settings));
    } catch {
      // ignore quota errors etc.
    }
  }

  return {
    async get(projectId: string): Promise<ProjectSettings> {
      const cached = cache.get(projectId);
      if (cached) return { ...cached };

      const stored = loadFromStorage(projectId);
      if (stored) {
        cache.set(projectId, stored);
        return { ...stored };
      }

      return { ...DEFAULT_SETTINGS };
    },

    async update(projectId: string, data: Partial<ProjectSettings>): Promise<ProjectSettings> {
      const existing = cache.get(projectId) ?? loadFromStorage(projectId) ?? { ...DEFAULT_SETTINGS };
      const updated: ProjectSettings = { ...existing, ...data };
      cache.set(projectId, updated);
      saveToStorage(projectId, updated);
      return { ...updated };
    },
  };
}
