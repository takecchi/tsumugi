import type { Configuration } from '@tsumugi-chan/client';
import type { RawAIStreamChunk } from '../types/raw-sse.types';
import { AIStreamChunk } from '@tsumugi/adapter';

/**
 * RequestOpts から SSE リクエストを発行する
 */
export async function fetchSSE(
  configuration: Configuration,
  requestOpts: {
    path: string;
    method: string;
    headers: Record<string, string>;
    body?: unknown;
  },
): Promise<Response> {
  const url = `${configuration.basePath}${requestOpts.path}`;

  const response = await fetch(url, {
    method: requestOpts.method,
    headers: {
      ...requestOpts.headers,
      Accept: 'text/event-stream',
    },
    body:
      requestOpts.body != null ? JSON.stringify(requestOpts.body) : undefined,
  });

  if (!response.ok) {
    throw new Error(
      `SSE request failed: ${response.status} ${response.statusText}`,
    );
  }

  return response;
}

/**
 * SSE レスポンスの body を ReadableStream<AIStreamChunk> に変換する
 */
export function parseSSEStream(
  response: Response,
): ReadableStream<AIStreamChunk> {
  const body = response.body;
  if (!body) {
    return new ReadableStream<AIStreamChunk>({
      start(controller) {
        controller.enqueue({ type: 'error', error: 'No response body' });
        controller.close();
      },
    });
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  return new ReadableStream<AIStreamChunk>({
    start(controller) {
      // バックグラウンドで読み取りを開始（push ベース）
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
              return;
            }

            buffer += decoder.decode(value, { stream: true });

            const parts = buffer.split('\n\n');
            buffer = parts.pop() ?? '';

            for (const part of parts) {
              const chunk = parseSSEEvent(part);
              if (chunk) {
                controller.enqueue(chunk);
              }
            }
          }
        } catch (err) {
          controller.enqueue({
            type: 'error',
            error: err instanceof Error ? err.message : String(err),
          });
          controller.close();
        }
      };

      // 非同期で実行
      pump().catch((e) => {
        console.error('[adapter-api] SSE pump error:', e);
      });
    },
    cancel() {
      reader.cancel().catch((e) => {
        console.error('[adapter-api] Failed to cancel SSE stream reader:', e);
      });
    },
  });
}

function parseSSEEvent(raw: string): AIStreamChunk | null {
  const dataLine = raw.split('\n').find((l) => l.startsWith('data: '));
  if (!dataLine) return null;

  try {
    const data = JSON.parse(dataLine.slice(6)) as RawAIStreamChunk;
    return toAIStreamChunk(data);
  } catch {
    return null;
  }
}

export function toAIStreamChunk(raw: RawAIStreamChunk): AIStreamChunk {
  const type = raw.type;
  const chunk: AIStreamChunk = { type };

  switch (type) {
    case 'text':
      chunk.content = raw.content;
      break;
    case 'tool_call':
      if (raw.tool_call) {
        chunk.toolCall = raw.tool_call as AIStreamChunk['toolCall'];
      }
      break;
    case 'tool_result':
      if (raw.tool_result) {
        chunk.toolResult = raw.tool_result as AIStreamChunk['toolResult'];
      }
      break;
    case 'proposal':
      if (raw.proposal) {
        chunk.proposal = raw.proposal as unknown as AIStreamChunk['proposal'];
      }
      break;
    case 'usage':
      if (raw.usage) {
        chunk.usage = raw.usage as unknown as AIStreamChunk['usage'];
      }
      break;
    case 'error':
      chunk.error = raw.error;
      break;
    case 'done':
      break;
  }

  return chunk;
}
