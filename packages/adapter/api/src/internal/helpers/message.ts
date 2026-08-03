import type { AIMessage as ClientAIMessage } from '@tsumugi-chan/client';
import type {
  AIMessage,
  AIProposalMessage,
  AITextMessage,
  AIToolCallMessage,
  AIToolResultMessage,
} from '@tsumugi/adapter';
import { toAIProposal } from './sse';

/**
 * バックエンドのメッセージ（生成クライアント型）を adapter-core の AIMessage に変換する。
 *
 * 対話チャットのセッションと自律Run の transcript で同じ形式が返るため共用する。
 */
export function toMessage(api: ClientAIMessage): AIMessage {
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
