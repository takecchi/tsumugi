import type { Project, Plot, Character, Memo, Writing } from '@tsumugi/adapter';
import type { ToolAdapters } from '@/adapters/ai-tools';
import { buildProjectSummary, fetchActiveTabContent } from './ai-context';

const ts = new Date('2025-01-01');

function mockProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-1',
    name: 'テスト作品',
    createdAt: ts,
    updatedAt: ts,
    ...overrides,
  };
}

function mockPlot(overrides: Partial<Plot> = {}): Plot {
  return {
    id: 'plot-1',
    projectId: 'proj-1',
    parentId: null,
    name: 'メインプロット',
    nodeType: 'plot',
    order: 0,
    createdAt: ts,
    updatedAt: ts,
    ...overrides,
  };
}

function mockCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'char-1',
    projectId: 'proj-1',
    parentId: null,
    name: '太郎',
    nodeType: 'character',
    order: 0,
    createdAt: ts,
    updatedAt: ts,
    ...overrides,
  };
}

function mockMemo(overrides: Partial<Memo> = {}): Memo {
  return {
    id: 'memo-1',
    projectId: 'proj-1',
    parentId: null,
    name: '世界観メモ',
    nodeType: 'memo',
    order: 0,
    content: 'メモ内容',
    createdAt: ts,
    updatedAt: ts,
    ...overrides,
  };
}

function mockWriting(overrides: Partial<Writing> = {}): Writing {
  return {
    id: 'writing-1',
    projectId: 'proj-1',
    parentId: null,
    name: '第一章',
    nodeType: 'writing',
    order: 0,
    content: '本文テキスト',
    wordCount: 500,
    createdAt: ts,
    updatedAt: ts,
    ...overrides,
  };
}

function createMockAdapters(overrides: {
  project?: Project | null;
  plots?: Plot[];
  characters?: Character[];
  memos?: Memo[];
  writings?: Writing[];
} = {}): ToolAdapters {
  return {
    projects: {
      getAll: jest.fn(),
      getById: jest.fn().mockResolvedValue(overrides.project ?? mockProject()),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    plots: {
      getByProjectId: jest.fn().mockResolvedValue(overrides.plots ?? []),
      getTreeByProjectId: jest.fn(),
      getById: jest.fn().mockImplementation(async (id: string) => {
        return (overrides.plots ?? []).find((p) => p.id === id) ?? null;
      }),
      getChildren: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      move: jest.fn(),
      reorder: jest.fn(),
    },
    characters: {
      getByProjectId: jest.fn().mockResolvedValue(overrides.characters ?? []),
      getTreeByProjectId: jest.fn(),
      getById: jest.fn().mockImplementation(async (id: string) => {
        return (overrides.characters ?? []).find((c) => c.id === id) ?? null;
      }),
      getChildren: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      move: jest.fn(),
      reorder: jest.fn(),
    },
    memos: {
      getByProjectId: jest.fn().mockResolvedValue(overrides.memos ?? []),
      getTreeByProjectId: jest.fn(),
      getById: jest.fn().mockImplementation(async (id: string) => {
        return (overrides.memos ?? []).find((m) => m.id === id) ?? null;
      }),
      getChildren: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      move: jest.fn(),
      reorder: jest.fn(),
      getByTag: jest.fn(),
    },
    writings: {
      getByProjectId: jest.fn().mockResolvedValue(overrides.writings ?? []),
      getTreeByProjectId: jest.fn(),
      getById: jest.fn().mockImplementation(async (id: string) => {
        return (overrides.writings ?? []).find((w) => w.id === id) ?? null;
      }),
      getChildren: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      move: jest.fn(),
      reorder: jest.fn(),
      getTotalWordCount: jest.fn(),
    },
  };
}

describe('buildProjectSummary', () => {
  it('プロジェクト情報が含まれる', async () => {
    const adapters = createMockAdapters({
      project: mockProject({ name: '異世界物語', synopsis: 'あらすじテキスト', theme: 'ファンタジー' }),
    });
    const result = await buildProjectSummary('proj-1', adapters);
    expect(result).toContain('## プロジェクト情報');
    expect(result).toContain('異世界物語');
    expect(result).toContain('あらすじテキスト');
    expect(result).toContain('ファンタジー');
  });

  it('targetWordCount がフォーマットされる', async () => {
    const adapters = createMockAdapters({
      project: mockProject({ targetWordCount: 100000 }),
    });
    const result = await buildProjectSummary('proj-1', adapters);
    expect(result).toContain('100,000字');
  });

  it('プロット一覧が含まれる（フォルダは除外）', async () => {
    const adapters = createMockAdapters({
      plots: [
        mockPlot({ id: 'p1', name: '序章', synopsis: 'はじまりの物語' }),
        mockPlot({ id: 'p-folder', name: 'フォルダ', nodeType: 'folder' }),
      ],
    });
    const result = await buildProjectSummary('proj-1', adapters);
    expect(result).toContain('### プロット一覧（1件）');
    expect(result).toContain('序章 (id: p1)');
    expect(result).toContain('はじまりの物語');
    expect(result).not.toContain('フォルダ');
  });

  it('キャラクター一覧に role が表示される', async () => {
    const adapters = createMockAdapters({
      characters: [mockCharacter({ name: '花子', role: '主人公' })],
    });
    const result = await buildProjectSummary('proj-1', adapters);
    expect(result).toContain('### キャラクター一覧（1件）');
    expect(result).toContain('花子');
    expect(result).toContain('主人公');
  });

  it('メモ一覧にタグが表示される', async () => {
    const adapters = createMockAdapters({
      memos: [mockMemo({ name: '設定メモ', tags: ['世界観', '魔法'] })],
    });
    const result = await buildProjectSummary('proj-1', adapters);
    expect(result).toContain('### メモ一覧（1件）');
    expect(result).toContain('[世界観, 魔法]');
  });

  it('執筆一覧に文字数が表示される', async () => {
    const adapters = createMockAdapters({
      writings: [mockWriting({ name: '第一章', wordCount: 3000 })],
    });
    const result = await buildProjectSummary('proj-1', adapters);
    expect(result).toContain('### 執筆一覧（1件）');
    expect(result).toContain('3000文字');
  });

  it('コンテンツが空のときはセクションが出力されない', async () => {
    const adapters = createMockAdapters();
    const result = await buildProjectSummary('proj-1', adapters);
    expect(result).toContain('## プロジェクト情報');
    expect(result).not.toContain('### プロット一覧');
    expect(result).not.toContain('### キャラクター一覧');
    expect(result).not.toContain('### メモ一覧');
    expect(result).not.toContain('### 執筆一覧');
  });
});

describe('fetchActiveTabContent', () => {
  it('context が undefined のとき空文字を返す', async () => {
    const adapters = createMockAdapters();
    const result = await fetchActiveTabContent(undefined, adapters);
    expect(result).toBe('');
  });

  it('active なタブがないとき空文字を返す', async () => {
    const adapters = createMockAdapters();
    const result = await fetchActiveTabContent({ openTabs: [] }, adapters);
    expect(result).toBe('');
  });

  it('active フラグがないタブのみのとき空文字を返す', async () => {
    const adapters = createMockAdapters();
    const result = await fetchActiveTabContent({
      openTabs: [{ id: 'other', name: 'other', contentType: 'plot' }],
    }, adapters);
    expect(result).toBe('');
  });

  it('プロットの全文を取得して返す', async () => {
    const plot = mockPlot({ id: 'p1', synopsis: '物語の始まり', setting: '中世ヨーロッパ' });
    const adapters = createMockAdapters({ plots: [plot] });
    const result = await fetchActiveTabContent({
      openTabs: [{ id: 'p1', name: 'プロットA', contentType: 'plot', active: true }],
    }, adapters);
    expect(result).toContain('## 現在編集中のコンテンツ');
    expect(result).toContain('[プロット] プロットA');
    expect(result).toContain('物語の始まり');
    expect(result).toContain('中世ヨーロッパ');
  });

  it('キャラクターの全フィールドを取得して返す', async () => {
    const char = mockCharacter({ id: 'c1', name: '太郎', role: '勇者', personality: '明るい' });
    const adapters = createMockAdapters({ characters: [char] });
    const result = await fetchActiveTabContent({
      openTabs: [{ id: 'c1', name: '太郎', contentType: 'character', active: true }],
    }, adapters);
    expect(result).toContain('[キャラクター] 太郎');
    expect(result).toContain('役職・立場: 勇者');
    expect(result).toContain('性格: 明るい');
  });

  it('メモの内容とタグを返す', async () => {
    const memo = mockMemo({ id: 'm1', content: 'メモ本文', tags: ['重要', '設定'] });
    const adapters = createMockAdapters({ memos: [memo] });
    const result = await fetchActiveTabContent({
      openTabs: [{ id: 'm1', name: 'テストメモ', contentType: 'memo', active: true }],
    }, adapters);
    expect(result).toContain('[メモ] テストメモ');
    expect(result).toContain('タグ: 重要, 設定');
    expect(result).toContain('メモ本文');
  });

  it('執筆の本文を返す', async () => {
    const writing = mockWriting({ id: 'w1', content: '昔々あるところに' });
    const adapters = createMockAdapters({ writings: [writing] });
    const result = await fetchActiveTabContent({
      openTabs: [{ id: 'w1', name: '第一章', contentType: 'writing', active: true }],
    }, adapters);
    expect(result).toContain('[執筆] 第一章');
    expect(result).toContain('昔々あるところに');
  });

  it('コンテンツが見つからないとき空文字を返す', async () => {
    const adapters = createMockAdapters();
    const result = await fetchActiveTabContent({
      openTabs: [{ id: 'missing-id', name: 'ない', contentType: 'writing', active: true }],
    }, adapters);
    expect(result).toBe('');
  });
});
