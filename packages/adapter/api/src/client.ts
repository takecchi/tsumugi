import {
  Configuration,
  ProjectsApi,
  PlotsApi,
  CharactersApi,
  MemosApi,
  WritingsApi,
  AiApi,
  AiRunsApi,
  AuthApi,
  NodesApi,
  ConsistencyApi,
  GlossaryApi,
  InstructionsApi,
} from '@tsumugi-chan/client';
import type { TokenManager } from '@/token-manager';

export interface ApiClients {
  readonly auth: AuthApi;
  readonly projects: ProjectsApi;
  readonly nodes: NodesApi;
  readonly plots: PlotsApi;
  readonly characters: CharactersApi;
  readonly memos: MemosApi;
  readonly writings: WritingsApi;
  readonly ai: AiApi;
  /** 自律Run（`/v1/ai/runs/*`）。Run の作成・一覧は projects 側にある */
  readonly runs: AiRunsApi;
  readonly consistency: ConsistencyApi;
  readonly glossary: GlossaryApi;
  readonly instructions: InstructionsApi;
  readonly configuration: Configuration;
}

export function createApiClients(
  baseUrl: string,
  tokenManager: TokenManager,
): ApiClients {
  const configuration = new Configuration({
    basePath: baseUrl,
    accessToken: () => tokenManager.getAccessToken(),
  });
  return {
    auth: new AuthApi(configuration),
    projects: new ProjectsApi(configuration),
    nodes: new NodesApi(configuration),
    plots: new PlotsApi(configuration),
    characters: new CharactersApi(configuration),
    memos: new MemosApi(configuration),
    writings: new WritingsApi(configuration),
    ai: new AiApi(configuration),
    runs: new AiRunsApi(configuration),
    consistency: new ConsistencyApi(configuration),
    glossary: new GlossaryApi(configuration),
    instructions: new InstructionsApi(configuration),
    configuration,
  };
}
