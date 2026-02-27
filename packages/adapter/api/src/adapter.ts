import type { Adapter, AdapterConfig } from '@tsumugi/adapter';
import { createApiClients } from '@/client';
import { createAuthAdapter } from '@/adapters/auth';
import { createProjectAdapter } from '@/adapters/project';
import { createPlotAdapter } from '@/adapters/plot';
import { createCharacterAdapter } from '@/adapters/character';
import { createMemoAdapter } from '@/adapters/memo';
import { createWritingAdapter } from '@/adapters/writing';
import { createSettingsAdapter } from '@/adapters/settings';
import { createAIAdapter } from '@/adapters/ai';
import { TokenManager } from '@/token-manager';

export function createAdapter(config: AdapterConfig = {}): Adapter {
  const apiConfig = config.api;
  if (!apiConfig) {
    throw new Error(
      '@tsumugi/adapter-api: API config is required. Pass api config via AdapterConfig.api.',
    );
  }

  const tokenManager = new TokenManager();
  const clients = createApiClients(apiConfig.baseUrl, tokenManager);

  // AuthApi は Configuration → TokenManager の循環を避けるため後から注入
  tokenManager.setAuthApi(clients.auth);

  return {
    auth: createAuthAdapter(clients, tokenManager),
    projects: createProjectAdapter(clients),
    settings: createSettingsAdapter(),
    plots: createPlotAdapter(clients),
    characters: createCharacterAdapter(clients),
    memos: createMemoAdapter(clients),
    writings: createWritingAdapter(clients),
    ai: createAIAdapter(clients),
  };
}
