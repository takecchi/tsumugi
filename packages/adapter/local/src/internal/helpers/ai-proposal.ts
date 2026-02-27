import type {
  AIProposalFeedback,
  AIProposalResult,
  AIAdapterConfig,
} from '@tsumugi/adapter';
import { join, readJson } from '@/internal/utils/fs';
import {
  toRecord,
  detectConflictFields,
  detectLineEditsConflict,
  resolveProposedValues,
  resolveCreateValues,
  type SessionJson,
  type MessageJson,
} from './ai-logic';
import type { ToolAdapters } from '@/adapters/ai-tools';
import {
  findProposalInMessages,
  updateProposalStatusInMessages,
  checkAllProposalsProcessed,
  getProjectIdFromSessionPath,
} from './ai-session';
import { createChatStream } from './ai-stream';

/**
 * 提案処理結果を構築する。
 * 全提案が処理済みなら自動的に AI へフィードバックを送信し、応答ストリームを含めて返す。
 */
export async function buildProposalResult(
  sessionId: string,
  feedback: AIProposalFeedback,
  getConfig: () => AIAdapterConfig,
  getToolAdapters: () => ToolAdapters,
): Promise<AIProposalResult> {
  const { allProcessed } = await checkAllProposalsProcessed(sessionId);
  if (!allProcessed) {
    return { feedback };
  }

  // 全提案処理済み → 自動で chat stream を生成
  const config = getConfig();
  const sessionDir = sessionId;
  const sessionPath = await join(sessionDir, 'session.json');
  const sessionJson = await readJson<SessionJson>(sessionPath);
  if (!sessionJson) {
    return { feedback };
  }

  const messagesPath = await join(sessionDir, 'messages.json');
  const messages = (await readJson<MessageJson[]>(messagesPath)) ?? [];
  const projectId = getProjectIdFromSessionPath(sessionId);

  // request を undefined で渡すことでユーザーメッセージなしの自動応答
  const stream = await createChatStream(config, undefined, sessionDir, sessionJson, messages, projectId, getToolAdapters());
  return { feedback, stream };
}

/**
 * 提案を承認する。コンフリクト検出 → データ更新 → ステータス更新を行う。
 */
export async function executeAcceptProposal(
  sessionId: string,
  toolCallId: string,
  getConfig: () => AIAdapterConfig,
  getToolAdapters: () => ToolAdapters,
): Promise<AIProposalResult> {
  const raw = await findProposalInMessages(sessionId, toolCallId);
  if (!raw) {
    throw new Error(`提案が見つかりません: ${toolCallId}`);
  }

  let feedback: AIProposalFeedback;

  try {
    if (raw.action === 'update') {
      if (raw.contentType === 'project') {
        // project の場合は ProjectAdapter を使用
        const project = await getToolAdapters().projects.getById(raw.targetId);
        if (!project) {
          throw new Error('プロジェクトが見つかりません');
        }

        // updatedAt チェック + コンフリクト検出
        if (raw.updatedAt && project.updatedAt.getTime() !== raw.updatedAt.getTime()) {
          if (raw.original) {
            const currentRecord: Record<string, unknown> = {
              synopsis: project.synopsis,
              theme: project.theme,
              goal: project.goal,
              targetWordCount: project.targetWordCount,
              targetAudience: project.targetAudience,
            };
            const conflictFields = detectConflictFields(raw.original, currentRecord);
            if (conflictFields.length > 0) {
              await updateProposalStatusInMessages(sessionId, toolCallId, 'conflict');
              feedback = {
                toolCallId,
                status: 'conflict',
                conflictDetails: `以下のフィールドが提案後に変更されています: ${conflictFields.join(', ')}`,
              };
              return await buildProposalResult(sessionId, feedback, getConfig, getToolAdapters);
            }
          }
        }

        const projectRecord: Record<string, unknown> = {
          synopsis: project.synopsis,
          theme: project.theme,
          goal: project.goal,
          targetWordCount: project.targetWordCount,
          targetAudience: project.targetAudience,
        };
        const updateData = resolveProposedValues(raw.proposed, projectRecord);
        await getToolAdapters().projects.update(raw.targetId, updateData);
      } else {
        // ContentAdapterBase を使用
        const adapterForType = {
          plot: getToolAdapters().plots,
          character: getToolAdapters().characters,
          memo: getToolAdapters().memos,
          writing: getToolAdapters().writings,
        }[raw.contentType];

        const current = await adapterForType.getById(raw.targetId);
        if (!current) {
          throw new Error('対象コンテンツが見つかりません');
        }

        // updatedAt チェック + コンフリクト検出
        if (raw.updatedAt && current.updatedAt.getTime() !== raw.updatedAt.getTime()) {
          if (raw.original) {
            // line_edits の場合は行内容ベースでコンフリクト検出
            const hasLineEdits = Object.values(raw.proposed).some((c) => c.type === 'line_edits');
            let conflictFields: string[];
            if (hasLineEdits) {
              const currentText = toRecord(current).content as string ?? '';
              conflictFields = detectLineEditsConflict(raw.original, currentText);
            } else {
              conflictFields = detectConflictFields(raw.original, toRecord(current));
            }
            if (conflictFields.length > 0) {
              await updateProposalStatusInMessages(sessionId, toolCallId, 'conflict');
              feedback = {
                toolCallId,
                status: 'conflict',
                conflictDetails: hasLineEdits
                  ? `以下の行が提案後に変更されています: ${conflictFields.map(k => k.replace('line_', '行')).join(', ')}`
                  : `以下のフィールドが提案後に変更されています: ${conflictFields.join(', ')}`,
              };
              return await buildProposalResult(sessionId, feedback, getConfig, getToolAdapters);
            }
          }
        }

        // コンフリクトなし → proposed を解決して更新実行
        const updateData = resolveProposedValues(raw.proposed, toRecord(current));
        await adapterForType.update(raw.targetId, updateData);
      }
    } else {
      // create
      const plainValues = resolveCreateValues(raw.proposed);
      const { parentId, name, ...fields } = plainValues as Record<string, unknown> & { parentId?: string | null; name?: string };
      const projectId = getProjectIdFromSessionPath(sessionId);
      const commonBase = {
        projectId,
        parentId: (parentId as string | null) ?? null,
        name: (name as string) ?? raw.targetName,
        order: 0,
      };

      switch (raw.contentType) {
        case 'plot':
          await getToolAdapters().plots.create({ ...commonBase, nodeType: 'plot', ...fields });
          break;
        case 'character':
          await getToolAdapters().characters.create({ ...commonBase, nodeType: 'character', ...fields });
          break;
        case 'memo':
          await getToolAdapters().memos.create({ ...commonBase, nodeType: 'memo', content: (fields.content as string) ?? '', ...fields });
          break;
        case 'writing':
          await getToolAdapters().writings.create({ ...commonBase, nodeType: 'writing', content: (fields.content as string) ?? '', wordCount: ((fields.content as string) ?? '').length, ...fields });
          break;
      }
    }

    await updateProposalStatusInMessages(sessionId, toolCallId, 'accepted');
    feedback = { toolCallId, status: 'accepted', contentType: raw.contentType, targetId: raw.targetId };
  } catch (e) {
    await updateProposalStatusInMessages(sessionId, toolCallId, 'conflict');
    feedback = {
      toolCallId,
      status: 'conflict',
      contentType: raw.contentType,
      targetId: raw.targetId,
      conflictDetails: e instanceof Error ? e.message : String(e),
    };
  }

  return await buildProposalResult(sessionId, feedback, getConfig, getToolAdapters);
}
