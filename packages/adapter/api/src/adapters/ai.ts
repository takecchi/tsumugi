import {
  AIAdapter,
  AIChatMode,
  AIChatRequest,
  AIChatMessageRequest,
  AIChatSession,
  AIContextPack,
  AIMessage as AdapterAIMessage,
  AIStreamChunk,
  AIProposalResult,
  AIMemory as AdapterAIMemory,
  AIProjectUsage as AdapterAIProjectUsage,
  AIProposalFeedback,
  AITextMessage,
  AIToolCallMessage,
  AIToolResultMessage,
  AIProposalMessage,
} from '@tsumugi/adapter';
import type { ApiClients } from '@/client';
import {
  ProposalResultStreamChunkFromJSON,
  type AISession as ClientAISession,
  type AIMessage as ClientAIMessage,
  type AIMemory as ClientAIMemory,
  type AIProjectUsage as ClientAIProjectUsage,
  type AIContextPack as ClientAIContextPack,
  type ChatRequest as ClientChatRequest,
  type AIProposalFeedback as ClientAIProposalFeedback,
} from '@tsumugi-chan/client';
import {
  fetchSSE,
  hasType,
  parseSSEEvent,
  parseSSEStream,
  toAIProposal,
} from '@/internal/helpers/sse';

// ─── 型変換 ───

export function toSession(api: ClientAISession): AIChatSession {
  return {
    id: api.id,
    projectId: api.projectId,
    title: api.title,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
  };
}

function toContextPack(api: ClientAIContextPack): AIContextPack {
  return {
    sections: api.sections.map((s) => ({
      tier: s.tier,
      title: s.title,
      content: s.content,
      charCount: s.charCount,
    })),
    totalCharCount: api.totalCharCount,
  };
}

function toMessage(api: ClientAIMessage): AdapterAIMessage {
  const role = api.role;
  const messageType = api.messageType;
  const base = {
    id: api.id,
    sessionId: api.sessionId,
    role,
  };

  switch (messageType) {
    case 'text': {
      const textContent = api.content
        .filter((c) => c.type === 'text')
        .map((c) => c.text)
        .join('');
      return {
        ...base,
        messageType: 'text',
        content: textContent,
      } satisfies AITextMessage;
    }
    case 'tool_call': {
      return {
        ...base,
        messageType: 'tool_call',
        content: JSON.stringify(api.content),
      } satisfies AIToolCallMessage;
    }
    // tool_result / feedback は LLM ↔ アダプター間・フロント→AI 間の内部メッセージ。
    // UI には表示しない（buildDisplayMessages が text / proposal のみ表示）ため
    // tool_result として畳み込む。
    case 'tool_result':
    case 'feedback': {
      return {
        ...base,
        messageType: 'tool_result',
        content: JSON.stringify(api.content),
      } satisfies AIToolResultMessage;
    }
    case 'proposal': {
      if (api.proposal) {
        return {
          ...base,
          messageType: 'proposal',
          proposal: toAIProposal(api.proposal),
        } satisfies AIProposalMessage;
      }
    }
  }
  return { ...base, messageType: 'text', content: '' };
}

function toMemory(api: ClientAIMemory): AdapterAIMemory {
  return {
    id: api.id,
    content: api.content,
    createdAt: api.createdAt,
  };
}

function toUsage(api: ClientAIProjectUsage): AdapterAIProjectUsage {
  return {
    projectId: api.projectId,
    sessions: api.sessions.map((s) => ({
      sessionId: s.sessionId,
      title: s.title,
      usage: {
        promptTokens: s.usage.promptTokens,
        completionTokens: s.usage.completionTokens,
        totalTokens: s.usage.totalTokens,
      },
    })),
    total: {
      promptTokens: api.total.promptTokens,
      completionTokens: api.total.completionTokens,
      totalTokens: api.total.totalTokens,
    },
  };
}

function toFeedback(feedback: ClientAIProposalFeedback): AIProposalFeedback {
  return {
    toolCallId: feedback.toolCallId,
    status: feedback.status,
    contentType: feedback.contentType,
    targetId: feedback.targetId,
    conflictDetails: feedback.conflictDetails,
  };
}

function toChatRequest(request: AIChatRequest): ClientChatRequest {
  return {
    message: request.message,
    mode: request.mode,
    revertToMessageId: request.revertToMessageId,
    config: request.config
      ? {
          model: request.config.model as ClientChatRequest['config'] extends {
            model?: infer M;
          }
            ? M
            : never,
          temperature: request.config.temperature,
          maxTokens: request.config.maxTokens,
        }
      : undefined,
    context: request.context
      ? {
          openTabs: request.context.openTabs?.map((tab) => ({
            id: tab.id,
            name: tab.name,
            contentType: tab.contentType,
            active: tab.active,
          })),
        }
      : undefined,
  };
}

// ─── AIAdapter 実装 ───

export function createAIAdapter(clients: ApiClients): AIAdapter {
  return {
    async chat(
      sessionId: string,
      request: AIChatRequest,
    ): Promise<ReadableStream<AIStreamChunk>> {
      const opts = await clients.ai.chatAIRequestOpts({
        sessionId,
        chatRequest: toChatRequest(request),
      });
      const response = await fetchSSE(clients.configuration, opts);
      return parseSSEStream(response);
    },

    async getSessions(projectId: string): Promise<AIChatSession[]> {
      const sessions = await clients.projects.getAISessions({ projectId });
      return sessions.map(toSession);
    },

    async getSession(sessionId: string): Promise<AIChatSession | null> {
      try {
        const session = await clients.ai.getAISession({ sessionId });
        return toSession(session);
      } catch {
        return null;
      }
    },

    async getMessages(sessionId: string): Promise<AdapterAIMessage[]> {
      const messages = await clients.ai.getAIMessages({ sessionId });
      return messages.map(toMessage);
    },

    async createSession(
      projectId: string,
      request: AIChatMessageRequest,
    ): Promise<{
      session: AIChatSession;
      stream: ReadableStream<AIStreamChunk>;
    }> {
      const opts = await clients.projects.createAISessionRequestOpts({
        projectId,
        createSessionRequest: {
          message: request.message,
          mode: request.mode,
          config: request.config
            ? {
                model: request.config.model as
                  | 'gpt-5.2'
                  | 'gpt-4o-mini'
                  | 'claude-3-5-haiku-latest',
                temperature: request.config.temperature,
                maxTokens: request.config.maxTokens,
              }
            : undefined,
          context: request.context
            ? {
                openTabs: request.context.openTabs?.map((tab) => ({
                  id: tab.id,
                  name: tab.name,
                  contentType: tab.contentType,
                  active: tab.active,
                })),
              }
            : undefined,
        },
      });

      // セッション作成レスポンスは 200 SSE。X-Session-Id ヘッダーで新規IDを返す。
      const response = await fetchSSE(clients.configuration, opts);

      // レスポンスヘッダからセッションIDを取得
      const newSessionId = response.headers.get('X-Session-Id');
      if (!newSessionId) {
        throw new Error(
          'X-Session-Id header not found in createSession response',
        );
      }

      const stream = parseSSEStream(response);

      // セッション情報を取得
      const session = await clients.ai.getAISession({
        sessionId: newSessionId,
      });

      return {
        session: toSession(session),
        stream,
      };
    },

    async acceptProposal(
      sessionId: string,
      toolCallId: string,
    ): Promise<AIProposalResult> {
      const opts = await clients.ai.acceptProposalRequestOpts({
        sessionId,
        toolCallId,
      });
      const response = await fetchSSE(clients.configuration, opts);
      return await parseProposalSSEResponse(response);
    },

    async rejectProposal(
      sessionId: string,
      toolCallId: string,
    ): Promise<AIProposalResult> {
      const opts = await clients.ai.rejectProposalRequestOpts({
        sessionId,
        toolCallId,
      });
      const response = await fetchSSE(clients.configuration, opts);
      return await parseProposalSSEResponse(response);
    },

    async deleteSession(sessionId: string): Promise<void> {
      await clients.ai.deleteAISession({ sessionId });
    },

    async getMemories(projectId: string): Promise<AdapterAIMemory[]> {
      const memories = await clients.projects.getAIMemories({ projectId });
      return memories.map(toMemory);
    },

    async deleteMemory(_projectId: string, memoryId: string): Promise<void> {
      await clients.ai.deleteAIMemory({ memoryId });
    },

    async getUsage(projectId: string): Promise<AdapterAIProjectUsage> {
      const usage = await clients.projects.getAIUsage({ projectId });
      return toUsage(usage);
    },

    async getContext(
      projectId: string,
      mode: AIChatMode,
    ): Promise<AIContextPack> {
      const pack = await clients.projects.getAIContext({ projectId, mode });
      return toContextPack(pack);
    },
  };
}

// ─── Proposal SSE パーサー（v2: 常に SSE） ───

/**
 * 提案の承認/拒否レスポンス（常に SSE）をパースする。
 *
 * 先頭フレームは必ず `{type:'proposal-result', result}`。
 * result.hasStream が true の場合、続くフレーム（start→text-*→finish）が
 * AI 応答ターンとして流れるので、それを result.stream として返す。
 * false の場合は続けて finish で閉じるため stream は返さない。
 */
export async function parseProposalSSEResponse(
  response: Response,
): Promise<AIProposalResult> {
  const body = response.body;
  if (!body) {
    throw new Error('No response body for proposal SSE');
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  // 先頭の proposal-result フレームを取得するまで読む
  let feedback: AIProposalFeedback | null = null;
  let hasStream = false;
  let leftoverFrames: string[] = [];

  outer: while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';

    for (let i = 0; i < parts.length; i++) {
      const dataLine = parts[i].split('\n').find((l) => l.startsWith('data: '));
      if (!dataLine) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(dataLine.slice(6));
      } catch {
        continue;
      }
      if (hasType(parsed) && parsed.type === 'proposal-result') {
        const result = ProposalResultStreamChunkFromJSON(parsed).result;
        feedback = toFeedback(result.feedback);
        hasStream = result.hasStream;
        // proposal-result と同じバッチに含まれる後続フレームは AI 応答へ引き継ぐ
        leftoverFrames = parts.slice(i + 1);
        break outer;
      }
    }
  }

  if (!feedback) {
    // proposal-result が来ずに終了した（想定外）
    await reader.cancel().catch((e) => {
      console.error('[adapter-api] Failed to cancel proposal SSE reader:', e);
    });
    throw new Error('proposal-result chunk not found in proposal SSE response');
  }

  if (!hasStream) {
    await reader.cancel().catch((e) => {
      console.error('[adapter-api] Failed to cancel proposal SSE reader:', e);
    });
    return { feedback };
  }

  // hasStream: 残り（未処理フレーム + 以降の read）を AI 応答ストリームとして返す
  const stream = new ReadableStream<AIStreamChunk>({
    start(controller) {
      const pump = async () => {
        try {
          for (const part of leftoverFrames) {
            const chunk = parseSSEEvent(part);
            if (chunk) controller.enqueue(chunk);
          }
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              if (buffer.trim()) {
                const chunk = parseSSEEvent(buffer);
                if (chunk) controller.enqueue(chunk);
              }
              controller.close();
              return;
            }
            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split('\n\n');
            buffer = parts.pop() ?? '';
            for (const part of parts) {
              const chunk = parseSSEEvent(part);
              if (chunk) controller.enqueue(chunk);
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
      pump().catch((e) => {
        console.error('[adapter-api] proposal SSE pump error:', e);
      });
    },
    cancel() {
      reader.cancel().catch((e) => {
        console.error('[adapter-api] Failed to cancel proposal SSE reader:', e);
      });
    },
  });

  return { feedback, stream };
}
