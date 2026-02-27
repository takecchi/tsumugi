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

    expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/api/stream', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer token',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({ message: 'test' }),
    });
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
});

describe('parseSSEStream', () => {
  it('SSEイベントをAIStreamChunkに変換する', async () => {
    const sseData = `data: {"type":"text","content":"Hello"}\n\ndata: {"type":"done"}\n\n`;
    const mockResponse = new Response(sseData, {
      headers: { 'Content-Type': 'text/event-stream' },
    });

    const stream = parseSSEStream(mockResponse);
    const reader = stream.getReader();

    const chunk1 = await reader.read();
    expect(chunk1.done).toBe(false);
    expect(chunk1.value).toEqual({ type: 'text', content: 'Hello' });

    const chunk2 = await reader.read();
    expect(chunk2.done).toBe(false);
    expect(chunk2.value).toEqual({ type: 'done' });

    const chunk3 = await reader.read();
    expect(chunk3.done).toBe(true);
  });

  it('tool_callイベントを正しくパースする', async () => {
    const sseData = `data: {"type":"tool_call","toolCall":{"id":"call_1","name":"get_plot","arguments":"{\\"id\\":\\"123\\"}"}}\n\n`;
    const mockResponse = new Response(sseData);

    const stream = parseSSEStream(mockResponse);
    const reader = stream.getReader();

    const chunk = await reader.read();
    expect(chunk.value).toEqual({
      type: 'tool_call',
      toolCall: {
        id: 'call_1',
        name: 'get_plot',
        arguments: '{"id":"123"}',
      },
    });
  });

  it('tool_resultイベントを正しくパースする', async () => {
    const sseData = `data: {"type":"tool_result","toolResult":{"toolCallId":"call_1","toolName":"get_plot","result":"{\\"title\\":\\"Test\\"}"}}\n\n`;
    const mockResponse = new Response(sseData);

    const stream = parseSSEStream(mockResponse);
    const reader = stream.getReader();

    const chunk = await reader.read();
    expect(chunk.value).toEqual({
      type: 'tool_result',
      toolResult: {
        toolCallId: 'call_1',
        toolName: 'get_plot',
        result: '{"title":"Test"}',
      },
    });
  });

  it('proposalイベントを正しくパースする', async () => {
    const sseData = `data: {"type":"proposal","proposal":{"id":"prop_1","contentType":"plot","action":"create"}}\n\n`;
    const mockResponse = new Response(sseData);

    const stream = parseSSEStream(mockResponse);
    const reader = stream.getReader();

    const chunk = await reader.read();
    expect(chunk.value).toEqual({
      type: 'proposal',
      proposal: {
        id: 'prop_1',
        contentType: 'plot',
        action: 'create',
      },
    });
  });

  it('usageイベントを正しくパースする', async () => {
    const sseData = `data: {"type":"usage","usage":{"promptTokens":100,"completionTokens":50,"totalTokens":150}}\n\n`;
    const mockResponse = new Response(sseData);

    const stream = parseSSEStream(mockResponse);
    const reader = stream.getReader();

    const chunk = await reader.read();
    expect(chunk.value).toEqual({
      type: 'usage',
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      },
    });
  });

  it('errorイベントを正しくパースする', async () => {
    const sseData = `data: {"type":"error","error":"Something went wrong"}\n\n`;
    const mockResponse = new Response(sseData);

    const stream = parseSSEStream(mockResponse);
    const reader = stream.getReader();

    const chunk = await reader.read();
    expect(chunk.value).toEqual({
      type: 'error',
      error: 'Something went wrong',
    });
  });

  it('複数のイベントを順番に処理する', async () => {
    const sseData = `data: {"type":"text","content":"First"}\n\ndata: {"type":"text","content":"Second"}\n\ndata: {"type":"text","content":"Third"}\n\n`;
    const mockResponse = new Response(sseData);

    const stream = parseSSEStream(mockResponse);
    const reader = stream.getReader();

    const chunks: AIStreamChunk[] = [];
    let result = await reader.read();
    while (!result.done) {
      chunks.push(result.value);
      result = await reader.read();
    }

    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toEqual({ type: 'text', content: 'First' });
    expect(chunks[1]).toEqual({ type: 'text', content: 'Second' });
    expect(chunks[2]).toEqual({ type: 'text', content: 'Third' });
  });

  it('不正なJSONは無視する', async () => {
    const sseData = `data: invalid json\n\ndata: {"type":"text","content":"Valid"}\n\n`;
    const mockResponse = new Response(sseData);

    const stream = parseSSEStream(mockResponse);
    const reader = stream.getReader();

    const chunk = await reader.read();
    expect(chunk.value).toEqual({ type: 'text', content: 'Valid' });
  });

  it('dataプレフィックスがない行は無視する', async () => {
    const sseData = `: comment\n\nevent: message\ndata: {"type":"text","content":"Hello"}\n\n`;
    const mockResponse = new Response(sseData);

    const stream = parseSSEStream(mockResponse);
    const reader = stream.getReader();

    const chunk = await reader.read();
    expect(chunk.value).toEqual({ type: 'text', content: 'Hello' });
  });

  it('bodyがnullの場合はエラーチャンクを返す', async () => {
    const mockResponse = {
      body: null,
    } as Response;

    const stream = parseSSEStream(mockResponse);
    const reader = stream.getReader();

    const chunk = await reader.read();
    expect(chunk.value).toEqual({ type: 'error', error: 'No response body' });

    const done = await reader.read();
    expect(done.done).toBe(true);
  });

  it('分割されたデータを正しくバッファリングする', async () => {
    const encoder = new TextEncoder();
    const part1 = encoder.encode('data: {"type":"text","content":"First"}\n\ndata: {"type":"te');
    const part2 = encoder.encode('xt","content":"Second"}\n\n');

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

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toEqual({ type: 'text', content: 'First' });
    expect(chunks[1]).toEqual({ type: 'text', content: 'Second' });
  });
});
