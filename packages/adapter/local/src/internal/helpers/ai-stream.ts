import type {
  AIAdapterConfig,
  AIChatRequest,
  AIFieldChange,
  AIProposal,
  AIStreamChunk,
  AIToolName,
  ContentType,
} from '@tsumugi/adapter';
import { streamText, stepCountIs, type ModelMessage } from 'ai';
import { join, readJson, writeJson } from '@/internal/utils/fs';
import { now } from '@/internal/utils/id';
import {
  toAISDKMessages,
  buildSystemPrompt,
  type SessionJson,
  type SessionUsageJson,
  type ProposalJson,
  type MessageJson,
} from './ai-logic';
import { createAITools, type ToolAdapters } from '@/adapters/ai-tools';
import { createModel } from './ai-model';
import { getOrCreateSummary } from './ai-summary';
import { buildProjectSummary, fetchActiveTabContent } from './ai-context';
import { addMemory, removeMemory, buildMemoriesSection } from './ai-memory';

/**
 * ストリーミングチャットを実行し ReadableStream<AIStreamChunk> を返す
 */
export async function createChatStream(
  config: AIAdapterConfig,
  request: AIChatRequest | undefined,
  sessionDir: string,
  sessionJson: SessionJson,
  messages: MessageJson[],
  projectId: string,
  toolAdapters: ToolAdapters,
): Promise<ReadableStream<AIStreamChunk>> {
  // ユーザーメッセージを追加（フィードバック自動応答時は request が undefined）
  if (request) {
    messages.push({
      role: 'user',
      messageType: 'text',
      content: request.message,
    });
  }

  // プロジェクトサマリー、アクティブタブ内容、会話要約、AIメモリを並行取得
  const [projectSummary, activeTabContent, summaryResult, memoriesSection] = await Promise.all([
    buildProjectSummary(projectId, toolAdapters),
    fetchActiveTabContent(request?.context, toolAdapters),
    getOrCreateSummary(config, sessionDir, messages),
    buildMemoriesSection(projectId),
  ]);

  // 要約がある場合は古いメッセージを除外し、要約を注入
  const recentMessages = summaryResult.recentStartIndex > 0
    ? messages.slice(summaryResult.recentStartIndex)
    : messages;

  // フィードバック自動応答時（request undefined）は write モード
  const mode = request?.mode ?? 'write';

  const systemPrompt = buildSystemPrompt(mode, request?.context, projectSummary, activeTabContent, memoriesSection);

  const aiMessages: ModelMessage[] = [
    { role: 'system', content: systemPrompt },
    ...(summaryResult.summary
      ? [{ role: 'system' as const, content: `## これまでの会話の要約\n${summaryResult.summary}` }]
      : []),
    ...toAISDKMessages(recentMessages),
  ];
  const model = createModel(config, request?.config?.model);

  // メモリ操作コールバック
  const memoryOps = {
    save: async (content: string) => {
      const m = await addMemory(projectId, content);
      return { id: m.id, content: m.content };
    },
    delete: (id: string) => removeMemory(projectId, id),
  };
  const tools = createAITools(projectId, mode, toolAdapters, memoryOps);

  const result = streamText({
    model,
    messages: aiMessages,
    tools,
    stopWhen: stepCountIs(mode === 'write' ? 8 : 5),
    ...(request?.config?.temperature !== undefined ? { temperature: request.config.temperature } : {}),
    ...(request?.config?.maxTokens !== undefined ? { maxOutputTokens: request.config.maxTokens } : {}),
  });

  let fullTextContent = '';

  return new ReadableStream<AIStreamChunk>({
    async start(controller) {
      try {
        for await (const part of result.fullStream) {
          switch (part.type) {
            case 'text-delta': {
              fullTextContent += part.text;
              controller.enqueue({ type: 'text', content: part.text });
              break;
            }
            case 'tool-call': {
              // ツール呼び出しをストリームに通知
              controller.enqueue({
                type: 'tool_call',
                toolCall: {
                  id: part.toolCallId,
                  name: part.toolName as AIToolName,
                  arguments: JSON.stringify(part.input),
                },
              });
              // メッセージに保存
              messages.push({
                role: 'assistant',
                messageType: 'tool_call',
                content: JSON.stringify([{
                  toolCallId: part.toolCallId,
                  toolName: part.toolName,
                  args: part.input,
                }]),
              });
              break;
            }
            case 'tool-result': {
              const output = part.output as Record<string, unknown>;

              // propose_* ツールの結果は proposal チャンクとして流す
              if (output?.__proposal) {
                const proposalJson: ProposalJson = {
                  id: part.toolCallId,
                  action: output.action as 'create' | 'update',
                  targetId: output.targetId as string,
                  contentType: output.contentType as ContentType,
                  targetName: output.targetName as string,
                  ...(output.updatedAt ? { updatedAt: output.updatedAt as string } : {}),
                  ...(output.original ? { original: output.original as Record<string, unknown> } : {}),
                  proposed: output.proposed as Record<string, AIFieldChange>,
                };
                const proposal: AIProposal = {
                  id: proposalJson.id,
                  action: proposalJson.action,
                  targetId: proposalJson.targetId,
                  contentType: proposalJson.contentType,
                  targetName: proposalJson.targetName,
                  updatedAt: proposalJson.updatedAt ? new Date(proposalJson.updatedAt) : undefined,
                  original: proposalJson.original,
                  proposed: proposalJson.proposed,
                };
                controller.enqueue({ type: 'proposal', proposal });

                // 提案をメッセージとして保存（JSON形式）
                messages.push({
                  role: 'assistant',
                  messageType: 'proposal',
                  content: '',
                  proposal: proposalJson,
                  proposalStatus: 'pending',
                });
              } else {
                // 通常のツール結果
                controller.enqueue({
                  type: 'tool_result',
                  toolResult: {
                    toolCallId: part.toolCallId,
                    toolName: part.toolName as AIToolName,
                    result: JSON.stringify(output),
                  },
                });
              }

              // メッセージに保存
              messages.push({
                role: 'tool',
                messageType: 'tool_result',
                content: JSON.stringify([{
                  toolCallId: part.toolCallId,
                  toolName: part.toolName,
                  result: part.output,
                }]),
              });
              break;
            }
            // step-start, step-finish 等は無視
          }
        }

        // 最終テキストがあればアシスタントメッセージとして保存
        if (fullTextContent) {
          messages.push({
            role: 'assistant',
            messageType: 'text',
            content: fullTextContent,
          });
        }

        const messagesPath = await join(sessionDir, 'messages.json');
        await writeJson(messagesPath, messages);

        // トークン使用量を取得（マルチステップの合計）
        const usage = await result.totalUsage;
        const inputTokens = usage.inputTokens ?? 0;
        const outputTokens = usage.outputTokens ?? 0;
        const usageData: SessionUsageJson = {
          promptTokens: inputTokens,
          completionTokens: outputTokens,
          totalTokens: inputTokens + outputTokens,
        };

        // セッションのupdatedAtとusageを更新（タイトル生成との競合を避けるため最新を読み直す）
        const sessionPath = await join(sessionDir, 'session.json');
        const latestSessionJson = await readJson<SessionJson>(sessionPath) ?? sessionJson;
        latestSessionJson.updatedAt = now().toISOString();
        const prevUsage = latestSessionJson.usage ?? { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
        latestSessionJson.usage = {
          promptTokens: prevUsage.promptTokens + usageData.promptTokens,
          completionTokens: prevUsage.completionTokens + usageData.completionTokens,
          totalTokens: prevUsage.totalTokens + usageData.totalTokens,
        };
        await writeJson(sessionPath, latestSessionJson);

        // 使用量をフロントに通知
        controller.enqueue({ type: 'usage', usage: usageData });

        controller.enqueue({ type: 'done' });
        controller.close();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        controller.enqueue({ type: 'error', error: errorMessage });
        controller.close();
      }
    },
  });
}
