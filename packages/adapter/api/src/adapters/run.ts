import {
  CreateAIRunRequestModelEnum,
  ResponseError,
  type CreateAIRunRequest as ClientCreateAIRunRequest,
} from '@tsumugi-chan/client';
import type {
  AIMessage,
  AIRun,
  AIRunAdapter,
  AIRunStreamChunk,
  AIRunSubscribeOptions,
  CreateAIRunData,
  CreateAIRunResult,
} from '@tsumugi/adapter';
import type { ApiClients } from '@/client';
import { fetchSSE } from '@/internal/helpers/sse';
import { toMessage } from '@/internal/helpers/message';
import { createDurableRunStream, toAIRun } from '@/internal/helpers/run';

/**
 * 409（同時実行違反）時にバックエンドが返すメッセージのフォールバック。
 * レスポンス本文を読めなかった場合に使う。
 */
const CONFLICT_FALLBACK_MESSAGE =
  'このプロジェクトでは既に自律実行が進行中です。';

/**
 * 進行中とみなす Run のステータス。
 * `paused` は現状どこからも遷移しないが、将来の予約として含める。
 */
const ACTIVE_RUN_STATUSES: readonly AIRun['status'][] = [
  'queued',
  'running',
  'paused',
];

/**
 * モデル名が API の許容モデル（生成 enum）かどうかを判定する型ガード。
 * core 側は `model?: string` で開いているため、ここで既知モデルに絞り込む。
 */
function isCreateRunModelEnum(
  model: string,
): model is CreateAIRunRequestModelEnum {
  return (Object.values(CreateAIRunRequestModelEnum) as string[]).includes(
    model,
  );
}

function toClientCreateRequest(
  data: CreateAIRunData,
): ClientCreateAIRunRequest {
  return {
    goal: data.goal,
    model:
      data.model && isCreateRunModelEnum(data.model) ? data.model : undefined,
    maxSteps: data.maxSteps,
    maxTotalTokens: data.maxTotalTokens,
  };
}

/**
 * エラー本文が `{ message: string | string[] }` 形をしているかを判定する型ガード。
 */
function hasErrorMessage(
  value: unknown,
): value is { message: string | string[] } {
  if (typeof value !== 'object' || value === null) return false;
  if (!('message' in value)) return false;
  const message = value.message;
  return (
    typeof message === 'string' ||
    (Array.isArray(message) && message.every((m) => typeof m === 'string'))
  );
}

/**
 * エラーレスポンスの本文からメッセージを取り出す。読めなければ fallback を返す。
 */
async function readErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body: unknown = await response.clone().json();
    if (hasErrorMessage(body)) {
      const { message } = body;
      const text = Array.isArray(message) ? message.join(' / ') : message;
      if (text.trim()) return text;
    }
  } catch {
    // 本文が JSON でない / すでに読まれている場合は fallback を使う
  }
  return fallback;
}

export function createAIRunAdapter(clients: ApiClients): AIRunAdapter {
  const fetchMessages = async (runId: string): Promise<AIMessage[]> => {
    const messages = await clients.runs.getAIRunMessages({ runId });
    return messages.map(toMessage);
  };

  /**
   * 進行中の Run を取得する（409 の導線用）。失敗しても null を返して主目的を邪魔しない。
   */
  const findActiveRun = async (projectId: string): Promise<AIRun | null> => {
    try {
      const runs = await clients.projects.getAIRuns({ projectId });
      const active = runs
        .map(toAIRun)
        .find((run) => ACTIVE_RUN_STATUSES.includes(run.status));
      return active ?? null;
    } catch (e) {
      console.error('[adapter-api] Failed to look up the active run:', e);
      return null;
    }
  };

  return {
    async create(
      projectId: string,
      data: CreateAIRunData,
    ): Promise<CreateAIRunResult> {
      try {
        const run = await clients.projects.createAIRun({
          projectId,
          createAIRunRequest: toClientCreateRequest(data),
        });
        return { status: 'created', run: toAIRun(run) };
      } catch (e) {
        // 1プロジェクトにつき同時に走れる Run は1本だけ。2本目は 409 になる。
        // このエンドポイントには @ApiConflictResponse が付いていないため生成
        // クライアントの型に 409 が現れない。ここで結果の型へ明示的に落とす。
        if (e instanceof ResponseError && e.response.status === 409) {
          return {
            status: 'conflict',
            message: await readErrorMessage(
              e.response,
              CONFLICT_FALLBACK_MESSAGE,
            ),
            runningRun: await findActiveRun(projectId),
          };
        }
        // 409 以外（422 のバリデーションエラー等）も、生成クライアントの
        // 既定メッセージは "Response returned an error code" で情報がないため、
        // 本文からメッセージを取り出して投げ直す。
        if (e instanceof ResponseError) {
          throw new Error(await readErrorMessage(e.response, e.message));
        }
        throw e;
      }
    },

    async list(projectId: string): Promise<AIRun[]> {
      const runs = await clients.projects.getAIRuns({ projectId });
      return runs.map(toAIRun);
    },

    async get(runId: string): Promise<AIRun> {
      const run = await clients.runs.getAIRun({ runId });
      return toAIRun(run);
    },

    getMessages(runId: string): Promise<AIMessage[]> {
      return fetchMessages(runId);
    },

    async stop(runId: string): Promise<AIRun> {
      const run = await clients.runs.stopAIRun({ runId });
      return toAIRun(run);
    },

    subscribe(
      runId: string,
      options?: AIRunSubscribeOptions,
    ): ReadableStream<AIRunStreamChunk> {
      return createDurableRunStream(
        {
          fetchMessages: () => fetchMessages(runId),
          openSSE: async () => {
            const opts = await clients.runs.streamAIRunRequestOpts({ runId });
            return fetchSSE(clients.configuration, opts);
          },
        },
        options,
      );
    },
  };
}
