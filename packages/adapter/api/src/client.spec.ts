import { createApiClients } from '@/client';
import { TokenManager } from '@/token-manager';

/** exp が十分先の、リフレッシュ不要なダミー JWT */
function dummyJwt(): string {
  const payload = Buffer.from(JSON.stringify({ exp: 9999999999 })).toString(
    'base64url',
  );
  return `header.${payload}.signature`;
}

/**
 * 検証対象は URL だけなので、レスポンスは
 * CommitList / CommitDiff / NodeRevisionList すべてを満たす上位集合を返す。
 */
const RESPONSE_BODY = JSON.stringify({
  commits: [],
  revisions: [],
  entries: [],
  base_commit_id: null,
  commit_id: null,
  next_cursor: null,
});

type FetchMock = (input: RequestInfo | URL) => Promise<Response>;

/** モック関数を global.fetch に代入できる型に変換する */
function toFetch(mock: FetchMock): typeof fetch {
  return mock as unknown as typeof fetch;
}

function setup() {
  const calls: string[] = [];
  const fetchMock = jest.fn((input: RequestInfo | URL) => {
    calls.push(String(input));
    return Promise.resolve(
      new Response(RESPONSE_BODY, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });
  global.fetch = toFetch(fetchMock);

  const tokenManager = new TokenManager();
  tokenManager.setToken(dummyJwt());
  const clients = createApiClients('https://api.example.com', tokenManager);
  return { clients, calls };
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('createApiClients の空クエリ除去ミドルウェア', () => {
  it('limit / cursor が空文字なら、クエリを付けずにリクエストする', async () => {
    const { clients, calls } = setup();

    await clients.projects.getCommits({
      projectId: 'project_1',
      limit: '',
      cursor: '',
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toBe(
      'https://api.example.com/v1/projects/project_1/commits',
    );
  });

  it('limit のみ指定なら limit だけを送る', async () => {
    const { clients, calls } = setup();

    await clients.projects.getCommits({
      projectId: 'project_1',
      limit: '20',
      cursor: '',
    });

    expect(calls[0]).toBe(
      'https://api.example.com/v1/projects/project_1/commits?limit=20',
    );
  });

  it('cursor が指定されていれば残す', async () => {
    const { clients, calls } = setup();

    await clients.projects.getCommits({
      projectId: 'project_1',
      limit: '20',
      cursor: 'cursor_2',
    });

    expect(calls[0]).toBe(
      'https://api.example.com/v1/projects/project_1/commits?limit=20&cursor=cursor_2',
    );
  });

  it('base_commit_id が空文字なら送らない（コミット差分）', async () => {
    const { clients, calls } = setup();

    await clients.commits.getCommitDiff({
      commitId: 'commit_1',
      baseCommitId: '',
    });

    expect(calls[0]).toBe('https://api.example.com/v1/commits/commit_1/diff');
  });

  it('base_commit_id が指定されていれば送る（作業差分）', async () => {
    const { clients, calls } = setup();

    await clients.projects.getProjectDiff({
      projectId: 'project_1',
      baseCommitId: 'commit_1',
    });

    expect(calls[0]).toBe(
      'https://api.example.com/v1/projects/project_1/diff?base_commit_id=commit_1',
    );
  });

  it('ノードの変更履歴でも空クエリを除去する', async () => {
    const { clients, calls } = setup();

    await clients.nodes.getNodeRevisions({
      nodeId: 'node_1',
      limit: '',
      cursor: '',
    });

    expect(calls[0]).toBe('https://api.example.com/v1/nodes/node_1/revisions');
  });
});
