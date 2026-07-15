import type { AIStreamChunk } from '@tsumugi/adapter';
import type { Configuration } from '@tsumugi-chan/client';
import { fetchSSE, parseSSEStream } from './sse';

describe('fetchSSE', () => {
  const mockConfiguration = {
    basePath: 'https://api.example.com',
  } as Configuration;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('正しいURLとヘッダーでリクエストを送信する', async () => {
    const mockResponse = new Response('', {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    });
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const requestOpts = {
      path: '/api/stream',
      method: 'POST',
      headers: { Authorization: 'Bearer token' },
      body: { message: 'test' },
    };

    const response = await fetchSSE(mockConfiguration, requestOpts);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/api/stream',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({ message: 'test' }),
      },
    );
    expect(response).toBe(mockResponse);
  });

  it('bodyがundefinedの場合はbodyを送信しない', async () => {
    const mockResponse = new Response('', { status: 200 });
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const requestOpts = {
      path: '/api/stream',
      method: 'GET',
      headers: {},
    };

    await fetchSSE(mockConfiguration, requestOpts);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: undefined,
      }),
    );
  });

  it('レスポンスがエラーの場合は例外をスローする', async () => {
    const mockResponse = new Response('', {
      status: 500,
      statusText: 'Internal Server Error',
    });
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const requestOpts = {
      path: '/api/stream',
      method: 'POST',
      headers: {},
    };

    await expect(fetchSSE(mockConfiguration, requestOpts)).rejects.toThrow(
      'SSE request failed: 500 Internal Server Error',
    );
  });

  it('200ステータス（セッション作成）でも成功する', async () => {
    const mockResponse = new Response('', {
      status: 200,
      headers: { 'X-Session-Id': 'sess_1' },
    });
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const response = await fetchSSE(mockConfiguration, {
      path: '/v1/projects/p1/ai/sessions',
      method: 'POST',
      headers: {},
    });
    expect(response.status).toBe(200);
  });
});

describe('parseSSEStream (v2)', () => {
  async function collect(sse: string): Promise<AIStreamChunk[]> {
    const stream = parseSSEStream(new Response(sse));
    const reader = stream.getReader();
    const chunks: AIStreamChunk[] = [];
    let result = await reader.read();
    while (!result.done) {
      chunks.push(result.value);
      result = await reader.read();
    }
    return chunks;
  }

  it('text-delta を text チャンクに変換する', async () => {
    const chunks = await collect(
      `data: {"type":"text-delta","id":"t1","delta":"Hello"}\n\n`,
    );
    expect(chunks).toEqual([{ type: 'text', content: 'Hello' }]);
  });

  it('finish を done チャンクに変換し message_id を messageId に載せる', async () => {
    const chunks = await collect(
      `data: {"type":"finish","message_id":"msg_1"}\n\n`,
    );
    expect(chunks).toEqual([{ type: 'done', messageId: 'msg_1' }]);
  });

  it('finish の message_id が null の場合は messageId を持たない done を返す', async () => {
    const chunks = await collect(
      `data: {"type":"finish","message_id":null}\n\n`,
    );
    expect(chunks).toEqual([{ type: 'done' }]);
  });

  it('start / text-start / text-end はドメインに現れない（スキップ）', async () => {
    const chunks = await collect(
      [
        'data: {"type":"start"}\n\n',
        'data: {"type":"text-start","id":"t1"}\n\n',
        'data: {"type":"text-delta","id":"t1","delta":"Hi"}\n\n',
        'data: {"type":"text-end","id":"t1"}\n\n',
        'data: {"type":"finish","message_id":"m1"}\n\n',
      ].join(''),
    );
    expect(chunks).toEqual([
      { type: 'text', content: 'Hi' },
      { type: 'done', messageId: 'm1' },
    ]);
  });

  it('tool-call を変換し args を JSON文字列にする', async () => {
    const chunks = await collect(
      `data: {"type":"tool-call","tool_call_id":"call_1","tool_name":"get_plot","args":{"id":"123"}}\n\n`,
    );
    expect(chunks).toEqual([
      {
        type: 'tool_call',
        toolCall: {
          id: 'call_1',
          name: 'get_plot',
          arguments: '{"id":"123"}',
        },
      },
    ]);
  });

  it('tool-result を変換し result を JSON文字列にする', async () => {
    const chunks = await collect(
      `data: {"type":"tool-result","tool_call_id":"call_1","tool_name":"get_plot","result":{"title":"Test"}}\n\n`,
    );
    expect(chunks).toEqual([
      {
        type: 'tool_result',
        toolResult: {
          toolCallId: 'call_1',
          toolName: 'get_plot',
          result: '{"title":"Test"}',
        },
      },
    ]);
  });

  it('proposal イベントを正しくパースする', async () => {
    const chunks = await collect(
      `data: {"type":"proposal","proposal":{"id":"prop_1","content_type":"plot","action":"create","tool_call_id":"prop_1","target_id":null,"target_name":"target","proposal_status":"pending","replace_previews":[],"line_edits_previews":[]}}\n\n`,
    );
    expect(chunks).toEqual([
      {
        type: 'proposal',
        proposal: {
          action: 'create',
          contentType: 'plot',
          diffs: [],
          id: 'prop_1',
          status: 'pending',
          targetId: '',
          targetName: 'target',
        },
      },
    ]);
  });

  it('usage イベントを正しくパースする', async () => {
    const chunks = await collect(
      `data: {"type":"usage","usage":{"prompt_tokens":100,"completion_tokens":50,"total_tokens":150}}\n\n`,
    );
    expect(chunks).toEqual([
      {
        type: 'usage',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      },
    ]);
  });

  it('error イベントを正しくパースする', async () => {
    const chunks = await collect(
      `data: {"type":"error","error":"Something went wrong"}\n\n`,
    );
    expect(chunks).toEqual([{ type: 'error', error: 'Something went wrong' }]);
  });

  it('複数の text-delta を順番に処理する', async () => {
    const chunks = await collect(
      [
        'data: {"type":"text-delta","id":"t1","delta":"First"}\n\n',
        'data: {"type":"text-delta","id":"t1","delta":"Second"}\n\n',
        'data: {"type":"text-delta","id":"t1","delta":"Third"}\n\n',
      ].join(''),
    );
    expect(chunks).toEqual([
      { type: 'text', content: 'First' },
      { type: 'text', content: 'Second' },
      { type: 'text', content: 'Third' },
    ]);
  });

  it('不正なJSONは無視する', async () => {
    const chunks = await collect(
      `data: invalid json\n\ndata: {"type":"text-delta","id":"t1","delta":"Valid"}\n\n`,
    );
    expect(chunks).toEqual([{ type: 'text', content: 'Valid' }]);
  });

  it('dataプレフィックスがない行は無視する', async () => {
    const chunks = await collect(
      `: comment\n\nevent: message\ndata: {"type":"text-delta","id":"t1","delta":"Hello"}\n\n`,
    );
    expect(chunks).toEqual([{ type: 'text', content: 'Hello' }]);
  });

  it('bodyがnullの場合はエラーチャンクを返す', async () => {
    const mockResponse = { body: null } as Response;
    const stream = parseSSEStream(mockResponse);
    const reader = stream.getReader();

    const chunk = await reader.read();
    expect(chunk.value).toEqual({ type: 'error', error: 'No response body' });

    const done = await reader.read();
    expect(done.done).toBe(true);
  });

  it('分割されたデータを正しくバッファリングする', async () => {
    const encoder = new TextEncoder();
    const part1 = encoder.encode(
      'data: {"type":"text-delta","id":"t1","delta":"First"}\n\ndata: {"type":"text-de',
    );
    const part2 = encoder.encode('lta","id":"t1","delta":"Second"}\n\n');

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(part1);
        controller.enqueue(part2);
        controller.close();
      },
    });

    const mockResponse = { body: stream } as Response;
    const aiStream = parseSSEStream(mockResponse);
    const reader = aiStream.getReader();

    const chunks: AIStreamChunk[] = [];
    let result = await reader.read();
    while (!result.done) {
      chunks.push(result.value);
      result = await reader.read();
    }

    expect(chunks).toEqual([
      { type: 'text', content: 'First' },
      { type: 'text', content: 'Second' },
    ]);
  });

  it('実際のストリーミングレスポンス（文字単位）を正しくパースする', async () => {
    const deltas = [
      'テ',
      'ス',
      'ト',
      '用',
      'に',
      '作',
      '成',
      'した',
      'メ',
      'モ',
      'です',
      '。\\n\\n',
    ];
    const sseData =
      'data: {"type":"start"}\n\n' +
      'data: {"type":"text-start","id":"t1"}\n\n' +
      deltas
        .map((d) => `data: {"type":"text-delta","id":"t1","delta":"${d}"}\n\n`)
        .join('') +
      'data: {"type":"text-end","id":"t1"}\n\n' +
      'data: {"type":"usage","usage":{"prompt_tokens":8390,"completion_tokens":463,"total_tokens":8853}}\n\n' +
      'data: {"type":"finish","message_id":"msg_final"}\n\n';

    const chunks = await collect(sseData);

    const textChunks = chunks
      .filter((c) => c.type === 'text')
      .map((c) => c.content);
    expect(textChunks.join('')).toBe('テスト用に作成したメモです。\n\n');

    expect(chunks[chunks.length - 2]).toEqual({
      type: 'usage',
      usage: { promptTokens: 8390, completionTokens: 463, totalTokens: 8853 },
    });
    expect(chunks[chunks.length - 1]).toEqual({
      type: 'done',
      messageId: 'msg_final',
    });
  });

  it('ツール呼び出しを含む完全なレスポンスフロー（複数テキストブロック）をパースする', async () => {
    const sseData = [
      'data: {"type":"start"}\n\n',
      'data: {"type":"text-start","id":"t1"}\n\n',
      'data: {"type":"text-delta","id":"t1","delta":"メモを作成しますね。"}\n\n',
      'data: {"type":"text-end","id":"t1"}\n\n',
      'data: {"type":"tool-call","tool_call_id":"call_MEMO123","tool_name":"propose_create_memo","args":{"name":"テストメモ"}}\n\n',
      'data: {"type":"proposal","proposal":{"id":"call_MEMO123","content_type":"memo","action":"create","tool_call_id":"call_MEMO123","target_id":"aaa","target_name":"テストメモ","proposal_status":"pending","replace_previews":[],"line_edits_previews":[]}}\n\n',
      'data: {"type":"text-start","id":"t2"}\n\n',
      'data: {"type":"text-delta","id":"t2","delta":"提案を作成しました。"}\n\n',
      'data: {"type":"text-end","id":"t2"}\n\n',
      'data: {"type":"usage","usage":{"prompt_tokens":100,"completion_tokens":50,"total_tokens":150}}\n\n',
      'data: {"type":"finish","message_id":"msg_2"}\n\n',
    ].join('');

    const chunks = await collect(sseData);

    expect(chunks).toEqual([
      { type: 'text', content: 'メモを作成しますね。' },
      {
        type: 'tool_call',
        toolCall: {
          id: 'call_MEMO123',
          name: 'propose_create_memo',
          arguments: '{"name":"テストメモ"}',
        },
      },
      {
        type: 'proposal',
        proposal: {
          action: 'create',
          contentType: 'memo',
          diffs: [],
          id: 'call_MEMO123',
          status: 'pending',
          targetId: 'aaa',
          targetName: 'テストメモ',
        },
      },
      { type: 'text', content: '提案を作成しました。' },
      {
        type: 'usage',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      },
      { type: 'done', messageId: 'msg_2' },
    ]);
  });
});
