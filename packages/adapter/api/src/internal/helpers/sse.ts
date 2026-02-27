import type { AIStreamChunk, AIStreamChunkType, AIToolName } from '@tsumugi/adapter';
import type { Configuration } from '@tsumugi-chan/client';

/**
 * RequestOpts から SSE リクエストを発行する
 */
export async function fetchSSE(
  configuration: Configuration,
  requestOpts: { path: string; method: string; headers: Record<string, string>; body?: unknown },
): Promise<Response> {
  const url = `${configuration.basePath}${requestOpts.path}`;

  const response = await fetch(url, {
    method: requestOpts.method,
    headers: {
      ...requestOpts.headers,
      Accept: 'text/event-stream',
    },
    body: requestOpts.body != null ? JSON.stringify(requestOpts.body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`SSE request failed: ${response.status} ${response.statusText}`);
  }

  return response;
}

/**
 * SSE レスポンスの body を ReadableStream<AIStreamChunk> に変換する
 */
export function parseSSEStream(response: Response): ReadableStream<AIStreamChunk> {
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
    async pull(controller) {
      try {
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
      } catch (err) {
        controller.enqueue({
          type: 'error',
          error: err instanceof Error ? err.message : String(err),
        });
        controller.close();
      }
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
    const data = JSON.parse(dataLine.slice(6));
    return toAIStreamChunk(data);
  } catch {
    return null;
  }
}

function toAIStreamChunk(data: Record<string, unknown>): AIStreamChunk {
  const type = data.type as AIStreamChunkType;
  const chunk: AIStreamChunk = { type };

  switch (type) {
    case 'text':
      chunk.content = data.content as string | undefined;
      break;
    case 'tool_call':
      if (data.toolCall) {
        const tc = data.toolCall as Record<string, unknown>;
        chunk.toolCall = {
          id: tc.id as string,
          name: tc.name as AIToolName,
          arguments: tc.arguments as string,
        };
      }
      break;
    case 'tool_result':
      if (data.toolResult) {
        const tr = data.toolResult as Record<string, unknown>;
        chunk.toolResult = {
          toolCallId: tr.toolCallId as string,
          toolName: tr.toolName as AIToolName,
          result: tr.result as string,
        };
      }
      break;
    case 'proposal':
      if (data.proposal) {
        chunk.proposal = data.proposal as AIStreamChunk['proposal'];
      }
      break;
    case 'usage':
      if (data.usage) {
        chunk.usage = data.usage as AIStreamChunk['usage'];
      }
      break;
    case 'error':
      chunk.error = data.error as string | undefined;
      break;
    case 'done':
      break;
  }

  return chunk;
}
