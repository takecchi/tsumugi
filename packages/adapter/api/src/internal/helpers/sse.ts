import {
  Configuration,
  ErrorStreamChunkFromJSON,
  FinishStreamChunkFromJSON,
  ProposalStreamChunkFromJSON,
  TextDeltaStreamChunkFromJSON,
  ToolCallStreamChunkFromJSON,
  ToolResultStreamChunkFromJSON,
  UsageStreamChunkFromJSON,
} from '@tsumugi-chan/client';
import type { Proposal } from '@tsumugi-chan/client';
import {
  AIProposal,
  AIStreamChunk,
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
 * 生の SSE フレーム（`data: <JSON>`）を 1 件パースし、変換関数で任意のチャンク型に変換する。
 * data 行が無い / 不正な JSON の場合は null を返す。
 */
function parseSSEFrame<T>(
  raw: string,
  toChunk: (data: unknown) => T | null,
): T | null {
  const dataLine = raw.split('\n').find((l) => l.startsWith('data: '));
  if (!dataLine) return null;

  try {
    const data = JSON.parse(dataLine.slice(6));
    return toChunk(data);
  } catch {
    return null;
  }
}

/**
 * SSE レスポンスの body を、任意のチャンク型の ReadableStream に変換する汎用ヘルパー。
 * `data: <JSON>\n\n` 区切りのフレームを逐次パースして push する。
 */
export function createSSEChunkStream<T>(
  response: Response,
  toChunk: (data: unknown) => T | null,
  makeError: (message: string) => T,
): ReadableStream<T> {
  const body = response.body;
  if (!body) {
    return new ReadableStream<T>({
      start(controller) {
        controller.enqueue(makeError('No response body'));
        controller.close();
      },
    });
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  return new ReadableStream<T>({
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
              const chunk = parseSSEFrame(part, toChunk);
              if (chunk !== null) {
                controller.enqueue(chunk);
              }
            }
          }
        } catch (err) {
          controller.enqueue(
            makeError(err instanceof Error ? err.message : String(err)),
          );
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

/**
 * SSE レスポンスの body を ReadableStream<AIStreamChunk> に変換する
 */
export function parseSSEStream(
  response: Response,
): ReadableStream<AIStreamChunk> {
  return createSSEChunkStream(response, toAIStreamChunk, (message) => ({
    type: 'error',
    error: message,
  }));
}

/**
 * 生の SSE フレーム（`data: <JSON>`）を 1 件パースして AIStreamChunk に変換する。
 * data 行が無い / 不正な JSON / ドメインに現れないチャンク種別は null を返す。
 */
export function parseSSEEvent(raw: string): AIStreamChunk | null {
  return parseSSEFrame(raw, toAIStreamChunk);
}

export function hasType(raw: unknown): raw is { type: string } {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return false;
  }
  return 'type' in raw && typeof raw.type === 'string';
}

/**
 * バックエンドの Proposal（生成クライアント型）を adapter-core の AIProposal に変換する。
 * replace / line_edits のプレビューを差分（FieldChange）配列に展開する。
 */
export function toAIProposal(proposal: Proposal): AIProposal {
  const diffs: FieldChange<string | unknown>[] = [];
  for (const replacePreview of proposal.replacePreviews) {
    diffs.push({
      fieldName: replacePreview.fieldName,
      before: replacePreview.before,
      after: replacePreview.after,
    });
  }
  for (const lineEditsPreview of proposal.lineEditsPreviews) {
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
    id: proposal.toolCallId ?? '',
    action: proposal.action,
    targetId: proposal.targetId ?? '',
    contentType: proposal.contentType,
    targetName: proposal.targetName,
    status: proposal.proposalStatus,
    diffs,
  };
}

/**
 * v2 SSE チャンク（生成クライアントの StreamChunk 系, discriminated union）を
 * adapter-core の AIStreamChunk に正規化する。
 *
 * - text-delta        → text（増分を content に）
 * - tool-call         → tool_call（args オブジェクトを JSON 文字列化）
 * - tool-result       → tool_result（result オブジェクトを JSON 文字列化）
 * - proposal          → proposal
 * - usage / error     → そのまま
 * - finish            → done（message_id を messageId に）
 * - start / text-start / text-end / その他 → ドメインには現れないため null
 */
export function toAIStreamChunk(raw: unknown): AIStreamChunk | null {
  if (!hasType(raw)) throw new Error('Invalid SSE chunk');
  switch (raw.type) {
    case 'text-delta': {
      const chunk = TextDeltaStreamChunkFromJSON(raw);
      return {
        type: 'text',
        content: chunk.delta,
      };
    }
    case 'tool-call': {
      const chunk = ToolCallStreamChunkFromJSON(raw);
      return {
        type: 'tool_call',
        toolCall: {
          id: chunk.toolCallId,
          name: chunk.toolName as AIToolName,
          arguments: JSON.stringify(chunk.args),
        },
      };
    }
    case 'tool-result': {
      const chunk = ToolResultStreamChunkFromJSON(raw);
      return {
        type: 'tool_result',
        toolResult: {
          toolCallId: chunk.toolCallId,
          toolName: chunk.toolName as AIToolName,
          result: JSON.stringify(chunk.result),
        },
      };
    }
    case 'proposal': {
      const chunk = ProposalStreamChunkFromJSON(raw);
      return {
        type: 'proposal',
        proposal: toAIProposal(chunk.proposal),
      };
    }
    case 'usage': {
      const chunk = UsageStreamChunkFromJSON(raw);
      return {
        type: 'usage',
        usage: chunk.usage,
      };
    }
    case 'error': {
      const chunk = ErrorStreamChunkFromJSON(raw);
      return {
        type: 'error',
        error: chunk.error,
      };
    }
    case 'finish': {
      const chunk = FinishStreamChunkFromJSON(raw);
      return {
        type: 'done',
        messageId: chunk.messageId ?? undefined,
      };
    }
    // 購読開始 / テキストブロックの開始・終了はドメインに現れない
    case 'start':
    case 'text-start':
    case 'text-end':
      return null;
  }
  return null;
}
