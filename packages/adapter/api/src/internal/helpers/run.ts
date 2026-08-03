import {
  ErrorStreamChunkFromJSON,
  PlanStreamChunkFromJSON,
  ProposalResultStreamChunkFromJSON,
  ProposalStreamChunkFromJSON,
  RunStatusStreamChunkFromJSON,
  TextDeltaStreamChunkFromJSON,
  ToolCallStreamChunkFromJSON,
  ToolResultStreamChunkFromJSON,
  UsageStreamChunkFromJSON,
  type AIRun as ClientAIRun,
  type PlanItem as ClientPlanItem,
} from '@tsumugi-chan/client';
import type {
  AIMessage,
  AIRun,
  AIRunFinishReason,
  AIRunPlanItem,
  AIRunStreamChunk,
  AIRunSubscribeOptions,
  AIToolName,
} from '@tsumugi/adapter';
import {
  hasType,
  parseSSEFrame,
  toAIProposal,
  toProposalFeedback,
} from './sse';

// ─── 型変換 ───

const AI_RUN_FINISH_REASONS: readonly AIRunFinishReason[] = [
  'agent_completed',
  'completed_plan',
  'max_steps',
  'max_tokens',
  'node_limit',
  'diminishing_returns',
  'stopped',
  'error',
  'interrupted',
];

/**
 * 終了理由が既知の値かどうかを判定する型ガード。
 * バックエンドは `finish_reason` を string で返すため、ここで既知の値に絞り込む。
 */
function isAIRunFinishReason(value: string): value is AIRunFinishReason {
  return (AI_RUN_FINISH_REASONS as readonly string[]).includes(value);
}

/**
 * 終了理由（client → core）。未終了（null）と未知の値はどちらも null にする。
 */
export function toAIRunFinishReason(
  value: string | null | undefined,
): AIRunFinishReason | null {
  if (value == null) return null;
  return isAIRunFinishReason(value) ? value : null;
}

export function toAIRunPlanItem(api: ClientPlanItem): AIRunPlanItem {
  return {
    id: api.id,
    content: api.content,
    activeForm: api.activeForm,
    status: api.status,
  };
}

export function toAIRun(api: ClientAIRun): AIRun {
  return {
    id: api.id,
    projectId: api.projectId,
    status: api.status,
    goal: api.goal,
    plan: api.plan.map(toAIRunPlanItem),
    finishReason: toAIRunFinishReason(api.finishReason),
    model: api.model,
    maxSteps: api.maxSteps,
    stepCount: api.stepCount,
    batchCount: api.batchCount,
    maxTotalTokens: api.maxTotalTokens,
    promptTokens: api.promptTokens,
    completionTokens: api.completionTokens,
    totalTokens: api.totalTokens,
    createdNodeCount: api.createdNodeCount,
    subagentCount: api.subagentCount,
    lastError: api.lastError,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
  };
}

// ─── SSE チャンクの正規化 ───

/**
 * 自律Run の SSE チャンクを adapter-core の AIRunStreamChunk に正規化する。
 *
 * 対話チャットの `toAIStreamChunk` とは意図的に別実装にしている。
 * - `plan` / `run-status` は Run にしか流れない
 * - `error` は終端ではない（対話チャットと逆のセマンティクス）
 * - `finish` / `start` は Run では流れない（来ても無視する）
 *
 * 未知の type は必ず null を返して読み飛ばす（default: throw / assertNever を足さないこと）。
 * バックエンドはマイナーバージョンでチャンク種別を追加してくる。
 */
export function toAIRunStreamChunk(raw: unknown): AIRunStreamChunk | null {
  if (!hasType(raw)) throw new Error('Invalid run SSE chunk');
  switch (raw.type) {
    case 'run-status': {
      const chunk = RunStatusStreamChunkFromJSON(raw);
      const finishReason = toAIRunFinishReason(chunk.finishReason);
      return {
        type: 'run_status',
        status: chunk.status,
        ...(finishReason !== null ? { finishReason } : {}),
      };
    }
    case 'plan': {
      const chunk = PlanStreamChunkFromJSON(raw);
      return { type: 'plan', plan: chunk.plan.map(toAIRunPlanItem) };
    }
    case 'text-delta': {
      const chunk = TextDeltaStreamChunkFromJSON(raw);
      return { type: 'text', content: chunk.delta };
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
      return { type: 'proposal', proposal: toAIProposal(chunk.proposal) };
    }
    case 'proposal-result': {
      const chunk = ProposalResultStreamChunkFromJSON(raw);
      return {
        type: 'proposal_result',
        proposalFeedback: toProposalFeedback(chunk.result.feedback),
      };
    }
    case 'usage': {
      const chunk = UsageStreamChunkFromJSON(raw);
      return { type: 'usage', usage: chunk.usage };
    }
    case 'error': {
      const chunk = ErrorStreamChunkFromJSON(raw);
      return { type: 'error', error: chunk.error };
    }
    // Run では流れない / ドメインに現れないチャンク
    case 'start':
    case 'text-start':
    case 'text-end':
    case 'finish':
      return null;
  }
  // 未知の type は握り潰してスキップする
  return null;
}

/**
 * 生の SSE フレーム（`data: <JSON>`）を 1 件パースして AIRunStreamChunk に変換する。
 */
export function parseAIRunSSEEvent(raw: string): AIRunStreamChunk | null {
  return parseSSEFrame(raw, toAIRunStreamChunk);
}

/**
 * 終端チャンクかどうか。
 *
 * Run には `finish` チャンクが流れないため、`run_status` かつ `finishReason` が
 * 付いていることが唯一の終端条件。
 */
export function isTerminalRunChunk(chunk: AIRunStreamChunk): boolean {
  return chunk.type === 'run_status' && chunk.finishReason != null;
}

// ─── 再接続付きストリーム ───

/**
 * 購読直後に必ず流れるスナップショット（`run-status` → `plan`）のチャンク数。
 *
 * 「再接続に進捗があったか」の判定に使う。スナップショットしか受け取れていない
 * 場合は接続が確立できていないものとみなし、リトライ回数をリセットしない
 * （無限再接続ループを防ぐ）。
 */
const SNAPSHOT_CHUNK_COUNT = 2;

export const DEFAULT_RECONNECT_DELAYS_MS: readonly number[] = [
  1000, 2000, 4000, 8000, 15000,
];

export const DEFAULT_MAX_RECONNECT_ATTEMPTS = 10;

/**
 * 自律Run ストリームの入出力。テストで差し替えられるように切り出している。
 */
export interface RunStreamTransport {
  /** transcript（メッセージ一覧）を取得する */
  fetchMessages(): Promise<AIMessage[]>;
  /** SSE レスポンスを取得する */
  openSSE(): Promise<Response>;
}

export interface DurableRunStreamOptions extends AIRunSubscribeOptions {
  /** 待機処理（テスト用に差し替える） */
  sleep?: (ms: number) => Promise<void>;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 再接続付きの自律Run ストリームを生成する。
 *
 * SSE は過去チャンクをリプレイせず、`Last-Event-ID` による再開もできない。
 * そのため接続のたびに **transcript を取得してから** SSE を購読し、
 * `transcript` チャンクで受け取り側の状態を置き換えさせる。
 *
 * 終端（`run_status` + `finishReason`）を受け取るまでにストリームが閉じた場合は
 * ネットワーク切断とみなし、バックオフしながら再購読する。
 */
export function createDurableRunStream(
  transport: RunStreamTransport,
  options: DurableRunStreamOptions = {},
): ReadableStream<AIRunStreamChunk> {
  const delays =
    options.reconnectDelaysMs && options.reconnectDelaysMs.length > 0
      ? options.reconnectDelaysMs
      : DEFAULT_RECONNECT_DELAYS_MS;
  const maxAttempts =
    options.maxReconnectAttempts ?? DEFAULT_MAX_RECONNECT_ATTEMPTS;
  const sleep = options.sleep ?? defaultSleep;

  let cancelled = false;
  let activeReader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  const cancelActiveReader = () => {
    const reader = activeReader;
    activeReader = null;
    reader?.cancel().catch((e) => {
      console.error('[adapter-api] Failed to cancel run SSE reader:', e);
    });
  };

  return new ReadableStream<AIRunStreamChunk>({
    start(controller) {
      /** 消費側がキャンセルした後の close/enqueue は例外になるため包む */
      const safeClose = () => {
        try {
          controller.close();
        } catch {
          // すでにクローズ済み
        }
      };

      const pump = async (): Promise<void> => {
        let attempt = 0;

        while (!cancelled) {
          // このセッションで受け取ったチャンク数（スナップショットを含む）
          let chunkCount = 0;
          let terminated = false;

          try {
            const messages = await transport.fetchMessages();
            if (cancelled) break;
            controller.enqueue({ type: 'transcript', messages });

            const response = await transport.openSSE();
            if (cancelled) break;

            const body = response.body;
            if (!body) throw new Error('No response body for run SSE');

            const reader = body.getReader();
            activeReader = reader;
            const decoder = new TextDecoder();
            let buffer = '';

            const emit = (chunk: AIRunStreamChunk) => {
              chunkCount += 1;
              controller.enqueue(chunk);
              if (isTerminalRunChunk(chunk)) terminated = true;
            };

            while (!cancelled && !terminated) {
              const { done, value } = await reader.read();
              if (done) {
                // 末尾に残ったフレームを取りこぼさない
                if (buffer.trim()) {
                  const chunk = parseAIRunSSEEvent(buffer);
                  if (chunk) emit(chunk);
                }
                break;
              }

              buffer += decoder.decode(value, { stream: true });
              const parts = buffer.split('\n\n');
              buffer = parts.pop() ?? '';

              for (const part of parts) {
                const chunk = parseAIRunSSEEvent(part);
                if (chunk) emit(chunk);
                if (terminated) break;
              }
            }

            cancelActiveReader();

            if (terminated || cancelled) break;
          } catch {
            cancelActiveReader();
            if (cancelled) break;
            // transcript 取得・購読・読み取りの失敗はすべて切断として扱う
          }

          // ─── 再接続 ───
          // スナップショットより先に進めていれば接続は確立できていたと判断し、
          // リトライ回数をリセットする（長時間 Run で試行回数を使い切らないため）
          if (chunkCount > SNAPSHOT_CHUNK_COUNT) attempt = 0;
          attempt += 1;

          if (attempt > maxAttempts) {
            controller.enqueue({
              type: 'error',
              error: `自律Runのストリームに再接続できませんでした（${maxAttempts}回試行）。状態は再読み込みで確認してください。`,
            });
            break;
          }

          const delay = delays[Math.min(attempt - 1, delays.length - 1)] ?? 0;
          controller.enqueue({ type: 'reconnecting', reconnectDelayMs: delay });
          await sleep(delay);
        }

        safeClose();
      };

      pump().catch((e) => {
        console.error('[adapter-api] run SSE pump error:', e);
        safeClose();
      });
    },
    cancel() {
      cancelled = true;
      cancelActiveReader();
    },
  });
}
