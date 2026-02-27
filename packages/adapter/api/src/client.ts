import {
  Configuration,
  ProjectsApi,
  PlotsApi,
  CharactersApi,
  MemosApi,
  WritingsApi,
  AiApi,
} from '@tsumugi-chan/client';

export interface ApiClients {
  readonly projects: ProjectsApi;
  readonly plots: PlotsApi;
  readonly characters: CharactersApi;
  readonly memos: MemosApi;
  readonly writings: WritingsApi;
  readonly ai: AiApi;
  readonly configuration: Configuration;
}

export function createApiClients(baseUrl: string): ApiClients {
  const configuration = new Configuration({ basePath: baseUrl });
  return {
    projects: new ProjectsApi(configuration),
    plots: new PlotsApi(configuration),
    characters: new CharactersApi(configuration),
    memos: new MemosApi(configuration),
    writings: new WritingsApi(configuration),
    ai: new AiApi(configuration),
    configuration,
  };
}
