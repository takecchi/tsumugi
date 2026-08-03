import type { AIMessage, AIRun, AIRunPlanItem } from '@tsumugi/adapter';
import type { AiRunDetail, AiRunMessage, AiRunSummary } from '@tsumugi/ui';

/**
 * Run の transcript を UI 表示用のメッセージ列に変換する。
 *
 * 表示するのは text と proposal だけ。tool_call / tool_result は
 * LLM ↔ アダプター間の内部メッセージなので出さない。
 * 自律Run の提案は承認を挟まず適用済みなので、承認ボタンではなく
 * 「作成/更新しました」の行として表示する。
 */
export function buildRunTranscript(
  messages: AIMessage[] | undefined,
): AiRunMessage[] {
  if (!messages) return [];

  const items: AiRunMessage[] = [];
  for (const message of messages) {
    if (message.messageType === 'text') {
      if (!message.content.trim()) continue;
      if (message.role !== 'user' && message.role !== 'assistant') continue;
      items.push({
        id: message.id,
        kind: 'text',
        role: message.role,
        content: message.content,
      });
    } else if (message.messageType === 'proposal') {
      items.push({
        id: message.id,
        kind: 'edit',
        action: message.proposal.action,
        contentType: message.proposal.contentType,
        targetName: message.proposal.targetName,
        // 編集保護（editPolicy）やコンフリクトで弾かれた提案もあるため、
        // 状態を渡して「適用しました」と言い切らないようにする
        status: message.proposal.status,
      });
    }
  }
  return items;
}

/**
 * Run（adapter 型）を UI の表示用 Run に変換する。
 *
 * 計画はストリームの `plan` チャンクの方が新しいことがあるため、
 * `livePlan` があればそちらを優先する。
 */
export function toAiRunDetail(
  run: AIRun,
  livePlan: AIRunPlanItem[] | null,
): AiRunDetail {
  return {
    id: run.id,
    goal: run.goal,
    status: run.status,
    finishReason: run.finishReason,
    plan: livePlan ?? run.plan,
    stepCount: run.stepCount,
    maxSteps: run.maxSteps,
    // 累積トークンは Run から読む（usage チャンクはバッチ単体の値なので使わない）
    totalTokens: run.totalTokens,
    maxTotalTokens: run.maxTotalTokens,
    createdNodeCount: run.createdNodeCount,
    subagentCount: run.subagentCount,
    lastError: run.lastError,
  };
}

/**
 * Run 一覧を UI の表示用サマリに変換する
 */
export function toAiRunSummaries(runs: AIRun[] | undefined): AiRunSummary[] {
  if (!runs) return [];
  return runs.map((run) => ({
    id: run.id,
    goal: run.goal,
    status: run.status,
    finishReason: run.finishReason,
    createdAt: run.createdAt,
  }));
}

/**
 * 進行中（停止操作が意味を持つ）Run かどうか
 */
export function isActiveRun(run: AIRun | undefined): boolean {
  if (!run) return false;
  return (
    run.status === 'queued' ||
    run.status === 'running' ||
    run.status === 'paused'
  );
}
