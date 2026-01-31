import type { AIAdapterConfig } from '@tsumugi/adapter';
import { generateText } from 'ai';
import { join, readJson, writeJson } from '@/internal/utils/fs';
import { now } from '@/internal/utils/id';
import { createTitleModel } from './ai-model';
import type { MessageJson, SessionJson } from './ai-logic';

/**
 * 会話要約JSON（ファイル保存形式）
 * 古い会話を要約して保存し、トークン消費を抑える
 */
interface SummaryJson {
  /** 要約テキスト */
  summary: string;
  /** 要約対象のメッセージ数（この数より前のメッセージが要約済み） */
  summarizedUpTo: number;
}

/** 要約を生成する閾値（ユーザーメッセージがこの数を超えたら要約） */
const SUMMARY_THRESHOLD = 6;

/** 要約後に保持する直近ターン数（ユーザーメッセージ基準） */
const RECENT_TURNS_TO_KEEP = 4;

/**
 * 会話の要約が必要かどうかを判定し、必要なら要約を生成して返す。
 * 要約済みの場合はキャッシュ（summary.json）から読み込む。
 *
 * 戻り値:
 * - summary: 要約テキスト（不要なら空文字列）
 * - recentStartIndex: 直近メッセージの開始インデックス（要約不要なら0）
 */
export async function getOrCreateSummary(
  config: AIAdapterConfig,
  sessionDir: string,
  messages: MessageJson[],
): Promise<{ summary: string; recentStartIndex: number }> {
  // ユーザーメッセージの数をカウント
  const userMessageIndices: number[] = [];
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === 'user' && messages[i].messageType === 'text') {
      userMessageIndices.push(i);
    }
  }

  // 閾値未満なら要約不要
  if (userMessageIndices.length < SUMMARY_THRESHOLD) {
    return { summary: '', recentStartIndex: 0 };
  }

  // 直近 RECENT_TURNS_TO_KEEP ターン分の開始インデックスを特定
  const keepFromUserIndex = userMessageIndices.length - RECENT_TURNS_TO_KEEP;
  const recentStartIndex = keepFromUserIndex > 0 ? userMessageIndices[keepFromUserIndex] : 0;

  if (recentStartIndex === 0) {
    return { summary: '', recentStartIndex: 0 };
  }

  // キャッシュ確認
  const summaryPath = await join(sessionDir, 'summary.json');
  const cached = await readJson<SummaryJson>(summaryPath);

  if (cached && cached.summarizedUpTo === recentStartIndex) {
    return { summary: cached.summary, recentStartIndex };
  }

  // 要約対象のメッセージを抽出（テキストメッセージのみ）
  const toSummarize = messages.slice(0, recentStartIndex);
  const conversationLines: string[] = [];
  for (const m of toSummarize) {
    if (m.messageType === 'text' && (m.role === 'user' || m.role === 'assistant')) {
      const label = m.role === 'user' ? 'ユーザー' : 'アシスタント';
      conversationLines.push(`${label}: ${m.content}`);
    }
  }

  if (conversationLines.length === 0) {
    return { summary: '', recentStartIndex };
  }

  // 軽量モデルで要約生成
  try {
    const titleModel = createTitleModel(config);
    const { text } = await generateText({
      model: titleModel,
      messages: [
        {
          role: 'system',
          content: '以下の会話履歴を簡潔に要約してください。重要な決定事項、ユーザーの要望、議論の結論を中心に、300文字程度でまとめてください。要約のみを返してください。',
        },
        { role: 'user', content: conversationLines.join('\n') },
      ],
      maxOutputTokens: 500,
    });

    const summary = text.trim();
    if (summary) {
      // キャッシュに保存
      await writeJson(summaryPath, { summary, summarizedUpTo: recentStartIndex } satisfies SummaryJson);
      return { summary, recentStartIndex };
    }
  } catch (e) {
    console.error('Failed to generate conversation summary:', e);
  }

  return { summary: '', recentStartIndex: 0 };
}

/**
 * 軽量モデルでセッションタイトルを生成し session.json を更新
 */
export async function generateTitle(config: AIAdapterConfig, userMessage: string, sessionDir: string): Promise<void> {
  const titleModel = createTitleModel(config);

  const { text } = await generateText({
    model: titleModel,
    messages: [
      {
        role: 'system',
        content: 'ユーザーのメッセージから会話のタイトルを生成してください。15文字程度の簡潔な日本語で、タイトルのみを返してください。',
      },
      { role: 'user', content: userMessage },
    ],
    maxOutputTokens: 50,
  });

  const title = text.trim();
  if (!title) return;

  const sessionPath = await join(sessionDir, 'session.json');
  const sessionJson = await readJson<SessionJson>(sessionPath);
  if (!sessionJson) return;

  sessionJson.title = title;
  sessionJson.updatedAt = now().toISOString();
  await writeJson(sessionPath, sessionJson);
}
