import type {
  AIAdapter,
  AIChatRequest,
  AIChatMessageRequest,
  AIChatSession,
  AIMessage as AdapterAIMessage,
  AIStreamChunk,
  AIProposalResult,
  AIMemory as AdapterAIMemory,
  AIProjectUsage as AdapterAIProjectUsage,
  AIProposal,
  AIProposalStatus,
  AIRole,
  AIMessageType,
  AIProposalFeedback,
  EditorTabType,
} from '@tsumugi/adapter';
import type { ApiClients } from '@/client';
import type {
  AISession as ClientAISession,
  AIMessage as ClientAIMessage,
  AIMemory as ClientAIMemory,
  AIProjectUsage as ClientAIProjectUsage,
  AIProposalResult as ClientAIProposalResult,
  AIProposalFeedback as ClientAIProposalFeedback,
  ChatRequest as ClientChatRequest,
} from '@tsumugi-chan/client';
import { fetchSSE, parseSSEStream } from '@/internal/helpers/sse';

// ─── 型変換 ───

function toSession(api: ClientAISession): AIChatSession {
  return {
    id: api.id,
    projectId: api.projectId,
    title: api.title,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
  };
}

function toMessage(api: ClientAIMessage): AdapterAIMessage {
  const role = api.role as AIRole;
  const messageType = api.messageType as AIMessageType;
  const base = {
    id: api.id,
    sessionId: api.sessionId,
    role,
  };

  switch (messageType) {
    case 'text': {
      const textContent = api.content
        .filter((c) => c.type === 'text')
        .map((c) => (c as { type: 'text'; text: string }).text)
        .join('');
      return { ...base, messageType: 'text', content: textContent };
    }
    case 'tool_call': {
      return { ...base, messageType: 'tool_call', content: JSON.stringify(api.content) };
    }
    case 'tool_result': {
      return { ...base, messageType: 'tool_result', content: JSON.stringify(api.content) };
    }
    case 'proposal': {
      return {
        ...base,
        messageType: 'proposal',
        proposal: (api.proposal ?? {}) as AIProposal,
        proposalStatus: (api.proposalStatus ?? 'pending') as AIProposalStatus,
      };
    }
    default:
      return { ...base, messageType: 'text', content: '' };
  }
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

function toFeedback(api: ClientAIProposalFeedback): AIProposalFeedback {
  return {
    proposalId: api.proposalId,
    status: api.status as AIProposalFeedback['status'],
    contentType: api.contentType as EditorTabType | undefined,
    targetId: api.targetId,
    conflictDetails: api.conflictDetails,
  };
}

function toChatRequest(request: AIChatRequest): ClientChatRequest {
  return {
    message: request.message,
    mode: request.mode,
    revertToMessageId: request.revertToMessageId,
    config: request.config
      ? {
          model: request.config.model as ClientChatRequest['config'] extends { model?: infer M } ? M : never,
          temperature: request.config.temperature,
          maxTokens: request.config.maxTokens,
        }
      : undefined,
    context: request.context
      ? {
          openTabs: request.context.openTabs?.map((tab) => ({
            id: tab.id,
            name: tab.name,
            contentType: tab.contentType as 'plot' | 'character' | 'memo' | 'writing' | 'project',
            active: tab.active,
          })),
        }
      : undefined,
  };
}

// ─── AIAdapter 実装 ───

export function createAIAdapter(clients: ApiClients): AIAdapter {
  return {
    async chat(sessionId: string, request: AIChatRequest): Promise<ReadableStream<AIStreamChunk>> {
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
    ): Promise<{ session: AIChatSession; stream: ReadableStream<AIStreamChunk> }> {
      const opts = await clients.projects.createAISessionRequestOpts({
        projectId,
        createSessionRequest: {
          message: request.message,
          mode: request.mode,
          config: request.config
            ? {
                model: request.config.model as 'gpt-5.2' | 'gpt-4o-mini' | 'claude-3-5-haiku-latest',
                temperature: request.config.temperature,
                maxTokens: request.config.maxTokens,
              }
            : undefined,
          context: request.context
            ? {
                openTabs: request.context.openTabs?.map((tab) => ({
                  id: tab.id,
                  name: tab.name,
                  contentType: tab.contentType as 'plot' | 'character' | 'memo' | 'writing' | 'project',
                  active: tab.active,
                })),
              }
            : undefined,
        },
      });

      const response = await fetchSSE(clients.configuration, opts);

      // レスポンスヘッダからセッションIDを取得
      const newSessionId = response.headers.get('X-Session-Id');
      if (!newSessionId) {
        throw new Error('X-Session-Id header not found in createSession response');
      }

      const stream = parseSSEStream(response);

      // セッション情報を取得
      const session = await clients.ai.getAISession({ sessionId: newSessionId });

      return {
        session: toSession(session),
        stream,
      };
    },

    async acceptProposal(sessionId: string, proposalId: string): Promise<AIProposalResult> {
      const opts = await clients.ai.acceptProposalRequestOpts({ sessionId, proposalId });
      const response = await fetchSSE(clients.configuration, opts);

      const contentType = response.headers.get('Content-Type') ?? '';

      if (contentType.includes('text/event-stream')) {
        // SSE: proposal_result イベント + 後続ストリーム
        return await parseProposalSSEResponse(response);
      }

      // 通常 JSON レスポンス（ストリームなし）
      const json = await response.json() as ClientAIProposalResult;
      return {
        feedback: toFeedback(json.feedback),
      };
    },

    async rejectProposal(sessionId: string, proposalId: string): Promise<AIProposalResult> {
      const opts = await clients.ai.rejectProposalRequestOpts({ sessionId, proposalId });
      const response = await fetchSSE(clients.configuration, opts);

      const contentType = response.headers.get('Content-Type') ?? '';

      if (contentType.includes('text/event-stream')) {
        return await parseProposalSSEResponse(response);
      }

      const json = await response.json() as ClientAIProposalResult;
      return {
        feedback: toFeedback(json.feedback),
      };
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
  };
}

// ─── Proposal SSE パーサー ───

async function parseProposalSSEResponse(response: Response): Promise<AIProposalResult> {
  const body = response.body;
  if (!body) {
    throw new Error('No response body for proposal SSE');
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let feedbackResolved = false;
  let resolveFeedback: (value: AIProposalFeedback) => void = () => {
    console.warn('[adapter-api] resolveFeedback called before Promise executor assigned it');
  };

  const feedbackPromise = new Promise<AIProposalFeedback>((resolve) => {
    resolveFeedback = resolve;
  });

  const ctrl: { current: ReadableStreamDefaultController<AIStreamChunk> | null } = { current: null };

  const stream = new ReadableStream<AIStreamChunk>({
    start(controller) {
      ctrl.current = controller;
    },
    cancel() {
      reader.cancel().catch((e) => {
        console.error('[adapter-api] Failed to cancel proposal SSE reader:', e);
      });
    },
  });

  // バックグラウンドで読み取りを開始
  void (async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          ctrl.current?.close();
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          if (!part.trim()) continue;

          if (!feedbackResolved && part.startsWith('event: proposal_result')) {
            const dataLine = part.split('\n').find((l) => l.startsWith('data: '));
            if (dataLine) {
              feedbackResolved = true;
              const resultJson = JSON.parse(dataLine.slice(6)) as ClientAIProposalResult;
              resolveFeedback(toFeedback(resultJson.feedback));
            }
            continue;
          }

          // 通常の SSE data イベント
          const dataLine = part.split('\n').find((l) => l.startsWith('data: '));
          if (dataLine) {
            try {
              const chunkData = JSON.parse(dataLine.slice(6));
              const chunk = chunkData as AIStreamChunk;
              ctrl.current?.enqueue(chunk);
            } catch {
              // ignore parse errors
            }
          }
        }
      }
    } catch {
      ctrl.current?.close();
    }
  })();

  // proposal_result イベントが到着するまで待つ
  const feedback = await feedbackPromise;

  return {
    feedback,
    stream,
  };
}
