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
  CommitsApi,
  ConsistencyApi,
  GlossaryApi,
  InstructionsApi,
  FeedbackApi,
} from '@tsumugi-chan/client';
import type { TokenManager } from '@/token-manager';
import { stripEmptyQueryParams } from '@/internal/helpers/query';

export interface ApiClients {
  readonly auth: AuthApi;
  readonly projects: ProjectsApi;
  readonly nodes: NodesApi;
  readonly commits: CommitsApi;
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
  readonly feedback: FeedbackApi;
  readonly configuration: Configuration;
}

export function createApiClients(
  baseUrl: string,
  tokenManager: TokenManager,
): ApiClients {
  const configuration = new Configuration({
    basePath: baseUrl,
    accessToken: () => tokenManager.getAccessToken(),
    middleware: [
      {
        // 生成クライアントが必須扱いしている省略可能なクエリパラメータ
        // （limit / cursor / base_commit_id）は、省略を空文字で表現して
        // ここで実際のリクエストから落とす。詳細は stripEmptyQueryParams を参照。
        pre: ({ url, init }) =>
          Promise.resolve({ url: stripEmptyQueryParams(url), init }),
      },
    ],
  });
  return {
    auth: new AuthApi(configuration),
    projects: new ProjectsApi(configuration),
    nodes: new NodesApi(configuration),
    commits: new CommitsApi(configuration),
    plots: new PlotsApi(configuration),
    characters: new CharactersApi(configuration),
    memos: new MemosApi(configuration),
    writings: new WritingsApi(configuration),
    ai: new AiApi(configuration),
    runs: new AiRunsApi(configuration),
    consistency: new ConsistencyApi(configuration),
    glossary: new GlossaryApi(configuration),
    instructions: new InstructionsApi(configuration),
    feedback: new FeedbackApi(configuration),
    configuration,
  };
}
