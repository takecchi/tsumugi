import type { AIProposal, AIProposalStatus } from '@tsumugi/adapter';
import { join, readJson, writeJson } from '@/internal/utils/fs';
import { getProjectDataDir } from '@/internal/utils/project-index';
import { extractParentPath } from '@/internal/utils/path';
import {
  updateProposalStatusInArray,
  findProposalInArray,
  checkAllProposalsProcessedInArray,
  rejectAllPendingProposalsInArray,
  type MessageJson,
} from './ai-logic';

/**
 * プロジェクトのAIセッションディレクトリを取得
 * projectDir/.tsumugi/ai-sessions/
 */
export async function getSessionsDir(projectId: string): Promise<string> {
  const projectDir = await getProjectDataDir(projectId);
  return join(projectDir, '.tsumugi', 'ai-sessions');
}

/**
 * フルパスから projectId を推測
 * 例: /path/to/project/.tsumugi/ai-sessions/uuid -> /path/to/project
 */
export function getProjectIdFromSessionPath(sessionPath: string): string {
  return extractParentPath(sessionPath, '.tsumugi');
}

/**
 * messages.json 内の提案のステータスを更新する
 */
export async function updateProposalStatusInMessages(
  sessionId: string,
  toolCallId: string,
  status: AIProposalStatus,
): Promise<void> {
  const messagesPath = await join(sessionId, 'messages.json');
  const messages = (await readJson<MessageJson[]>(messagesPath)) ?? [];
  if (updateProposalStatusInArray(messages, toolCallId, status)) {
    await writeJson(messagesPath, messages);
  }
}

/**
 * messages.json から提案を検索する
 */
export async function findProposalInMessages(
  sessionId: string,
  toolCallId: string,
): Promise<AIProposal | undefined> {
  const messagesPath = await join(sessionId, 'messages.json');
  const messages = (await readJson<MessageJson[]>(messagesPath)) ?? [];
  return findProposalInArray(messages, toolCallId);
}

/**
 * セッション内の全提案が処理済み（pending なし）かどうかをチェックし、
 * 処理済みの場合は全提案のフィードバックサマリーも返す。
 */
export async function checkAllProposalsProcessed(
  sessionId: string,
): Promise<{ allProcessed: boolean; feedbackSummaries: { toolCallId: string; status: string; targetName: string }[] }> {
  const messagesPath = await join(sessionId, 'messages.json');
  const messages = (await readJson<MessageJson[]>(messagesPath)) ?? [];
  return checkAllProposalsProcessedInArray(messages);
}

/**
 * セッション内の pending 提案をすべて rejected に更新する。
 * ユーザーがメッセージを送信した時に未処理の提案を自動拒否するために使用。
 */
export async function rejectAllPendingProposals(sessionId: string): Promise<void> {
  const messagesPath = await join(sessionId, 'messages.json');
  const messages = (await readJson<MessageJson[]>(messagesPath)) ?? [];
  if (rejectAllPendingProposalsInArray(messages)) {
    await writeJson(messagesPath, messages);
  }
}
