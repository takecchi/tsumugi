import type {
  ProjectAdapter,
  PlotAdapter,
  CharacterAdapter,
  MemoAdapter,
  WritingAdapter,
  AIChatMode,
} from '@tsumugi/adapter';
import { tool } from 'ai';
import { z } from 'zod/v4';
import { diffFields, toReplaceFields } from '@/internal/helpers/ai-tools-logic';
import { validateLineEditsConsistency, toRecord } from '@/internal/helpers/ai-logic';

/**
 * ツール実行に必要なアダプター群
 */
export interface ToolAdapters {
  projects: ProjectAdapter;
  plots: PlotAdapter;
  characters: CharacterAdapter;
  memos: MemoAdapter;
  writings: WritingAdapter;
}

/**
 * 読み取り専用ツール群を生成（ask / write 共通）
 */
function createReadTools(projectId: string, adapters: ToolAdapters) {
  return {
    get_project_overview: tool({
      description:
        'プロジェクトの統計情報（件数・総文字数）を取得します。注意: プロジェクト名やコンテンツ一覧はシステムプロンプトに含まれているため、通常このツールは不要です。統計の最新値が必要な場合のみ使用してください。',
      inputSchema: z.object({}),
      execute: async () => {
        const [project, plots, characters, memos, totalWordCount] = await Promise.all([
          adapters.projects.getById(projectId),
          adapters.plots.getByProjectId(projectId),
          adapters.characters.getByProjectId(projectId),
          adapters.memos.getByProjectId(projectId),
          adapters.writings.getTotalWordCount(projectId),
        ]);
        return {
          project: project ? { id: project.id, name: project.name, synopsis: project.synopsis, theme: project.theme, goal: project.goal, targetWordCount: project.targetWordCount, targetAudience: project.targetAudience } : null,
          stats: {
            plotCount: plots.filter((p) => p.nodeType !== 'folder').length,
            characterCount: characters.filter((c) => c.nodeType !== 'folder').length,
            memoCount: memos.filter((m) => m.nodeType !== 'folder').length,
            totalWordCount,
          },
        };
      },
    }),

    get_plot: tool({
      description:
        '指定したIDのプロットの全フィールド（あらすじ・舞台設定・テーマ・構成・対立・結末・備考）を取得します。プロットの詳細内容を確認・引用・編集する必要がある場合に使用してください。IDはシステムプロンプトのプロジェクト情報から取得できます。',
      inputSchema: z.object({
        id: z.string().describe('プロットID'),
      }),
      execute: async ({ id }) => {
        const plot = await adapters.plots.getById(id);
        if (!plot) return { error: 'プロットが見つかりません' };
        return {
          id: plot.id, name: plot.name,
          synopsis: plot.synopsis, setting: plot.setting, theme: plot.theme,
          structure: plot.structure, conflict: plot.conflict, resolution: plot.resolution,
          notes: plot.notes,
        };
      },
    }),

    get_all_plots: tool({
      description:
        'プロジェクト内の全プロットのサマリー一覧を取得します。注意: プロット一覧はシステムプロンプトに含まれているため、通常このツールは不要です。',
      inputSchema: z.object({}),
      execute: async () => {
        const plots = await adapters.plots.getByProjectId(projectId);
        return {
          plots: plots.filter((p) => p.nodeType !== 'folder').map((p) => ({
            id: p.id, name: p.name, synopsis: p.synopsis,
          })),
        };
      },
    }),

    get_character: tool({
      description:
        '指定したIDのキャラクターの全設定（別名・役職・性別・年齢・外見・性格・経歴・動機・人間関係・備考）を取得します。キャラクターの詳細を確認・引用・編集する必要がある場合に使用してください。IDはシステムプロンプトのプロジェクト情報から取得できます。',
      inputSchema: z.object({
        id: z.string().describe('キャラクターID'),
      }),
      execute: async ({ id }) => {
        const c = await adapters.characters.getById(id);
        if (!c) return { error: 'キャラクターが見つかりません' };
        return {
          id: c.id, name: c.name, aliases: c.aliases, role: c.role,
          gender: c.gender, age: c.age, appearance: c.appearance,
          personality: c.personality, background: c.background,
          motivation: c.motivation, relationships: c.relationships, notes: c.notes,
        };
      },
    }),

    get_all_characters: tool({
      description:
        'プロジェクト内の全キャラクター設定のサマリー一覧を取得します。注意: キャラクター一覧はシステムプロンプトに含まれているため、通常このツールは不要です。',
      inputSchema: z.object({}),
      execute: async () => {
        const characters = await adapters.characters.getByProjectId(projectId);
        return {
          characters: characters.filter((c) => c.nodeType !== 'folder').map((c) => ({
            id: c.id, name: c.name, role: c.role,
          })),
        };
      },
    }),

    get_memo: tool({
      description:
        '指定したIDのメモの全文とタグを取得します。メモの内容を確認・引用・編集する必要がある場合に使用してください。IDはシステムプロンプトのプロジェクト情報から取得できます。',
      inputSchema: z.object({
        id: z.string().describe('メモID'),
      }),
      execute: async ({ id }) => {
        const memo = await adapters.memos.getById(id);
        if (!memo) return { error: 'メモが見つかりません' };
        return { id: memo.id, name: memo.name, content: memo.content, tags: memo.tags };
      },
    }),

    get_all_memos: tool({
      description:
        'プロジェクト内の全メモのサマリー一覧を取得します。注意: メモ一覧はシステムプロンプトに含まれているため、通常このツールは不要です。',
      inputSchema: z.object({}),
      execute: async () => {
        const memos = await adapters.memos.getByProjectId(projectId);
        return {
          memos: memos.filter((m) => m.nodeType !== 'folder').map((m) => ({
            id: m.id, name: m.name, tags: m.tags,
          })),
        };
      },
    }),

    search_memos_by_tag: tool({
      description:
        '指定したタグに一致するメモを検索し、全文を含めて返します。特定のテーマや設定に関するメモをまとめて確認したい場合に使用してください。',
      inputSchema: z.object({
        tag: z.string().describe('検索するタグ'),
      }),
      execute: async ({ tag }) => {
        const memos = await adapters.memos.getByTag(projectId, tag);
        return {
          memos: memos.map((m) => ({
            id: m.id, name: m.name, content: m.content, tags: m.tags,
          })),
        };
      },
    }),

    get_writing: tool({
      description:
        '指定したIDの執筆本文を取得します。numberedContent に行番号付きテキストが含まれます。注意: 現在編集中のコンテンツが執筆の場合、システムプロンプトに全文が含まれているため再取得は不要です。propose_update_writing で行番号を指定する際は numberedContent を参照してください。',
      inputSchema: z.object({
        id: z.string().describe('執筆ID'),
      }),
      execute: async ({ id }) => {
        const writing = await adapters.writings.getById(id);
        if (!writing) return { error: '執筆データが見つかりません' };
        const lines = (writing.content ?? '').split('\n');
        const numberedContent = lines.map((line, i) => `${i + 1}: ${line}`).join('\n');
        return { id: writing.id, name: writing.name, content: writing.content, numberedContent, wordCount: writing.wordCount };
      },
    }),

    get_all_writings: tool({
      description:
        'プロジェクト内の全執筆のサマリー一覧を取得します（本文は含まない）。注意: 執筆一覧はシステムプロンプトに含まれているため、通常このツールは不要です。',
      inputSchema: z.object({}),
      execute: async () => {
        const writings = await adapters.writings.getByProjectId(projectId);
        return {
          writings: writings.filter((w) => w.nodeType !== 'folder').map((w) => ({
            id: w.id, name: w.name, wordCount: w.wordCount,
          })),
        };
      },
    }),

    get_total_word_count: tool({
      description:
        'プロジェクト全体の総文字数の最新値を取得します。進捗確認や目標文字数との比較に使用してください。',
      inputSchema: z.object({}),
      execute: async () => {
        const count = await adapters.writings.getTotalWordCount(projectId);
        return { totalWordCount: count };
      },
    }),
  };
}

/**
 * 提案ツール群を生成（write モード専用）
 *
 * データを直接変更せず、original / proposed を返す。
 * フロント側で diff 表示し、ユーザーが Accept した場合のみ
 * プログラム側が adapter.*.create() / adapter.*.update() を呼ぶ。
 */
function createProposalTools(projectId: string, adapters: ToolAdapters) {
  return {
    // ── propose_create ──

    propose_create_plot: tool({
      description:
        '新しいプロットの作成を提案します。ユーザーの承認後に実際に作成されます。できるだけ多くのフィールドを埋めてください。',
      inputSchema: z.object({
        name: z.string().describe('プロット名'),
        parentId: z.string().nullable().optional().describe('親フォルダID（ルート直下の場合はnullまたは省略）'),
        synopsis: z.string().optional().describe('あらすじ'),
        setting: z.string().optional().describe('舞台設定'),
        theme: z.string().optional().describe('テーマ'),
        structure: z.string().optional().describe('構成'),
        conflict: z.string().optional().describe('対立・葛藤'),
        resolution: z.string().optional().describe('結末'),
        notes: z.string().optional().describe('備考'),
      }),
      execute: async ({ name, parentId, ...data }) => {
        return {
          __proposal: true,
          action: 'create' as const,
          contentType: 'plot' as const,
          targetId: parentId ?? null,
          targetName: name,
          proposed: toReplaceFields({ name, parentId: parentId ?? null, ...data }),
        };
      },
    }),

    propose_create_character: tool({
      description:
        '新しいキャラクター設定の作成を提案します。ユーザーの承認後に実際に作成されます。できるだけ多くのフィールドを埋めてください。',
      inputSchema: z.object({
        name: z.string().describe('キャラクター名'),
        parentId: z.string().nullable().optional().describe('親フォルダID（ルート直下の場合はnullまたは省略）'),
        aliases: z.string().optional().describe('別名・あだ名'),
        role: z.string().optional().describe('役職・立場'),
        gender: z.string().optional().describe('性別'),
        age: z.string().optional().describe('年齢'),
        appearance: z.string().optional().describe('外見'),
        personality: z.string().optional().describe('性格'),
        background: z.string().optional().describe('経歴'),
        motivation: z.string().optional().describe('動機・目的'),
        relationships: z.string().optional().describe('人間関係'),
        notes: z.string().optional().describe('備考'),
      }),
      execute: async ({ name, parentId, ...data }) => {
        return {
          __proposal: true,
          action: 'create' as const,
          contentType: 'character' as const,
          targetId: parentId ?? null,
          targetName: name,
          proposed: toReplaceFields({ name, parentId: parentId ?? null, ...data }),
        };
      },
    }),

    propose_create_memo: tool({
      description:
        '新しいメモの作成を提案します。ユーザーの承認後に実際に作成されます。',
      inputSchema: z.object({
        name: z.string().describe('メモ名'),
        parentId: z.string().nullable().optional().describe('親フォルダID（ルート直下の場合はnullまたは省略）'),
        content: z.string().describe('メモ内容'),
        tags: z.array(z.string()).optional().describe('タグ'),
      }),
      execute: async ({ name, parentId, content, tags }) => {
        return {
          __proposal: true,
          action: 'create' as const,
          contentType: 'memo' as const,
          targetId: parentId ?? null,
          targetName: name,
          proposed: toReplaceFields({ name, parentId: parentId ?? null, content, ...(tags ? { tags } : {}) }),
        };
      },
    }),

    propose_create_writing: tool({
      description:
        '新しい執筆本文の作成を提案します。ユーザーの承認後に実際に作成されます。',
      inputSchema: z.object({
        name: z.string().describe('執筆タイトル'),
        parentId: z.string().nullable().optional().describe('親フォルダID（ルート直下の場合はnullまたは省略）'),
        content: z.string().describe('本文'),
      }),
      execute: async ({ name, parentId, content }) => {
        return {
          __proposal: true,
          action: 'create' as const,
          contentType: 'writing' as const,
          targetId: parentId ?? null,
          targetName: name,
          proposed: toReplaceFields({ name, parentId: parentId ?? null, content }),
        };
      },
    }),

    // ── propose_update ──

    propose_update_plot: tool({
      description:
        '既存プロットの変更を提案します。ユーザーの承認後に実際に更新されます。変更したいフィールドのみ指定してください。変更しないフィールドは省略してください。',
      inputSchema: z.object({
        id: z.string().describe('プロットID'),
        synopsis: z.string().optional().describe('あらすじ'),
        setting: z.string().optional().describe('舞台設定'),
        theme: z.string().optional().describe('テーマ'),
        structure: z.string().optional().describe('構成'),
        conflict: z.string().optional().describe('対立・葛藤'),
        resolution: z.string().optional().describe('結末'),
        notes: z.string().optional().describe('備考'),
      }),
      execute: async ({ id, ...data }) => {
        const current = await adapters.plots.getById(id);
        if (!current) return { error: 'プロットが見つかりません' };
        const diff = diffFields(data, toRecord(current));
        if (!diff) return { error: '変更されたフィールドがありません' };
        return {
          __proposal: true,
          action: 'update' as const,
          contentType: 'plot' as const,
          targetId: id,
          targetName: current.name,
          updatedAt: current.updatedAt.toISOString(),
          original: diff.original,
          proposed: toReplaceFields(diff.changed),
        };
      },
    }),

    propose_update_character: tool({
      description:
        '既存キャラクター設定の変更を提案します。ユーザーの承認後に実際に更新されます。変更したいフィールドのみ指定してください。変更しないフィールドは省略してください。',
      inputSchema: z.object({
        id: z.string().describe('キャラクターID'),
        name: z.string().optional().describe('名前'),
        aliases: z.string().optional().describe('別名・あだ名'),
        role: z.string().optional().describe('役職・立場'),
        gender: z.string().optional().describe('性別'),
        age: z.string().optional().describe('年齢'),
        appearance: z.string().optional().describe('外見'),
        personality: z.string().optional().describe('性格'),
        background: z.string().optional().describe('経歴'),
        motivation: z.string().optional().describe('動機・目的'),
        relationships: z.string().optional().describe('人間関係'),
        notes: z.string().optional().describe('備考'),
      }),
      execute: async ({ id, ...data }) => {
        const current = await adapters.characters.getById(id);
        if (!current) return { error: 'キャラクターが見つかりません' };
        const diff = diffFields(data, toRecord(current));
        if (!diff) return { error: '変更されたフィールドがありません' };
        return {
          __proposal: true,
          action: 'update' as const,
          contentType: 'character' as const,
          targetId: id,
          targetName: current.name,
          updatedAt: current.updatedAt.toISOString(),
          original: diff.original,
          proposed: toReplaceFields(diff.changed),
        };
      },
    }),

    propose_update_memo: tool({
      description:
        '既存メモの変更を提案します。ユーザーの承認後に実際に更新されます。変更したいフィールドのみ指定してください。変更しないフィールドは省略してください。',
      inputSchema: z.object({
        id: z.string().describe('メモID'),
        content: z.string().optional().describe('メモ内容'),
        tags: z.array(z.string()).optional().describe('タグ'),
      }),
      execute: async ({ id, ...data }) => {
        const current = await adapters.memos.getById(id);
        if (!current) return { error: 'メモが見つかりません' };
        const diff = diffFields(data, toRecord(current));
        if (!diff) return { error: '変更されたフィールドがありません' };
        return {
          __proposal: true,
          action: 'update' as const,
          contentType: 'memo' as const,
          targetId: id,
          targetName: current.name,
          updatedAt: current.updatedAt.toISOString(),
          original: diff.original,
          proposed: toReplaceFields(diff.changed),
        };
      },
    }),

    propose_update_writing: tool({
      description:
        '既存の執筆本文を行単位で変更提案します。ユーザーの承認後に実際に更新されます。変更したい行だけを edits で指定してください。事前に get_writing で行番号付きテキストを確認してから使用してください（現在編集中のコンテンツの場合はシステムプロンプトの内容を参照）。expectedText には変更前の行テキストを指定してください（整合性検証に使用）。',
      inputSchema: z.object({
        id: z.string().describe('執筆ID'),
        edits: z.array(z.object({
          startLine: z.number().describe('変更開始行（1始まり）'),
          endLine: z.number().describe('変更終了行（1始まり、含む）。startLine > endLine なら startLine の前に挿入'),
          newText: z.string().describe('置換後のテキスト（空文字列なら削除）'),
          expectedText: z.string().optional().describe('変更前の行テキスト（startLine〜endLineの内容を改行区切りで指定。整合性検証に使用。省略可能だが指定を強く推奨）'),
        })).describe('行単位の編集指示の配列'),
      }),
      execute: async ({ id, edits }) => {
        const current = await adapters.writings.getById(id);
        if (!current) return { error: '執筆データが見つかりません' };
        const lines = (current.content ?? '').split('\n');

        // 行内容の整合性検証
        const validation = validateLineEditsConsistency(lines, edits);
        if (!validation.valid) {
          const details = validation.mismatches.map(
            (m) => `行${m.line}: 期待="${m.expected}" 実際="${m.actual}"`,
          ).join(', ');
          return {
            error: `行内容が一致しません。テキストが更新されている可能性があります。get_writing で最新のテキストを再取得してください。不一致: ${details}`,
          };
        }

        // original: 編集対象行のテキストを保持
        const originalLines: Record<string, unknown> = {};
        for (const edit of edits) {
          for (let i = edit.startLine; i <= edit.endLine && i <= lines.length; i++) {
            originalLines[`line_${i}`] = lines[i - 1];
          }
        }
        return {
          __proposal: true,
          action: 'update' as const,
          contentType: 'writing' as const,
          targetId: id,
          targetName: current.name,
          updatedAt: current.updatedAt.toISOString(),
          original: originalLines,
          proposed: {
            content: { type: 'line_edits' as const, edits },
          },
        };
      },
    }),

    propose_update_project: tool({
      description:
        'プロジェクト（作品）の基本情報の変更を提案します。ユーザーの承認後に実際に更新されます。変更したいフィールドのみ指定してください。変更しないフィールドは省略してください。',
      inputSchema: z.object({
        synopsis: z.string().optional().describe('あらすじ'),
        theme: z.string().optional().describe('テーマ'),
        goal: z.string().optional().describe('終着点・ゴール'),
        targetWordCount: z.number().optional().describe('執筆予定文字数'),
        targetAudience: z.string().optional().describe('ターゲット層'),
      }),
      execute: async (input) => {
        const project = await adapters.projects.getById(projectId);
        if (!project) return { error: 'プロジェクトが見つかりません' };

        const currentRecord: Record<string, unknown> = {
          synopsis: project.synopsis,
          theme: project.theme,
          goal: project.goal,
          targetWordCount: project.targetWordCount,
          targetAudience: project.targetAudience,
        };
        const inputRecord: Record<string, unknown> = {
          synopsis: input.synopsis,
          theme: input.theme,
          goal: input.goal,
          targetWordCount: input.targetWordCount,
          targetAudience: input.targetAudience,
        };
        const diff = diffFields(inputRecord, currentRecord);
        if (!diff) return { error: '変更がありません。現在の値と同じです。' };

        return {
          __proposal: true,
          action: 'update' as const,
          contentType: 'project' as const,
          targetId: projectId,
          targetName: project.name,
          updatedAt: project.updatedAt.toISOString(),
          original: diff.original,
          proposed: toReplaceFields(diff.changed),
        };
      },
    }),
  };
}

/**
 * AIメモリ操作のコールバック
 */
export interface MemoryOperations {
  save: (content: string) => Promise<{ id: string; content: string }>;
  delete: (id: string) => Promise<boolean>;
}

/**
 * メモリ操作ツール群を生成（ask / write 共通）
 */
function createMemoryTools(memoryOps: MemoryOperations) {
  return {
    save_memory: tool({
      description:
        '重要な情報をメモリに保存します。ユーザーの好み、作品の方針、重要な決定事項など、今後の会話で参照すべき情報を記録してください。セッションをまたいで保持されます。同じ内容を重複して保存しないでください。',
      inputSchema: z.object({
        content: z.string().describe('保存する情報（簡潔に1〜2文で）'),
      }),
      execute: async ({ content }) => {
        const memory = await memoryOps.save(content);
        return { saved: true, id: memory.id, content: memory.content };
      },
    }),

    delete_memory: tool({
      description:
        '不要になったメモリを削除します。古くなった情報や誤った情報を削除する場合に使用してください。IDはシステムプロンプトのAIメモリセクションから取得できます。',
      inputSchema: z.object({
        id: z.string().describe('削除するメモリのID'),
      }),
      execute: async ({ id }) => {
        const deleted = await memoryOps.delete(id);
        if (!deleted) return { error: '指定されたメモリが見つかりません' };
        return { deleted: true, id };
      },
    }),
  };
}

/**
 * モードに応じたツールセットを生成
 */
export function createAITools(projectId: string, mode: AIChatMode, adapters: ToolAdapters, memoryOps?: MemoryOperations) {
  const readTools = createReadTools(projectId, adapters);
  const memoryTools = memoryOps ? createMemoryTools(memoryOps) : {};

  if (mode === 'write') {
    const proposalTools = createProposalTools(projectId, adapters);
    return { ...readTools, ...memoryTools, ...proposalTools };
  }

  return { ...readTools, ...memoryTools };
}
