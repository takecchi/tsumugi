import type { Adapter, AdapterConfig } from '@tsumugi/adapter';
import { createApiClients } from '@/client';
import { createProjectAdapter } from '@/adapters/project';
import { createPlotAdapter } from '@/adapters/plot';
import { createCharacterAdapter } from '@/adapters/character';
import { createMemoAdapter } from '@/adapters/memo';
import { createWritingAdapter } from '@/adapters/writing';
import { createSettingsAdapter } from '@/adapters/settings';
import { createAIAdapter } from '@/adapters/ai';

export function createAdapter(config: AdapterConfig = {}): Adapter {
  const apiConfig = config.api;
  if (!apiConfig) {
    throw new Error(
      '@tsumugi/adapter-api: API config is required. Pass api config via AdapterConfig.api.',
    );
  }
  const clients = createApiClients(apiConfig.baseUrl);

  return {
    projects: createProjectAdapter(clients),
    settings: createSettingsAdapter(),
    plots: createPlotAdapter(clients),
    characters: createCharacterAdapter(clients),
    memos: createMemoAdapter(clients),
    writings: createWritingAdapter(clients),
    ai: createAIAdapter(clients),
  };
}
