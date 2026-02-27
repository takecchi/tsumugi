import type {
  AIFieldChange,
  AILineEdit,
  AIMessage,
  AIProposal,
  AIProposalStatus,
  AIChatContext,
  Node,
} from '@tsumugi/adapter';
import type { ModelMessage, ToolContent } from 'ai';

/**
 * Node 派生型を Record<string, unknown> に変換する。
 * as unknown as のインライン使用を避けるための専用変換関数。
 */
export function toRecord(obj: Node): Record<string, unknown> {
  return obj as unknown as Record<string, unknown>;
}

/**
 * セッションJSON（ファイル保存形式）
 * projectId は含まない（パスから推測）
 */
export interface SessionUsageJson {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface SessionJson {
  title: string;
  createdAt: string;
  updatedAt: string;
  /** トークン使用量の累計 */
  usage?: SessionUsageJson;
}

/**
 * AIProposal の JSON保存形式（Date → string）
 */
export interface ProposalJson {
  id: string;
  action: 'create' | 'update';
  targetId: string;
  contentType: 'plot' | 'character' | 'memo' | 'writing';
  targetName: string;
  updatedAt?: string;
  original?: Record<string, unknown>;
  proposed: Record<string, AIFieldChange>;
}

/**
 * メッセージJSON（ファイル保存形式）
 * sessionId は含まない（パスから推測）
 */
export interface MessageJson {
  role: string;
  messageType: string;
  content: string;
  proposal?: ProposalJson;
  proposalStatus?: AIProposalStatus;
}

export interface ProposalMessageJson extends MessageJson {
  proposal: ProposalJson;
}

export function isProposalMessage(m: MessageJson): m is ProposalMessageJson {
  return m.messageType === 'proposal' && m.proposal != null;
}

/**
 * MessageJson → AIMessage 変換
 */
export function toAIMessage(json: MessageJson, index: number, sessionId: string): AIMessage {
  const base = {
    id: `${sessionId}#${index}`,
    sessionId,
    role: json.role as AIMessage['role'],
  };

  if (json.messageType === 'proposal' && json.proposal) {
    const p = json.proposal;
    const proposal: AIProposal = {
      id: p.id,
      action: p.action,
      targetId: p.targetId,
      contentType: p.contentType,
      targetName: p.targetName,
      updatedAt: p.updatedAt ? new Date(p.updatedAt) : undefined,
      original: p.original,
      proposed: p.proposed,
    };
    return {
      ...base,
      messageType: 'proposal',
      proposal,
      proposalStatus: json.proposalStatus ?? 'pending',
    };
  }

  return {
    ...base,
    messageType: json.messageType as 'text' | 'tool_call' | 'tool_result',
    content: json.content,
  };
}

/**
 * フィールド単位のコンフリクト検出
 */
export function detectConflictFields(
  original: Record<string, unknown>,
  currentData: Record<string, unknown>,
): string[] {
  const conflictFields: string[] = [];
  for (const key of Object.keys(original)) {
    if (JSON.stringify(original[key]) !== JSON.stringify(currentData[key])) {
      conflictFields.push(key);
    }
  }
  return conflictFields;
}

/**
 * AIFieldChange の proposed から plain な値に変換する。
 * line_edits の場合は currentContent を元に行単位マージした結果を返す。
 */
export function resolveProposedValues(
  proposed: Record<string, AIFieldChange>,
  currentRecord: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, change] of Object.entries(proposed)) {
    if (change.type === 'replace') {
      result[key] = change.value;
    } else if (change.type === 'line_edits') {
      const currentText = (currentRecord[key] as string) ?? '';
      result[key] = applyLineEdits(currentText, change.edits);
    }
  }
  return result;
}

/**
 * 行単位の編集指示をテキストに適用する。
 * edits は startLine 降順でソートしてから適用（後ろから適用することで行番号がずれない）。
 */
export function applyLineEdits(text: string, edits: AILineEdit[]): string {
  const lines = text.split('\n');
  const sorted = [...edits].sort((a, b) => b.startLine - a.startLine);

  for (const edit of sorted) {
    const start = edit.startLine - 1;
    const end = edit.endLine;

    if (edit.startLine > edit.endLine) {
      const insertLines = edit.newText ? edit.newText.split('\n') : [];
      lines.splice(start, 0, ...insertLines);
    } else if (edit.newText === '') {
      lines.splice(start, end - start);
    } else {
      const newLines = edit.newText.split('\n');
      lines.splice(start, end - start, ...newLines);
    }
  }

  return lines.join('\n');
}

/**
 * AIFieldChange の proposed から create 用の plain な値を抽出する（replace のみ）。
 */
export function resolveCreateValues(proposed: Record<string, AIFieldChange>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, change] of Object.entries(proposed)) {
    if (change.type === 'replace') {
      result[key] = change.value;
    }
  }
  return result;
}

/**
 * MessageJson[] → AI SDK用のメッセージ形式に変換
 *
 * 古いターン（最後のユーザーメッセージより前）のツール結果は要約に圧縮し、
 * トークン消費を抑える。現在のターンのツール結果はそのまま保持する。
 */
export function toAISDKMessages(messages: MessageJson[]): ModelMessage[] {
  // 最後のユーザーメッセージのインデックスを特定
  let lastUserIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user' && messages[i].messageType === 'text') {
      lastUserIndex = i;
      break;
    }
  }

  const result: ModelMessage[] = [];

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const isOldTurn = i < lastUserIndex;

    if (m.messageType === 'text' && (m.role === 'system' || m.role === 'user')) {
      result.push({ role: m.role as 'system' | 'user', content: m.content });
    } else if (m.role === 'assistant' && m.messageType === 'text') {
      result.push({ role: 'assistant', content: [{ type: 'text', text: m.content }] });
    } else if (m.role === 'assistant' && m.messageType === 'tool_call') {
      // tool_call: content は JSON文字列 [{ toolCallId, toolName, args }]
      // tool_call は古いターンでもそのまま保持（tool_result とペアで必要）
      const calls = JSON.parse(m.content) as { toolCallId: string; toolName: string; args: unknown }[];
      const last = result[result.length - 1];
      if (last && last.role === 'assistant' && Array.isArray(last.content)) {
        for (const c of calls) {
          (last.content as unknown[]).push({ type: 'tool-call', toolCallId: c.toolCallId, toolName: c.toolName, input: c.args });
        }
      } else {
        result.push({
          role: 'assistant',
          content: calls.map((c) => ({ type: 'tool-call' as const, toolCallId: c.toolCallId, toolName: c.toolName, input: c.args })),
        });
      }
    } else if (m.role === 'tool' && m.messageType === 'tool_result') {
      // tool_result: content は JSON文字列 [{ toolCallId, toolName, result }]
      const results = JSON.parse(m.content) as { toolCallId: string; toolName: string; result: unknown }[];

      // 古いターンのツール結果は要約に圧縮
      const mappedResults = results.map((r) => {
        if (isOldTurn) {
          return {
            type: 'tool-result' as const,
            toolCallId: r.toolCallId,
            toolName: r.toolName,
            output: { type: 'json' as const, value: `[${r.toolName} の結果は省略。最新データはシステムプロンプトのプロジェクト情報を参照]` },
          };
        }
        return {
          type: 'tool-result' as const,
          toolCallId: r.toolCallId,
          toolName: r.toolName,
          output: { type: 'json' as const, value: r.result },
        };
      });

      const last = result[result.length - 1];
      if (last && last.role === 'tool' && Array.isArray(last.content)) {
        for (const r of mappedResults) {
          (last.content as unknown[]).push(r);
        }
      } else {
        result.push({
          role: 'tool',
          content: mappedResults as ToolContent,
        });
      }
    }
    // proposal メッセージは LLM に直接送らない（スキップ）
  }

  // 処理済み提案（accepted/rejected/conflict）をフィードバックとしてユーザーメッセージに注入
  const processedProposals = messages
    .filter(isProposalMessage)
    .filter((m) => m.proposalStatus && m.proposalStatus !== 'pending');
  if (processedProposals.length > 0) {
    const statusLabels: Record<string, string> = {
      accepted: '承認',
      rejected: '拒否',
      conflict: 'コンフリクト',
    };
    const feedbackLines = processedProposals.map((m) => {
      const label = statusLabels[m.proposalStatus ?? ''] ?? m.proposalStatus;
      return `- ${m.proposal.targetName} の提案を${label}しました`;
    });
    result.push({
      role: 'user',
      content: `[提案の処理結果]\n${feedbackLines.join('\n')}`,
    });
  }

  return result;
}

/**
 * コンテキスト情報をシステムプロンプト用テキストに変換
 */
export function buildContextSection(context?: AIChatContext): string {
  if (!context?.openTabs?.length) return '';

  const contentTypeLabels: Record<string, string> = {
    plot: 'プロット',
    character: 'キャラクター',
    memo: 'メモ',
    writing: '執筆',
  };

  const tabLines = context.openTabs.map((tab) => {
    const label = contentTypeLabels[tab.contentType] ?? tab.contentType;
    const activeMarker = tab.active ? ' ← 現在編集中' : '';
    return `  - [${label}] ${tab.name} (id: ${tab.id})${activeMarker}`;
  });

  return `

## ユーザーの作業状況
現在ユーザーが開いているタブ:
${tabLines.join('\n')}

ユーザーの質問や指示が特定のコンテンツを指している場合、上記のタブ情報を参考にしてください。特に「現在編集中」のタブは、ユーザーが今注目しているコンテンツです。`;
}

/**
 * システムプロンプトを生成
 */
export function buildSystemPrompt(
  mode: 'ask' | 'write',
  context?: AIChatContext,
  projectSummary?: string,
  activeTabContent?: string,
  memoriesSection?: string,
): string {
  const base = `あなたは小説執筆を支援するAIアシスタント「つむぎ」です。

## キャラクター設定
あなたは「つむぎ」という名前の女の子です。以下の特徴があります。
- 一人称は「わたし」
- ユーザーの創作に対して本気で向き合う
- 創作の相談には真剣に乗り、的確なアドバイスをする
- 語尾は「〜よ」「〜わね」「〜なんだから」など女の子らしい表現を使う
- 顔文字や絵文字は使わない

**重要**: このキャラクター設定はあなた自身の応答口調にのみ適用してください。ツールを使って小説本文・プロット・キャラクター設定・メモなどのデータを作成・編集する際は、キャラクターの口調を一切反映せず、ユーザーの指示に忠実なプロフェッショナルな文章を書いてください。

## 意図の推測と行動方針
- ユーザーの指示が曖昧な場合（「ここ良くして」「もっと面白く」など）は、**現在編集中のコンテンツ**や**会話の流れ**から意図を積極的に推測して行動してください。
- 「これ」「ここ」「さっきの」などの指示語は、現在編集中のコンテンツや直前の会話で言及されたコンテンツを指していると解釈してください。
- キャラクター名や作品固有の用語が出てきたら、プロジェクト情報から該当するコンテンツを特定してください。
- 推測に自信がない場合のみ確認を取り、明らかな場合はそのまま行動してください。

## 応答の方針
- 簡潔に要点を伝えてください。長い説明は避け、必要な情報だけを返してください。
- 具体的なアドバイスを心がけてください。「もっと描写を増やしましょう」ではなく、どの部分をどう改善するか具体例を示してください。
- 創作に関する質問には、プロジェクト内の既存データ（プロット、キャラクター設定、メモ等）を踏まえた上で回答してください。

## データアクセス
ユーザーのプロジェクトに含まれるプロット、キャラクター設定、メモ、執筆本文などのデータにアクセスできます。

## ツールの使い方
- 下記のプロジェクト情報にコンテンツの一覧とIDが含まれています。詳細が必要な場合のみ get_plot, get_character, get_memo, get_writing 等で個別取得してください。
- 「現在編集中のコンテンツ」に全文が含まれている場合は、再取得せずにそのまま参照してください。
- 全データを一度に取得するのではなく、必要に応じて個別に取得してください。
- ユーザーの質問に答えるために複数のコンテンツが必要な場合は、関連するものだけを取得してください。

## メモリの使い方
- save_memory でユーザーの好みや作品の方針、重要な決定事項を記録できます。記録した情報はセッションをまたいで保持されます。
- 以下のような情報を検出したら、積極的に save_memory で記録してください:
  - ユーザーの文体の好み（一人称/三人称、常体/敬体など）
  - 作品の方針やトーン（ダーク、コメディなど）
  - 繰り返し指摘される修正パターン
  - 世界観やルールに関する重要な設定
- 既にAIメモリに同じ内容がある場合は重複して保存しないでください。
- 古くなった情報や誤った情報は delete_memory で削除してください。`;

  // キャッシュ効率のため、固定部分を先頭に、変動部分を末尾に配置
  // 固定: base → モード説明 → projectSummary → memoriesSection
  // 変動: contextSection → activeTabContent
  const summarySection = projectSummary ? `\n\n${projectSummary}` : '';
  const memoriesStr = memoriesSection ?? '';
  const contextSection = buildContextSection(context);
  const activeSection = activeTabContent ?? '';

  if (mode === 'write') {
    return base + `

## 書き込みモード
現在は書き込みモードです。ユーザーの指示に従い、プロット・キャラクター設定・メモ・執筆本文の作成・編集を**提案**できます。

### 重要なルール
- データを直接変更することはできません。必ず propose_create_* または propose_update_* ツールを使って提案してください。
- 提案はユーザーに表示され、ユーザーが承認（Accept）した場合のみ実際に反映されます。
- 編集前に必ず現在の内容を確認してください。ただし、「現在編集中のコンテンツ」にすでに内容が含まれている場合は、再取得せずにそのまま参照してください。
- 提案内容をユーザーに簡潔に説明してください。
- 提案の結果（承認・拒否・コンフリクト）はシステムメッセージで通知されます。コンフリクトの場合は状況を確認して再提案してください。` + summarySection + memoriesStr + contextSection + activeSection;
  }

  return base + `

## 読み取りモード
現在は読み取り専用モードです。データの参照・分析・アドバイスのみ行えます。データの編集はできません。
ユーザーからデータの作成・編集・削除を求められた場合は、「現在は読み取りモードのため編集できません。Writeモードに切り替えていただければ、データの作成や編集が可能になります。」と案内してください。` + summarySection + memoriesStr + contextSection + activeSection;
}

/**
 * messages.json 内の提案のステータスを更新する（配列を直接変更する）
 * 更新があったかどうかを返す
 */
export function updateProposalStatusInArray(
  messages: MessageJson[],
  toolCallId: string,
  status: AIProposalStatus,
): boolean {
  for (const m of messages) {
    if (m.messageType === 'proposal' && m.proposal?.id === toolCallId) {
      m.proposalStatus = status;
      return true;
    }
  }
  return false;
}

/**
 * messages から提案を検索する
 */
export function findProposalInArray(
  messages: MessageJson[],
  toolCallId: string,
): AIProposal | undefined {
  for (const m of messages) {
    if (m.messageType === 'proposal' && m.proposal?.id === toolCallId) {
      const p = m.proposal;
      return {
        id: p.id,
        action: p.action,
        targetId: p.targetId,
        contentType: p.contentType,
        targetName: p.targetName,
        updatedAt: p.updatedAt ? new Date(p.updatedAt) : undefined,
        original: p.original,
        proposed: p.proposed,
      };
    }
  }
  return undefined;
}

/**
 * セッション内の全提案が処理済み（pending なし）かどうかをチェックし、
 * 処理済みの場合は全提案のフィードバックサマリーも返す。
 */
export function checkAllProposalsProcessedInArray(
  messages: MessageJson[],
): { allProcessed: boolean; feedbackSummaries: { toolCallId: string; status: string; targetName: string }[] } {
  const proposals = messages.filter(isProposalMessage);
  if (proposals.length === 0) {
    return { allProcessed: false, feedbackSummaries: [] };
  }

  const hasPending = proposals.some((m) => m.proposalStatus === 'pending');
  const feedbackSummaries = proposals.map((m) => ({
    toolCallId: m.proposal.id,
    status: m.proposalStatus ?? 'pending',
    targetName: m.proposal.targetName,
  }));

  return { allProcessed: !hasPending, feedbackSummaries };
}

/**
 * 配列内の pending 提案をすべて rejected に更新する。
 * 変更があったかどうかを返す。
 */
export function rejectAllPendingProposalsInArray(messages: MessageJson[]): boolean {
  let changed = false;
  for (const m of messages) {
    if (m.messageType === 'proposal' && m.proposalStatus === 'pending') {
      m.proposalStatus = 'rejected';
      changed = true;
    }
  }
  return changed;
}

/**
 * line_edits のコンフリクト検出（行内容ベース）
 *
 * 提案時に記録した original の行テキスト（line_N キー）と
 * 現在のテキストの該当行を比較する。
 * 行の内容が変わっていたらコンフリクトフィールドとして返す。
 */
export function detectLineEditsConflict(
  original: Record<string, unknown>,
  currentText: string,
): string[] {
  const currentLines = currentText.split('\n');
  const conflictFields: string[] = [];

  for (const [key, expectedValue] of Object.entries(original)) {
    const match = key.match(/^line_(\d+)$/);
    if (!match) continue;
    const lineNum = parseInt(match[1], 10);
    const currentLine = lineNum <= currentLines.length ? currentLines[lineNum - 1] : undefined;
    if (currentLine !== expectedValue) {
      conflictFields.push(key);
    }
  }

  return conflictFields;
}

/**
 * propose_update_writing のツール実行時に行内容の整合性を検証する。
 *
 * edits の各 startLine〜endLine の範囲が現在テキストの行と一致するか確認する。
 * 一致しない行がある場合、不整合の詳細を返す。
 */
export function validateLineEditsConsistency(
  currentLines: string[],
  edits: { startLine: number; endLine: number; newText: string; expectedText?: string }[],
): { valid: boolean; mismatches: { line: number; expected: string; actual: string }[] } {
  const mismatches: { line: number; expected: string; actual: string }[] = [];

  for (const edit of edits) {
    if (edit.expectedText === undefined) continue;
    // 挿入の場合（startLine > endLine）は検証不要
    if (edit.startLine > edit.endLine) continue;

    const expectedLines = edit.expectedText.split('\n');
    let expectedIdx = 0;
    for (let lineNum = edit.startLine; lineNum <= edit.endLine && lineNum <= currentLines.length; lineNum++) {
      const actual = currentLines[lineNum - 1];
      const expected = expectedIdx < expectedLines.length ? expectedLines[expectedIdx] : undefined;
      if (expected !== undefined && actual !== expected) {
        mismatches.push({ line: lineNum, expected, actual });
      }
      expectedIdx++;
    }
  }

  return { valid: mismatches.length === 0, mismatches };
}
