import { useState, useMemo, useCallback } from 'react';
import {
  AiPanel,
  AiPanelContent,
  AiPanelInput,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  type AiMode,
  type Conversation,
} from '@tsumugi/ui';
import { ContextPreviewWrapper } from './context-preview-wrapper';
import { AIUsageWrapper } from './ai-usage-wrapper';
import { AIMemoryWrapper } from './ai-memory-wrapper';
import {
  useAISessions,
  useAIMessages,
  useCreateAISession,
  useAIChat,
  useAcceptProposal,
  useRejectProposal,
} from '~/hooks/ai';
import { useProjectSettings, useUpdateProjectSettings } from '~/hooks/settings';
import { useSWRConfig } from 'swr';
import type { AIChatContext, AIModelConfig } from '@tsumugi/adapter';
import type { EditorTab } from '@tsumugi/ui';
import { AI_MODELS } from '~/constants/ai-models';
import {
  consumeStream,
  toContentItemKey,
  toContentTreeKey,
  buildDisplayMessages,
} from '../_utils/ai-panel-utils';
import { useAiStreamingState } from '../_hooks/useAiStreamingState';

interface WorkspaceAiPanelProps {
  projectId: string;
  openTabs?: EditorTab[];
}

/**
 * モデル設定（core型）を組み立てる。
 * model / temperature はそれぞれ独立に指定でき、未設定のものは含めない
 * （温度だけ変えてモデルは既定のまま、も可能）。両方未設定なら undefined を返す。
 */
function buildConfig(
  model: string | undefined,
  temperature: number | undefined,
): AIModelConfig | undefined {
  if (!model && temperature == null) return undefined;
  const config: AIModelConfig = {};
  if (model) config.model = model;
  if (temperature != null) config.temperature = temperature;
  return config;
}

/**
 * モデル設定に関する共通 props（NewSession / ExistingSession で共有）
 */
interface ModelConfigProps {
  model?: string;
  temperature?: number;
  onModelChange: (model: string) => void;
  onTemperatureChange: (temperature: number) => void;
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
  model,
  temperature,
  onModelChange,
  onTemperatureChange,
}: {
  projectId: string;
  onSessionCreated: (sessionId: string) => void;
  context?: AIChatContext;
  aiMode: AiMode;
  onModeChange: (mode: AiMode) => void;
} & ModelConfigProps) {
  const { trigger: triggerCreateSession } = useCreateAISession(projectId);
  const {
    isLoading,
    streamingContent,
    pendingUserMessage,
    streamingProposals,
    setIsLoading,
    setStreamingContent,
    setPendingUserMessage,
    handleToolResult,
    handleProposal,
  } = useAiStreamingState(projectId);

  const currentMessages = useMemo(
    () =>
      buildDisplayMessages(
        undefined,
        pendingUserMessage,
        streamingContent,
        streamingProposals,
      ),
    [pendingUserMessage, streamingContent, streamingProposals],
  );

  const handleSend = async (message: string) => {
    const request = {
      message,
      mode: aiMode === 'write' ? ('write' as const) : ('ask' as const),
      context,
      config: buildConfig(model, temperature),
    };

    setPendingUserMessage(message);
    setIsLoading(true);
    setStreamingContent('');

    try {
      const result = await triggerCreateSession(request);
      await consumeStream(
        result.stream,
        setStreamingContent,
        handleToolResult,
        handleProposal,
      );
      onSessionCreated(result.session.id);
    } catch (e) {
      console.error('Failed to send message:', e);
      setStreamingContent(
        `エラーが発生しました: ${e instanceof Error ? e.message : String(e)}`,
      );
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
      <AiPanelInput
        mode={aiMode}
        onModeChange={onModeChange}
        onSend={handleSend}
        isLoading={isLoading}
        model={model}
        models={AI_MODELS}
        onModelChange={onModelChange}
        temperature={temperature}
        onTemperatureChange={onTemperatureChange}
      />
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
  model,
  temperature,
  onModelChange,
  onTemperatureChange,
}: {
  projectId: string;
  sessionId: string;
  context?: AIChatContext;
  aiMode: AiMode;
  onModeChange: (mode: AiMode) => void;
} & ModelConfigProps) {
  const [revertToMessageId, setRevertToMessageId] = useState<
    string | undefined
  >();
  const { data: messages, mutate: mutateMessages } = useAIMessages(sessionId);
  const { mutate: globalMutate } = useSWRConfig();
  const { trigger: triggerChat } = useAIChat(sessionId);
  const { trigger: triggerAccept } = useAcceptProposal(sessionId);
  const { trigger: triggerReject } = useRejectProposal(sessionId);
  const {
    isLoading,
    streamingContent,
    pendingUserMessage,
    streamingProposals,
    setIsLoading,
    setStreamingContent,
    setPendingUserMessage,
    setStreamingProposals,
    handleToolResult,
    handleProposal,
  } = useAiStreamingState(projectId);

  const currentMessages = useMemo(
    () =>
      buildDisplayMessages(
        messages,
        pendingUserMessage,
        streamingContent,
        streamingProposals,
      ),
    [messages, pendingUserMessage, streamingContent, streamingProposals],
  );

  /**
   * 提案を承認（サイレント）
   * 全提案処理済みの場合、adapter が自動で AI 応答ストリームを返すのでそれを消費する。
   */
  const handleAcceptProposal = useCallback(
    async (proposalId: string) => {
      const result = await triggerAccept(proposalId);
      await mutateMessages();
      if (
        result.feedback.status === 'accepted' &&
        result.feedback.contentType
      ) {
        if (result.feedback.contentType === 'project') {
          void globalMutate({ type: 'project', id: projectId });
        } else {
          if (result.feedback.targetId) {
            void globalMutate(
              toContentItemKey(
                result.feedback.contentType,
                result.feedback.targetId,
              ),
            );
          }
          void globalMutate(
            toContentTreeKey(result.feedback.contentType, projectId),
          );
        }
      }
      if (result.stream) {
        setIsLoading(true);
        setStreamingContent('');
        try {
          await consumeStream(
            result.stream,
            setStreamingContent,
            handleToolResult,
            handleProposal,
          );
          await mutateMessages();
          setStreamingProposals([]);
        } catch (e) {
          console.error('Failed to consume auto feedback stream:', e);
        } finally {
          setStreamingContent(null);
          setIsLoading(false);
        }
      }
    },
    [
      triggerAccept,
      mutateMessages,
      globalMutate,
      projectId,
      handleToolResult,
      handleProposal,
    ],
  );

  /**
   * 提案を拒否（サイレント）
   * 全提案処理済みの場合、adapter が自動で AI 応答ストリームを返すのでそれを消費する。
   */
  const handleRejectProposal = useCallback(
    async (proposalId: string) => {
      const result = await triggerReject(proposalId);
      await mutateMessages();
      if (result.stream) {
        setIsLoading(true);
        setStreamingContent('');
        try {
          await consumeStream(
            result.stream,
            setStreamingContent,
            handleToolResult,
            handleProposal,
          );
          await mutateMessages();
          setStreamingProposals([]);
        } catch (e) {
          console.error('Failed to consume auto feedback stream:', e);
        } finally {
          setStreamingContent(null);
          setIsLoading(false);
        }
      }
    },
    [triggerReject, mutateMessages, handleToolResult, handleProposal],
  );

  const handleSend = async (message: string) => {
    const request = {
      message,
      mode: aiMode === 'write' ? ('write' as const) : ('ask' as const),
      context,
      config: buildConfig(model, temperature),
      revertToMessageId,
    };

    setPendingUserMessage(message);
    setIsLoading(true);
    setStreamingContent('');

    try {
      const stream = await triggerChat(request);
      await consumeStream(
        stream,
        setStreamingContent,
        handleToolResult,
        handleProposal,
      );
      await mutateMessages();
      setStreamingProposals([]);
    } catch (e) {
      console.error('Failed to send message:', e);
      setStreamingContent(
        `エラーが発生しました: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setPendingUserMessage(null);
      setStreamingContent(null);
      setIsLoading(false);
      setRevertToMessageId(undefined);
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
        onRevertMessage={setRevertToMessageId}
        isLoading={isLoading}
      />
      <AiPanelInput
        mode={aiMode}
        onModeChange={onModeChange}
        onSend={handleSend}
        isLoading={isLoading}
        model={model}
        models={AI_MODELS}
        onModelChange={onModelChange}
        temperature={temperature}
        onTemperatureChange={onTemperatureChange}
        revertActive={revertToMessageId != null}
        onCancelRevert={() => setRevertToMessageId(undefined)}
      />
    </>
  );
}

export function WorkspaceAiPanel({
  projectId,
  openTabs,
}: WorkspaceAiPanelProps) {
  const { data: sessions } = useAISessions(projectId);
  const { data: settings } = useProjectSettings(projectId);
  const { trigger: triggerUpdateSettings } =
    useUpdateProjectSettings(projectId);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | undefined
  >();

  const aiMode: AiMode = settings?.aiChatMode ?? 'ask';
  const aiModel = settings?.aiModel;
  const aiTemperature = settings?.aiTemperature;
  const handleModeChange = useCallback(
    (mode: AiMode) => {
      void triggerUpdateSettings({ aiChatMode: mode });
    },
    [triggerUpdateSettings],
  );
  const handleModelChange = useCallback(
    (model: string) => {
      void triggerUpdateSettings({ aiModel: model });
    },
    [triggerUpdateSettings],
  );
  const handleTemperatureChange = useCallback(
    (temperature: number) => {
      void triggerUpdateSettings({ aiTemperature: temperature });
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
      status: s.status,
    }));
  }, [sessions]);

  return (
    <AiPanel
      conversations={conversations}
      currentConversationId={currentConversationId}
      onNewConversation={() => setCurrentConversationId(undefined)}
      onSelectConversation={setCurrentConversationId}
    >
      <Tabs defaultValue="chat" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-3 mt-2 self-start">
          <TabsTrigger value="chat">チャット</TabsTrigger>
          <TabsTrigger value="context">コンテキスト</TabsTrigger>
          <TabsTrigger value="usage">使用量</TabsTrigger>
          <TabsTrigger value="memory">メモリ</TabsTrigger>
        </TabsList>
        <TabsContent value="chat" className="flex min-h-0 flex-1 flex-col">
          {currentConversationId ? (
            <ExistingSessionContent
              key={currentConversationId}
              projectId={projectId}
              sessionId={currentConversationId}
              aiMode={aiMode}
              onModeChange={handleModeChange}
              model={aiModel}
              temperature={aiTemperature}
              onModelChange={handleModelChange}
              onTemperatureChange={handleTemperatureChange}
              context={
                openTabs?.length
                  ? {
                      openTabs: openTabs.map((t) => ({
                        id: t.id,
                        name: t.name,
                        contentType: t.type,
                        ...(t.active ? { active: true } : {}),
                      })),
                    }
                  : undefined
              }
            />
          ) : (
            <NewSessionContent
              key="new"
              projectId={projectId}
              onSessionCreated={setCurrentConversationId}
              aiMode={aiMode}
              onModeChange={handleModeChange}
              model={aiModel}
              temperature={aiTemperature}
              onModelChange={handleModelChange}
              onTemperatureChange={handleTemperatureChange}
              context={
                openTabs?.length
                  ? {
                      openTabs: openTabs.map((t) => ({
                        id: t.id,
                        name: t.name,
                        contentType: t.type,
                        ...(t.active ? { active: true } : {}),
                      })),
                    }
                  : undefined
              }
            />
          )}
        </TabsContent>
        <TabsContent value="context" className="min-h-0 flex-1">
          <ContextPreviewWrapper projectId={projectId} mode={aiMode} />
        </TabsContent>
        <TabsContent value="usage" className="min-h-0 flex-1">
          <AIUsageWrapper projectId={projectId} />
        </TabsContent>
        <TabsContent value="memory" className="min-h-0 flex-1">
          <AIMemoryWrapper projectId={projectId} />
        </TabsContent>
      </Tabs>
    </AiPanel>
  );
}
