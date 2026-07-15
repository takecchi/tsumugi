import { useAdapter } from '~/hooks/useAdapter';
import useSWR, { type SWRConfiguration } from 'swr';
import useSWRMutation from 'swr/mutation';
import type {
  AIChatMode,
  AIChatSession,
  AIContextPack,
  AIMemory,
  AIMessage,
  AIChatMessageRequest,
  AIChatRequest,
  AIProjectUsage,
  AIStreamChunk,
  AIProposalResult,
} from '@tsumugi/adapter';

interface AISessionsKey {
  type: 'aiSessions';
  projectId: string;
}

/**
 * プロジェクト内のAIセッション一覧を取得する
 * @param projectId - プロジェクトID
 */
export function useAISessions(projectId: string) {
  const adapter = useAdapter();
  return useSWR<AIChatSession[], Error, AISessionsKey>(
    { type: 'aiSessions', projectId },
    ({ projectId }) => adapter.ai.getSessions(projectId),
  );
}

interface AIMessagesKey {
  type: 'aiMessages';
  sessionId: string;
}

/**
 * セッションのメッセージ一覧を取得する
 * @param sessionId - セッションID
 */
export function useAIMessages(sessionId: string) {
  const adapter = useAdapter();
  return useSWR<AIMessage[], Error, AIMessagesKey>(
    { type: 'aiMessages', sessionId },
    ({ sessionId }) => adapter.ai.getMessages(sessionId),
  );
}

/**
 * AIセッションを作成し、初回メッセージを送信する
 * @param projectId - プロジェクトID
 * @revalidates useAISessions - AIセッション一覧を再フェッチする
 */
export function useCreateAISession(projectId: string) {
  const adapter = useAdapter();
  return useSWRMutation<
    { session: AIChatSession; stream: ReadableStream<AIStreamChunk> },
    Error,
    AISessionsKey,
    AIChatMessageRequest
  >({ type: 'aiSessions', projectId }, ({ projectId }, { arg }) =>
    adapter.ai.createSession(projectId, arg),
  );
}

/**
 * AIチャットメッセージを送信し、ストリーミングレスポンスを取得する
 * @param sessionId - セッションID
 * @revalidates useAIMessages - メッセージ一覧を再フェッチする
 */
export function useAIChat(sessionId: string) {
  const adapter = useAdapter();
  return useSWRMutation<
    ReadableStream<AIStreamChunk>,
    Error,
    AIMessagesKey,
    AIChatRequest
  >({ type: 'aiMessages', sessionId }, ({ sessionId }, { arg }) =>
    adapter.ai.chat(sessionId, arg),
  );
}

/**
 * AIの変更提案を承認する
 * @param sessionId - セッションID
 * @revalidates useAIMessages - メッセージ一覧を再フェッチする
 */
export function useAcceptProposal(sessionId: string) {
  const adapter = useAdapter();
  return useSWRMutation<AIProposalResult, Error, AIMessagesKey, string>(
    { type: 'aiMessages', sessionId },
    ({ sessionId }, { arg: proposalId }) =>
      adapter.ai.acceptProposal(sessionId, proposalId),
  );
}

/**
 * AIの変更提案を拒否する
 * @param sessionId - セッションID
 * @revalidates useAIMessages - メッセージ一覧を再フェッチする
 */
export function useRejectProposal(sessionId: string) {
  const adapter = useAdapter();
  return useSWRMutation<AIProposalResult, Error, AIMessagesKey, string>(
    { type: 'aiMessages', sessionId },
    ({ sessionId }, { arg: proposalId }) =>
      adapter.ai.rejectProposal(sessionId, proposalId),
  );
}

interface AIContextKey {
  type: 'aiContext';
  projectId: string;
  mode: AIChatMode;
}

/**
 * AIに渡るコンテキスト一式（プレビュー）を取得する
 * @param projectId - プロジェクトID
 * @param mode - チャットモード（ask/write でコンテキストが変わる）
 * @param config
 */
export function useAIContext(
  projectId: string,
  mode: AIChatMode,
  config?: SWRConfiguration<AIContextPack, Error>,
) {
  const adapter = useAdapter();
  return useSWR<AIContextPack, Error, AIContextKey>(
    { type: 'aiContext', projectId, mode },
    ({ projectId, mode }) => adapter.ai.getContext(projectId, mode),
    config,
  );
}

interface AIUsageKey {
  type: 'aiUsage';
  projectId: string;
}

/**
 * プロジェクトのAIトークン使用量を取得する
 * @param projectId - プロジェクトID
 * @param config
 */
export function useAIUsage(
  projectId: string,
  config?: SWRConfiguration<AIProjectUsage, Error>,
) {
  const adapter = useAdapter();
  return useSWR<AIProjectUsage, Error, AIUsageKey>(
    { type: 'aiUsage', projectId },
    ({ projectId }) => adapter.ai.getUsage(projectId),
    config,
  );
}

interface AIMemoriesKey {
  type: 'aiMemories';
  projectId: string;
}

/**
 * プロジェクトのAIメモリ一覧を取得する
 * @param projectId - プロジェクトID
 * @param config
 */
export function useAIMemories(
  projectId: string,
  config?: SWRConfiguration<AIMemory[], Error>,
) {
  const adapter = useAdapter();
  return useSWR<AIMemory[], Error, AIMemoriesKey>(
    { type: 'aiMemories', projectId },
    ({ projectId }) => adapter.ai.getMemories(projectId),
    config,
  );
}

/**
 * AIメモリを削除する
 * @param projectId - プロジェクトID
 * @revalidates useAIMemories - AIメモリ一覧を再フェッチする
 */
export function useDeleteAIMemory(projectId: string) {
  const adapter = useAdapter();
  return useSWRMutation<undefined, Error, AIMemoriesKey, string>(
    { type: 'aiMemories', projectId },
    async ({ projectId }, { arg: memoryId }) => {
      await adapter.ai.deleteMemory(projectId, memoryId);
      return undefined;
    },
  );
}
