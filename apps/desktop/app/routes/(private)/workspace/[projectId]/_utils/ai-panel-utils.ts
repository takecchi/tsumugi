import type { AIStreamChunk, AIToolName, AIProposal, AIMessage, ContentType, EditorTabType } from '@tsumugi/adapter';
import type { Message, Proposal } from '@tsumugi/ui';
import type { ContentItemKey, ContentTreeKey } from '~/hooks/keys';

/**
 * ストリームを読み取り、テキストを蓄積しながらコールバックで通知する
 */
export async function consumeStream(
  stream: ReadableStream<AIStreamChunk>,
  onChunk: (content: string) => void,
  onToolResult?: (toolName: AIToolName, toolCallId: string, result: string) => void,
  onProposal?: (proposal: AIProposal) => void,
): Promise<string> {
  const reader = stream.getReader();
  let fullContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    if (value.type === 'text' && value.content) {
      fullContent += value.content;
      onChunk(fullContent);
    } else if (value.type === 'proposal' && value.proposal) {
      onProposal?.(value.proposal);
    } else if (value.type === 'tool_result' && value.toolResult) {
      onToolResult?.(value.toolResult.toolName, value.toolResult.toolCallId, value.toolResult.result);
    } else if (value.type === 'error') {
      console.error('AI stream error:', value.error);
    }
  }

  return fullContent;
}

/**
 * ツール名からどのコンテンツタイプが変更されたかを判定するマッピング
 */
export const TOOL_TO_CONTENT_TYPE: Partial<Record<AIToolName, EditorTabType>> = {
  propose_create_writing: 'writing',
  propose_update_writing: 'writing',
  propose_create_plot: 'plot',
  propose_update_plot: 'plot',
  propose_create_character: 'character',
  propose_update_character: 'character',
  propose_create_memo: 'memo',
  propose_update_memo: 'memo',
  propose_update_project: 'project',
};

export function toContentItemKey(contentType: ContentType, id: string): ContentItemKey {
  return { type: contentType, id };
}

export function toContentTreeKey(contentType: ContentType, projectId: string): ContentTreeKey {
  return { type: `${contentType}Tree`, projectId };
}

/**
 * AIProposal → UIの Proposal 型に変換
 */
export function toUIProposal(p: AIProposal, status: Proposal['status']): Proposal {
  return {
    id: p.id,
    action: p.action,
    contentType: p.contentType,
    targetName: p.targetName,
    original: p.original,
    proposed: p.proposed,
    status,
  };
}

/**
 * メッセージから表示用 Message[] を構築するヘルパー
 */
export function buildDisplayMessages(
  messages: AIMessage[] | undefined,
  pendingUserMessage: string | null,
  streamingContent: string | null,
  streamingProposals: AIProposal[],
): Message[] {
  const msgs: Message[] = (messages ?? [])
    .filter((m) => m.messageType === 'text' || m.messageType === 'proposal')
    .map((m): Message => {
      if (m.messageType === 'proposal') {
        return {
          id: m.id,
          role: 'assistant',
          proposal: toUIProposal(m.proposal, m.proposalStatus),
        };
      }
      return {
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
      };
    });

  if (pendingUserMessage !== null) {
    const alreadyExists = msgs.some(
      (m) => m.role === 'user' && 'content' in m && m.content === pendingUserMessage,
    );
    if (!alreadyExists) {
      msgs.push({ id: 'pending-user', role: 'user', content: pendingUserMessage });
    }
  }

  // 提案を先に追加（保存順序と一致させる）
  for (const p of streamingProposals) {
    const existsInMsgs = msgs.some((m) => 'proposal' in m && m.proposal.id === p.id);
    if (!existsInMsgs) {
      msgs.push({
        id: `streaming-proposal-${p.id}`,
        role: 'assistant',
        proposal: toUIProposal(p, 'pending'),
      });
    }
  }

  // ストリーミング中のテキストは最後に追加
  if (streamingContent !== null) {
    msgs.push({ id: 'streaming', role: 'assistant', content: streamingContent });
  }

  return msgs;
}
