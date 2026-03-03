import {
  Configuration,
  ProposalStreamChunkFromJSON,
  TextStreamChunkFromJSON,
  ToolCallStreamChunkFromJSON,
  ToolResultStreamChunkFromJSON,
} from '@tsumugi-chan/client';
import {
  AIStreamChunk,
  AIToolCall,
  AIToolName,
  FieldChange,
} from '@tsumugi/adapter';

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
    const data = JSON.parse(dataLine.slice(6));
    return toAIStreamChunk(data);
  } catch {
    return null;
  }
}

export function hasType(raw: unknown): raw is { type: string } {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return false;
  }
  return 'type' in raw && typeof raw.type === 'string';
}

/**
 * AIStreamChunkとして返す
 * @param raw
 */
export function toAIStreamChunk(raw: unknown): AIStreamChunk {
  if (!hasType(raw)) throw new Error('Invalid SSE chunk');
  switch (raw.type) {
    case 'text': {
      const textChunk = TextStreamChunkFromJSON(raw);
      return {
        type: 'text',
        content: textChunk.content,
      };
    }
    case 'tool_call': {
      const toolCallChunk = ToolCallStreamChunkFromJSON(raw);
      return {
        type: 'tool_call',
        toolCall: toolCallChunk.toolCall as AIToolCall,
      };
    }
    case 'tool_result': {
      const toolResultChunk = ToolResultStreamChunkFromJSON(raw);
      return {
        type: 'tool_result',
        toolResult: toolResultChunk.toolResult as {
          toolCallId: string;
          toolName: AIToolName;
          result: string;
        },
      };
    }
    case 'proposal': {
      const proposalChunk = ProposalStreamChunkFromJSON(raw);
      const diffs: FieldChange<string | unknown>[] = [];
      for (const replacePreview of proposalChunk.proposal.replacePreviews) {
        diffs.push({
          fieldName: replacePreview.fieldName,
          before: replacePreview.before,
          after: replacePreview.after,
        });
      }
      for (const lineEditsPreview of proposalChunk.proposal.lineEditsPreviews) {
        for (const preview of lineEditsPreview.previews) {
          diffs.push({
            fieldName: lineEditsPreview.fieldName,
            before: preview.before,
            after: preview.after,
            previewStart: preview.previewStart,
            previewEnd: preview.previewEnd,
          });
        }
      }
      return {
        type: 'proposal',
        proposal: {
          id: proposalChunk.proposal.toolCallId ?? '',
          action: proposalChunk.proposal.action,
          targetId: proposalChunk.proposal.targetId ?? '',
          contentType: proposalChunk.proposal.contentType,
          targetName: proposalChunk.proposal.targetName,
          status: proposalChunk.proposal.proposalStatus,
          diffs,
        },
      };
    }
  }
  throw new Error('Invalid SSE chunk');
}
