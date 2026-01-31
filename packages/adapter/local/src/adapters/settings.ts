import type { ProjectSettingsAdapter, ProjectSettings, SavedEditorTab, EditorTabType } from '@tsumugi/adapter';
import { readJson, writeJson, ensureDir, join } from '@/internal/utils/fs';
import { getProjectDataDir } from '@/internal/utils/project-index';

interface SavedEditorTabJson {
  id?: string;
  name?: string;
  type?: string;
  active?: boolean;
}

interface SettingsJson {
  aiChatMode?: string;
  openTabs?: SavedEditorTabJson[];
}

const VALID_TAB_TYPES: EditorTabType[] = ['plot', 'character', 'memo', 'writing', 'project'];

function isValidTabType(value: unknown): value is EditorTabType {
  return typeof value === 'string' && VALID_TAB_TYPES.includes(value as EditorTabType);
}

function toSavedEditorTabs(json: SavedEditorTabJson[]): SavedEditorTab[] {
  return json
    .filter(
      (t): t is Required<Pick<SavedEditorTabJson, 'id' | 'name' | 'type'>> & SavedEditorTabJson =>
        typeof t.id === 'string' && typeof t.name === 'string' && isValidTabType(t.type),
    )
    .map((t) => ({ id: t.id, name: t.name, type: t.type as EditorTabType, ...(t.active ? { active: true } : {}) }));
}

const DEFAULT_SETTINGS: ProjectSettings = {
  aiChatMode: 'ask',
  openTabs: [],
};

async function getSettingsPath(projectId: string): Promise<string> {
  const projectDir = await getProjectDataDir(projectId);
  return join(projectDir, '.tsumugi', 'settings.json');
}

function toProjectSettings(json: SettingsJson): ProjectSettings {
  const openTabs = json.openTabs ? toSavedEditorTabs(json.openTabs) : [];
  return {
    aiChatMode: json.aiChatMode === 'write' ? 'write' : 'ask',
    openTabs,
  };
}

export function createSettingsAdapter(): ProjectSettingsAdapter {
  return {
    async get(projectId: string): Promise<ProjectSettings> {
      const path = await getSettingsPath(projectId);
      const json = await readJson<SettingsJson>(path);
      if (!json) return { ...DEFAULT_SETTINGS };
      return toProjectSettings(json);
    },

    async update(projectId: string, data: Partial<ProjectSettings>): Promise<ProjectSettings> {
      const path = await getSettingsPath(projectId);
      const existing = (await readJson<SettingsJson>(path)) ?? {};

      const updated: SettingsJson = {
        ...existing,
        ...data,
      };

      const dir = await join(await getProjectDataDir(projectId), '.tsumugi');
      await ensureDir(dir);
      await writeJson(path, updated);

      return toProjectSettings(updated);
    },
  };
}
