import { useState, useMemo, useCallback } from 'react';
import {
  AiPanel,
  AiPanelContent,
  AiPanelInput,
  type AiMode,
  type Conversation,
} from '@tsumugi/ui';
import { useAISessions, useAIMessages, useCreateAISession, useAIChat, useAcceptProposal, useRejectProposal } from '~/hooks/ai';
import { useProjectSettings, useUpdateProjectSettings } from '~/hooks/settings';
import { useSWRConfig } from 'swr';
import type { AIChatContext } from '@tsumugi/adapter';
import type { EditorTab } from '@tsumugi/ui';
import { consumeStream, toContentItemKey, toContentTreeKey, buildDisplayMessages } from '../_utils/ai-panel-utils';
import { useAiStreamingState } from '../_hooks/useAiStreamingState';

interface WorkspaceAiPanelProps {
  projectId: string;
  openTabs?: EditorTab[];
}

/**
 * 新規セッション用コンテンツ（sessionId 未確定）
 * 初回メッセージ送信 → createSession → onSessionCreated で親に通知
 */
function NewSessionContent({
  projectId,
  onSessionCreated,
  context,
  aiMode,
  onModeChange,
}: {
  projectId: string;
  onSessionCreated: (sessionId: string) => void;
  context?: AIChatContext;
  aiMode: AiMode;
  onModeChange: (mode: AiMode) => void;
}) {
  const { trigger: triggerCreateSession } = useCreateAISession(projectId);
  const {
    isLoading, streamingContent, pendingUserMessage, streamingProposals,
    setIsLoading, setStreamingContent, setPendingUserMessage,
    handleToolResult, handleProposal,
  } = useAiStreamingState(projectId);

  const currentMessages = useMemo(
    () => buildDisplayMessages(undefined, pendingUserMessage, streamingContent, streamingProposals),
    [pendingUserMessage, streamingContent, streamingProposals],
  );

  const handleSend = async (message: string) => {
    const request = {
      message,
      mode: aiMode === 'write' ? ('write' as const) : ('ask' as const),
      context,
    };

    setPendingUserMessage(message);
    setIsLoading(true);
    setStreamingContent('');

    try {
      const result = await triggerCreateSession(request);
      await consumeStream(result.stream, setStreamingContent, handleToolResult, handleProposal);
      onSessionCreated(result.session.id);
    } catch (e) {
      console.error('Failed to send message:', e);
      setStreamingContent(`エラーが発生しました: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setPendingUserMessage(null);
      setStreamingContent(null);
      setIsLoading(false);
    }
  };

  return (
    <>
      <AiPanelContent
        messages={currentMessages}
        description={
          aiMode === 'write'
            ? '文章の執筆をお手伝いします。\n書いてほしい内容を教えてください。'
            : '質問があればお気軽にどうぞ。'
        }
        onAcceptProposal={() => {}}
        onRejectProposal={() => {}}
        isLoading={isLoading}
      />
      <AiPanelInput mode={aiMode} onModeChange={onModeChange} onSend={handleSend} isLoading={isLoading} />
    </>
  );
}

/**
 * 既存セッション用コンテンツ（sessionId 確定済み）
 */
function ExistingSessionContent({
  projectId,
  sessionId,
  context,
  aiMode,
  onModeChange,
}: {
  projectId: string;
  sessionId: string;
  context?: AIChatContext;
  aiMode: AiMode;
  onModeChange: (mode: AiMode) => void;
}) {
  const { data: messages, mutate: mutateMessages } = useAIMessages(sessionId);
  const { mutate: globalMutate } = useSWRConfig();
  const { trigger: triggerChat } = useAIChat(sessionId);
  const { trigger: triggerAccept } = useAcceptProposal(sessionId);
  const { trigger: triggerReject } = useRejectProposal(sessionId);
  const {
    isLoading, streamingContent, pendingUserMessage, streamingProposals,
    setIsLoading, setStreamingContent, setPendingUserMessage, setStreamingProposals,
    handleToolResult, handleProposal,
  } = useAiStreamingState(projectId);

  const currentMessages = useMemo(
    () => buildDisplayMessages(messages, pendingUserMessage, streamingContent, streamingProposals),
    [messages, pendingUserMessage, streamingContent, streamingProposals],
  );

  /**
   * 提案を承認（サイレント）
   * 全提案処理済みの場合、adapter が自動で AI 応答ストリームを返すのでそれを消費する。
   */
  const handleAcceptProposal = useCallback(async (proposalId: string) => {
    const result = await triggerAccept(proposalId);
    await mutateMessages();
    if (result.feedback.status === 'accepted' && result.feedback.contentType) {
      if (result.feedback.contentType === 'project') {
        void globalMutate({ type: 'project', id: projectId });
      } else {
        if (result.feedback.targetId) {
          void globalMutate(toContentItemKey(result.feedback.contentType, result.feedback.targetId));
        }
        void globalMutate(toContentTreeKey(result.feedback.contentType, projectId));
      }
    }
    if (result.stream) {
      setIsLoading(true);
      setStreamingContent('');
      try {
        await consumeStream(result.stream, setStreamingContent, handleToolResult, handleProposal);
        await mutateMessages();
        setStreamingProposals([]);
      } catch (e) {
        console.error('Failed to consume auto feedback stream:', e);
      } finally {
        setStreamingContent(null);
        setIsLoading(false);
      }
    }
  }, [triggerAccept, mutateMessages, globalMutate, projectId, handleToolResult, handleProposal]);

  /**
   * 提案を拒否（サイレント）
   * 全提案処理済みの場合、adapter が自動で AI 応答ストリームを返すのでそれを消費する。
   */
  const handleRejectProposal = useCallback(async (proposalId: string) => {
    const result = await triggerReject(proposalId);
    await mutateMessages();
    if (result.stream) {
      setIsLoading(true);
      setStreamingContent('');
      try {
        await consumeStream(result.stream, setStreamingContent, handleToolResult, handleProposal);
        await mutateMessages();
        setStreamingProposals([]);
      } catch (e) {
        console.error('Failed to consume auto feedback stream:', e);
      } finally {
        setStreamingContent(null);
        setIsLoading(false);
      }
    }
  }, [triggerReject, mutateMessages, handleToolResult, handleProposal]);

  const handleSend = async (message: string) => {
    const request = {
      message,
      mode: aiMode === 'write' ? ('write' as const) : ('ask' as const),
      context,
    };

    setPendingUserMessage(message);
    setIsLoading(true);
    setStreamingContent('');

    try {
      const stream = await triggerChat(request);
      await consumeStream(stream, setStreamingContent, handleToolResult, handleProposal);
      await mutateMessages();
      setStreamingProposals([]);
    } catch (e) {
      console.error('Failed to send message:', e);
      setStreamingContent(`エラーが発生しました: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setPendingUserMessage(null);
      setStreamingContent(null);
      setIsLoading(false);
    }
  };

  return (
    <>
      <AiPanelContent
        messages={currentMessages}
        description={
          aiMode === 'write'
            ? '文章の執筆をお手伝いします。\n書いてほしい内容を教えてください。'
            : '質問があればお気軽にどうぞ。'
        }
        onAcceptProposal={handleAcceptProposal}
        onRejectProposal={handleRejectProposal}
        isLoading={isLoading}
      />
      <AiPanelInput mode={aiMode} onModeChange={onModeChange} onSend={handleSend} isLoading={isLoading} />
    </>
  );
}

export function WorkspaceAiPanel({ projectId, openTabs }: WorkspaceAiPanelProps) {
  const { data: sessions } = useAISessions(projectId);
  const { data: settings } = useProjectSettings(projectId);
  const { trigger: triggerUpdateSettings } = useUpdateProjectSettings(projectId);
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>();

  const aiMode: AiMode = settings?.aiChatMode ?? 'ask';
  const handleModeChange = useCallback(
    (mode: AiMode) => {
      void triggerUpdateSettings({ aiChatMode: mode });
    },
    [triggerUpdateSettings],
  );

  const conversations: Conversation[] = useMemo(() => {
    if (!sessions) return [];
    return sessions.map((s) => ({
      id: s.id,
      title: s.title,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
  }, [sessions]);

  return (
    <AiPanel
      conversations={conversations}
      currentConversationId={currentConversationId}
      onNewConversation={() => setCurrentConversationId(undefined)}
      onSelectConversation={setCurrentConversationId}
    >
      {currentConversationId ? (
        <ExistingSessionContent
          projectId={projectId}
          sessionId={currentConversationId}
          aiMode={aiMode}
          onModeChange={handleModeChange}
          context={
            openTabs?.length
              ? {
                  openTabs: openTabs.map((t) => ({ id: t.id, name: t.name, contentType: t.type, ...(t.active ? { active: true } : {}) })),
                }
              : undefined
          }
        />
      ) : (
        <NewSessionContent
          projectId={projectId}
          onSessionCreated={setCurrentConversationId}
          aiMode={aiMode}
          onModeChange={handleModeChange}
          context={
            openTabs?.length
              ? {
                  openTabs: openTabs.map((t) => ({ id: t.id, name: t.name, contentType: t.type, ...(t.active ? { active: true } : {}) })),
                }
              : undefined
          }
        />
      )}
    </AiPanel>
  );
}
