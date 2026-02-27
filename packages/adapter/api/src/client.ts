import {
  Configuration,
  ProjectsApi,
  PlotsApi,
  CharactersApi,
  MemosApi,
  WritingsApi,
  AiApi,
  AuthApi,
} from '@tsumugi-chan/client';
import type { TokenManager } from '@/token-manager';

export interface ApiClients {
  readonly auth: AuthApi;
  readonly projects: ProjectsApi;
  readonly plots: PlotsApi;
  readonly characters: CharactersApi;
  readonly memos: MemosApi;
  readonly writings: WritingsApi;
  readonly ai: AiApi;
  readonly configuration: Configuration;
}

export function createApiClients(baseUrl: string, tokenManager: TokenManager): ApiClients {
  const configuration = new Configuration({ 
    basePath: baseUrl,
    accessToken: () => tokenManager.getAccessToken(),
  });
  return {
    auth: new AuthApi(configuration),
    projects: new ProjectsApi(configuration),
    plots: new PlotsApi(configuration),
    characters: new CharactersApi(configuration),
    memos: new MemosApi(configuration),
    writings: new WritingsApi(configuration),
    ai: new AiApi(configuration),
    configuration,
  };
}
