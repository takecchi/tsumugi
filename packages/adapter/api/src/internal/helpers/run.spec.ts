import type { AIMessage, AIRunStreamChunk } from '@tsumugi/adapter';
import {
  createDurableRunStream,
  isNonRetryableStreamError,
  isTerminalRunChunk,
  toAIRunFinishReason,
  toAIRunStreamChunk,
  type RunStreamTransport,
} from './run';
import { SSEResponseError } from './sse';

/** SSE フレーム列を Response に組み立てる */
function sseResponse(...frames: string[]): Response {
  return new Response(frames.map((f) => `data: ${f}\n\n`).join(''));
}

/** 途中で切れた（終端チャンクなしで閉じた）SSE レスポンス */
function truncatedResponse(...frames: string[]): Response {
  return sseResponse(...frames);
}

async function drain(
  stream: ReadableStream<AIRunStreamChunk>,
): Promise<AIRunStreamChunk[]> {
  const reader = stream.getReader();
  const chunks: AIRunStreamChunk[] = [];
  let r = await reader.read();
  while (!r.done) {
    chunks.push(r.value);
    r = await reader.read();
  }
  return chunks;
}

const RUNNING = '{"type":"run-status","status":"running"}';
const EMPTY_PLAN = '{"type":"plan","plan":[]}';
const COMPLETED =
  '{"type":"run-status","status":"completed","finish_reason":"completed_plan"}';

function messageFixture(id: string): AIMessage {
  return {
    id,
    sessionId: 's1',
    role: 'assistant',
    messageType: 'text',
    content: id,
  };
}

/** transcript と SSE レスポンスを順番に返すだけの transport */
function stubTransport(
  responses: (() => Response | Promise<Response>)[],
  messages: AIMessage[][] = [],
): RunStreamTransport & { sseCalls: number; messageCalls: number } {
  const transport = {
    sseCalls: 0,
    messageCalls: 0,
    async fetchMessages(): Promise<AIMessage[]> {
      const index = transport.messageCalls;
      transport.messageCalls += 1;
      return messages[index] ?? [];
    },
    async openSSE(): Promise<Response> {
      const factory = responses[transport.sseCalls];
      transport.sseCalls += 1;
      if (!factory) throw new Error('no more responses');
      return factory();
    },
  };
  return transport;
}

/** テストでは待機しない */
const noSleep = () => Promise.resolve();

describe('toAIRunFinishReason', () => {
  it('既知の終了理由はそのまま返す', () => {
    expect(toAIRunFinishReason('max_steps')).toBe('max_steps');
    expect(toAIRunFinishReason('interrupted')).toBe('interrupted');
  });

  it('null / undefined は null を返す', () => {
    expect(toAIRunFinishReason(null)).toBeNull();
    expect(toAIRunFinishReason(undefined)).toBeNull();
  });

  it('未知の値は null を返す（将来の追加値で落ちない）', () => {
    expect(toAIRunFinishReason('something_new')).toBeNull();
  });
});

describe('toAIRunStreamChunk', () => {
  it('run-status を正規化する（finish_reason なし）', () => {
    expect(toAIRunStreamChunk(JSON.parse(RUNNING))).toEqual({
      type: 'run_status',
      status: 'running',
    });
  });

  it('run-status の finish_reason を正規化する', () => {
    expect(toAIRunStreamChunk(JSON.parse(COMPLETED))).toEqual({
      type: 'run_status',
      status: 'completed',
      finishReason: 'completed_plan',
    });
  });

  it('plan を content / active_form 付きで正規化する', () => {
    const raw = JSON.parse(
      '{"type":"plan","plan":[{"id":"r1-plan-0","content":"章を書く","active_form":"章を書いています","status":"in_progress"}]}',
    );
    expect(toAIRunStreamChunk(raw)).toEqual({
      type: 'plan',
      plan: [
        {
          id: 'r1-plan-0',
          content: '章を書く',
          activeForm: '章を書いています',
          status: 'in_progress',
        },
      ],
    });
  });

  it('text-delta を text に正規化する', () => {
    const raw = JSON.parse('{"type":"text-delta","delta":"こんにちは"}');
    expect(toAIRunStreamChunk(raw)).toEqual({
      type: 'text',
      content: 'こんにちは',
    });
  });

  it('proposal-result から作成済みノードIDを取り出す', () => {
    const raw = JSON.parse(
      '{"type":"proposal-result","result":{"feedback":{"tool_call_id":"call_1","status":"accepted","content_type":"writing","target_id":"writing_9"},"has_stream":false}}',
    );
    expect(toAIRunStreamChunk(raw)).toEqual({
      type: 'proposal_result',
      proposalFeedback: {
        toolCallId: 'call_1',
        status: 'accepted',
        contentType: 'writing',
        targetId: 'writing_9',
        conflictDetails: undefined,
      },
    });
  });

  it('error を非終端のチャンクとして返す', () => {
    const raw = JSON.parse('{"type":"error","error":"一時的な失敗"}');
    const chunk = toAIRunStreamChunk(raw);
    expect(chunk).toEqual({ type: 'error', error: '一時的な失敗' });
    expect(chunk && isTerminalRunChunk(chunk)).toBe(false);
  });

  it('Run では流れない finish / start は null を返す', () => {
    expect(
      toAIRunStreamChunk(JSON.parse('{"type":"finish","message_id":null}')),
    ).toBeNull();
    expect(toAIRunStreamChunk(JSON.parse('{"type":"start"}'))).toBeNull();
  });

  it('未知の type は null を返して読み飛ばす', () => {
    expect(toAIRunStreamChunk(JSON.parse('{"type":"brand-new"}'))).toBeNull();
  });

  it('type を持たないペイロードは throw する', () => {
    expect(() => toAIRunStreamChunk({ foo: 1 })).toThrow();
  });
});

describe('isTerminalRunChunk', () => {
  it('finishReason 付きの run_status のみ終端とみなす', () => {
    expect(
      isTerminalRunChunk({
        type: 'run_status',
        status: 'completed',
        finishReason: 'max_steps',
      }),
    ).toBe(true);
    expect(isTerminalRunChunk({ type: 'run_status', status: 'running' })).toBe(
      false,
    );
    expect(isTerminalRunChunk({ type: 'text', content: 'a' })).toBe(false);
  });
});

describe('isNonRetryableStreamError', () => {
  it('再接続しても直らない 4xx を判定する', () => {
    expect(
      isNonRetryableStreamError(new SSEResponseError(404, 'Not Found')),
    ).toBe(true);
    expect(
      isNonRetryableStreamError(new SSEResponseError(403, 'Forbidden')),
    ).toBe(true);
  });

  it('一時的な失敗（401 / 429 / 5xx）は再接続対象とする', () => {
    // 401 は購読のたびにトークンを取り直すためリフレッシュで回復しうる
    expect(
      isNonRetryableStreamError(new SSEResponseError(401, 'Unauthorized')),
    ).toBe(false);
    expect(
      isNonRetryableStreamError(new SSEResponseError(429, 'Too Many Requests')),
    ).toBe(false);
    expect(
      isNonRetryableStreamError(new SSEResponseError(503, 'Unavailable')),
    ).toBe(false);
  });

  it('HTTP 由来でないエラーは再接続対象とする', () => {
    expect(isNonRetryableStreamError(new Error('socket hang up'))).toBe(false);
  });
});

describe('createDurableRunStream', () => {
  it('購読開始時に transcript を先に流し、終端で閉じる', async () => {
    const transport = stubTransport(
      [() => sseResponse(RUNNING, EMPTY_PLAN, COMPLETED)],
      [[messageFixture('m1')]],
    );

    const chunks = await drain(
      createDurableRunStream(transport, { sleep: noSleep }),
    );

    expect(chunks[0]).toEqual({
      type: 'transcript',
      messages: [messageFixture('m1')],
    });
    expect(chunks.map((c) => c.type)).toEqual([
      'transcript',
      'run_status',
      'plan',
      'run_status',
    ]);
    expect(chunks.at(-1)).toEqual({
      type: 'run_status',
      status: 'completed',
      finishReason: 'completed_plan',
    });
    // 終端に達したので再接続しない
    expect(transport.sseCalls).toBe(1);
  });

  it('終端前に閉じたら transcript を取り直してから再購読する', async () => {
    const transport = stubTransport(
      [
        () =>
          truncatedResponse(
            RUNNING,
            EMPTY_PLAN,
            '{"type":"text-delta","delta":"途中"}',
          ),
        () => sseResponse(RUNNING, EMPTY_PLAN, COMPLETED),
      ],
      [[messageFixture('m1')], [messageFixture('m1'), messageFixture('m2')]],
    );

    const chunks = await drain(
      createDurableRunStream(transport, {
        sleep: noSleep,
        reconnectDelaysMs: [5],
      }),
    );

    expect(chunks.map((c) => c.type)).toEqual([
      'transcript',
      'run_status',
      'plan',
      'text',
      'reconnecting',
      // 再接続時は必ず transcript を取り直す（SSE はリプレイしないため）
      'transcript',
      'run_status',
      'plan',
      'run_status',
    ]);
    expect(chunks[4]).toEqual({ type: 'reconnecting', reconnectDelayMs: 5 });
    expect(chunks[5]).toEqual({
      type: 'transcript',
      messages: [messageFixture('m1'), messageFixture('m2')],
    });
    expect(transport.messageCalls).toBe(2);
  });

  it('error チャンクは終端ではなく、後続の処理を続ける', async () => {
    const transport = stubTransport([
      () =>
        sseResponse(
          RUNNING,
          EMPTY_PLAN,
          '{"type":"error","error":"一時的な失敗"}',
          '{"type":"text-delta","delta":"リトライ後"}',
          COMPLETED,
        ),
    ]);

    const chunks = await drain(
      createDurableRunStream(transport, { sleep: noSleep }),
    );

    expect(chunks.map((c) => c.type)).toEqual([
      'transcript',
      'run_status',
      'plan',
      'error',
      'text',
      'run_status',
    ]);
    // error 後に再接続していない
    expect(transport.sseCalls).toBe(1);
  });

  it('SSE の取得自体が失敗しても再接続する', async () => {
    const transport = stubTransport([
      () => {
        throw new Error('network down');
      },
      () => sseResponse(RUNNING, EMPTY_PLAN, COMPLETED),
    ]);

    const chunks = await drain(
      createDurableRunStream(transport, {
        sleep: noSleep,
        reconnectDelaysMs: [1],
      }),
    );

    expect(chunks.map((c) => c.type)).toEqual([
      'transcript',
      'reconnecting',
      'transcript',
      'run_status',
      'plan',
      'run_status',
    ]);
  });

  it('再接続の待機時間はバックオフし、末尾の値で頭打ちになる', async () => {
    const slept: number[] = [];
    const transport = stubTransport([
      () => truncatedResponse(RUNNING, EMPTY_PLAN),
      () => truncatedResponse(RUNNING, EMPTY_PLAN),
      () => truncatedResponse(RUNNING, EMPTY_PLAN),
      () => sseResponse(RUNNING, EMPTY_PLAN, COMPLETED),
    ]);

    await drain(
      createDurableRunStream(transport, {
        reconnectDelaysMs: [10, 20],
        sleep: async (ms) => {
          slept.push(ms);
        },
      }),
    );

    expect(slept).toEqual([10, 20, 20]);
  });

  it('スナップショットしか来ない場合は試行回数を使い切って error で閉じる', async () => {
    // 常にスナップショットだけ返して閉じる = 接続が確立できていない扱い
    const transport = stubTransport(
      Array.from(
        { length: 10 },
        () => () => truncatedResponse(RUNNING, EMPTY_PLAN),
      ),
    );

    const chunks = await drain(
      createDurableRunStream(transport, {
        sleep: noSleep,
        maxReconnectAttempts: 2,
        reconnectDelaysMs: [1],
      }),
    );

    const last = chunks.at(-1);
    // 'error'（サーバーがリトライ中）ではなく 'disconnected'（打ち切り）で終わる
    expect(last?.type).toBe('disconnected');
    expect(last?.error).toContain('再接続を諦めました');
    // 初回 + 再接続2回 = 3
    expect(transport.sseCalls).toBe(3);
  });

  it('404 など再接続しても直らないエラーは即 disconnected で打ち切る', async () => {
    const transport = stubTransport([
      () => {
        throw new SSEResponseError(404, 'Not Found');
      },
      () => sseResponse(RUNNING, EMPTY_PLAN, COMPLETED),
    ]);

    const chunks = await drain(
      createDurableRunStream(transport, {
        sleep: noSleep,
        reconnectDelaysMs: [1],
      }),
    );

    expect(chunks.map((c) => c.type)).toEqual(['transcript', 'disconnected']);
    // リトライしていない
    expect(transport.sseCalls).toBe(1);
  });

  it('500 は一時的な失敗として再接続する', async () => {
    const transport = stubTransport([
      () => {
        throw new SSEResponseError(500, 'Internal Server Error');
      },
      () => sseResponse(RUNNING, EMPTY_PLAN, COMPLETED),
    ]);

    const chunks = await drain(
      createDurableRunStream(transport, {
        sleep: noSleep,
        reconnectDelaysMs: [1],
      }),
    );

    expect(chunks.map((c) => c.type)).toEqual([
      'transcript',
      'reconnecting',
      'transcript',
      'run_status',
      'plan',
      'run_status',
    ]);
  });

  it('終端チャンクと同じ read に含まれた後続フレームを取りこぼさない', async () => {
    // 終了済み Run の購読では run-status(終端) → plan が 1 回の read で届く
    const transport = stubTransport([() => sseResponse(COMPLETED, EMPTY_PLAN)]);

    const chunks = await drain(
      createDurableRunStream(transport, { sleep: noSleep }),
    );

    expect(chunks.map((c) => c.type)).toEqual([
      'transcript',
      'run_status',
      // 終端の後ろにあった plan も落とさない
      'plan',
    ]);
  });

  it('スナップショットより先に進めたら試行回数をリセットする', async () => {
    // 毎回 1 チャンク余分に流してから切れる → 何度でも再接続する
    const responses = Array.from(
      { length: 5 },
      () => () =>
        truncatedResponse(
          RUNNING,
          EMPTY_PLAN,
          '{"type":"text-delta","delta":"x"}',
        ),
    );
    responses.push(() => sseResponse(RUNNING, EMPTY_PLAN, COMPLETED));

    const transport = stubTransport(responses);

    const chunks = await drain(
      createDurableRunStream(transport, {
        sleep: noSleep,
        maxReconnectAttempts: 2,
        reconnectDelaysMs: [1],
      }),
    );

    // 上限 2 を超える 5 回の切断を挟んでも最後まで到達する
    expect(transport.sseCalls).toBe(6);
    expect(chunks.at(-1)).toEqual({
      type: 'run_status',
      status: 'completed',
      finishReason: 'completed_plan',
    });
  });

  it('進捗があっても通算の再接続回数の上限で打ち切る（暴走の保険）', async () => {
    // 毎回スナップショット + 1チャンク流してから切れる = attempt はリセットされ続ける。
    // 通算上限が無いと永久に再接続してしまうケース。
    const transport = stubTransport(
      Array.from(
        { length: 20 },
        () => () =>
          truncatedResponse(
            RUNNING,
            EMPTY_PLAN,
            '{"type":"text-delta","delta":"x"}',
          ),
      ),
    );

    const chunks = await drain(
      createDurableRunStream(transport, {
        sleep: noSleep,
        maxReconnectAttempts: 2,
        maxTotalReconnects: 3,
        reconnectDelaysMs: [1],
      }),
    );

    expect(chunks.at(-1)?.type).toBe('disconnected');
    // 初回 + 再接続3回 = 4 で打ち切られる
    expect(transport.sseCalls).toBe(4);
  });

  it('消費側がキャンセルしたら再接続しない', async () => {
    const transport = stubTransport([
      () => truncatedResponse(RUNNING, EMPTY_PLAN),
      () => sseResponse(RUNNING, EMPTY_PLAN, COMPLETED),
    ]);

    const stream = createDurableRunStream(transport, {
      sleep: noSleep,
      reconnectDelaysMs: [1],
    });
    const reader = stream.getReader();
    await reader.read(); // transcript
    await reader.cancel();

    // キャンセル後に再購読が走っていないこと
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(transport.sseCalls).toBeLessThanOrEqual(1);
  });
});
