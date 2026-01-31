import type {
  AIAdapter,
  AIAdapterConfig,
  AIChatMessageRequest,
  AIChatRequest,
  AIChatSession,
  AIMessage,
  AIProposalFeedback,
  AIProposalResult,
  AIProjectUsage,
  AITokenUsage,
  AIStreamChunk,
} from '@tsumugi/adapter';
import { ensureDir, join, listDir, readJson, removeDir, writeJson } from '@/internal/utils/fs';
import { now } from '@/internal/utils/id';
import { toAIMessage, type SessionJson, type MessageJson } from '@/internal/helpers/ai-logic';
import type { ToolAdapters } from './ai-tools';
import { generateTitle } from '@/internal/helpers/ai-summary';
import { readMemories, removeMemory } from '@/internal/helpers/ai-memory';
import { getSessionsDir, getProjectIdFromSessionPath, rejectAllPendingProposals, updateProposalStatusInMessages } from '@/internal/helpers/ai-session';
import { createChatStream } from '@/internal/helpers/ai-stream';
import { executeAcceptProposal, buildProposalResult } from '@/internal/helpers/ai-proposal';

export function createAIAdapter(aiConfig?: AIAdapterConfig, toolAdapters?: ToolAdapters): AIAdapter {
  const getConfig = (): AIAdapterConfig => {
    if (!aiConfig) {
      throw new Error('AI adapter config is not provided. Pass ai config via AdapterConfig.local.ai.');
    }
    return aiConfig;
  };

  const getToolAdapters = (): ToolAdapters => {
    if (!toolAdapters) {
      throw new Error('Tool adapters are not provided.');
    }
    return toolAdapters;
  };

  return {
    async chat(sessionId: string, request: AIChatRequest): Promise<ReadableStream<AIStreamChunk>> {
      const config = getConfig();
      const sessionDir = sessionId;
      const sessionPath = await join(sessionDir, 'session.json');
      const sessionJson = await readJson<SessionJson>(sessionPath);

      if (!sessionJson) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      const messagesPath = await join(sessionDir, 'messages.json');
      let messages = (await readJson<MessageJson[]>(messagesPath)) ?? [];

      // リバート処理
      if (request.revertToMessageId) {
        const revertIndex = messages.findIndex((_, i) => `${sessionId}#${i}` === request.revertToMessageId);
        if (revertIndex === -1) {
          throw new Error(`Message not found for revert: ${request.revertToMessageId}`);
        }
        messages = messages.slice(0, revertIndex + 1);
      }

      // pending 提案が残っていれば自動的にすべて拒否する
      await rejectAllPendingProposals(sessionId);

      return await createChatStream(config, request, sessionDir, sessionJson, messages, getProjectIdFromSessionPath(sessionId), getToolAdapters());
    },

    async getSessions(projectId: string): Promise<AIChatSession[]> {
      const sessionsDir = await getSessionsDir(projectId);
      await ensureDir(sessionsDir);

      const dirs = await listDir(sessionsDir);
      const sessions: AIChatSession[] = [];

      for (const dirName of dirs) {
        const sessionDir = await join(sessionsDir, dirName);
        const sessionPath = await join(sessionDir, 'session.json');
        const json = await readJson<SessionJson>(sessionPath);
        if (json) {
          sessions.push({
            id: sessionDir,
            projectId,
            title: json.title,
            createdAt: new Date(json.createdAt),
            updatedAt: new Date(json.updatedAt),
            totalUsage: json.usage,
          });
        }
      }

      return sessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    },

    async getSession(sessionId: string): Promise<AIChatSession | null> {
      const sessionPath = await join(sessionId, 'session.json');
      const json = await readJson<SessionJson>(sessionPath);
      if (!json) return null;

      return {
        id: sessionId,
        projectId: getProjectIdFromSessionPath(sessionId),
        title: json.title,
        createdAt: new Date(json.createdAt),
        updatedAt: new Date(json.updatedAt),
        totalUsage: json.usage,
      };
    },

    async getMessages(sessionId: string): Promise<AIMessage[]> {
      const messagesPath = await join(sessionId, 'messages.json');
      const messages = (await readJson<MessageJson[]>(messagesPath)) ?? [];
      return messages.map((m, i) => toAIMessage(m, i, sessionId));
    },

    async createSession(projectId: string, request: AIChatMessageRequest): Promise<{ session: AIChatSession; stream: ReadableStream<AIStreamChunk> }> {
      const config = getConfig();
      const dirName = crypto.randomUUID();
      const timestamp = now();

      // 仮タイトル（軽量モデルで並行生成し後から更新）
      const placeholderTitle = request.message.slice(0, 20) + (request.message.length > 20 ? '...' : '');

      const sessionsDir = await getSessionsDir(projectId);
      const sessionDir = await join(sessionsDir, dirName);
      await ensureDir(sessionDir);

      const sessionJson: SessionJson = {
        title: placeholderTitle,
        createdAt: timestamp.toISOString(),
        updatedAt: timestamp.toISOString(),
      };

      const sessionPath = await join(sessionDir, 'session.json');
      await writeJson(sessionPath, sessionJson);

      const messagesPath = await join(sessionDir, 'messages.json');
      await writeJson(messagesPath, []);

      const session: AIChatSession = {
        id: sessionDir,
        projectId,
        title: placeholderTitle,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      const stream = await createChatStream(config, request, sessionDir, sessionJson, [], projectId, getToolAdapters());

      // 軽量モデルでタイトルを並行生成（fire-and-forget）
      generateTitle(config, request.message, sessionDir).catch((e) =>
        console.error('Failed to generate title:', e),
      );

      return { session, stream };
    },

    async acceptProposal(sessionId: string, proposalId: string): Promise<AIProposalResult> {
      return await executeAcceptProposal(sessionId, proposalId, getConfig, getToolAdapters);
    },

    async rejectProposal(sessionId: string, proposalId: string): Promise<AIProposalResult> {
      await updateProposalStatusInMessages(sessionId, proposalId, 'rejected');
      const feedback: AIProposalFeedback = { proposalId, status: 'rejected' };
      return await buildProposalResult(sessionId, feedback, getConfig, getToolAdapters);
    },

    async deleteSession(sessionId: string): Promise<void> {
      await removeDir(sessionId);
    },

    async getMemories(projectId: string) {
      const memories = await readMemories(projectId);
      return memories.map((m) => ({
        id: m.id,
        content: m.content,
        createdAt: new Date(m.createdAt),
      }));
    },

    async deleteMemory(projectId: string, memoryId: string) {
      const deleted = await removeMemory(projectId, memoryId);
      if (!deleted) {
        throw new Error(`メモリが見つかりません: ${memoryId}`);
      }
    },

    async getUsage(projectId: string): Promise<AIProjectUsage> {
      const sessionsDir = await getSessionsDir(projectId);
      await ensureDir(sessionsDir);

      const dirs = await listDir(sessionsDir);
      const sessionUsages: AIProjectUsage['sessions'] = [];
      const total: AITokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

      for (const dirName of dirs) {
        const sessionDir = await join(sessionsDir, dirName);
        const sessionPath = await join(sessionDir, 'session.json');
        const json = await readJson<SessionJson>(sessionPath);
        if (json?.usage) {
          sessionUsages.push({
            sessionId: sessionDir,
            title: json.title,
            usage: json.usage,
          });
          total.promptTokens += json.usage.promptTokens;
          total.completionTokens += json.usage.completionTokens;
          total.totalTokens += json.usage.totalTokens;
        }
      }

      return { projectId, sessions: sessionUsages, total };
    },
  };
}
