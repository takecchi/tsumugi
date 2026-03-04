import type { Project, Writing, Plot, Character, Memo } from '@tsumugi/adapter';
import {
  sanitizeFileName,
  formatOrder,
  buildSegment,
  buildProjectReadme,
  buildWritingMarkdown,
  buildPlotMarkdown,
  buildCharacterMarkdown,
  buildMemoMarkdown,
  buildWritingEntries,
  buildPlotEntries,
  buildCharacterEntries,
  buildMemoEntries,
} from './export-markdown';

const baseTimestamps = {
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
};

const baseNode = {
  projectId: '/projects/test',
  parentId: null,
  ...baseTimestamps,
};

function makeWriting(
  overrides: Partial<Writing> & Pick<Writing, 'id' | 'name' | 'order'>,
): Writing {
  return {
    ...baseNode,
    nodeType: 'writing',
    parentId: null,
    content: '',
    wordCount: 0,
    ...overrides,
  };
}

function makePlot(
  overrides: Partial<Plot> & Pick<Plot, 'id' | 'name' | 'order'>,
): Plot {
  return {
    ...baseNode,
    nodeType: 'plot',
    parentId: null,
    ...overrides,
  };
}

function makeCharacter(
  overrides: Partial<Character> & Pick<Character, 'id' | 'name' | 'order'>,
): Character {
  return {
    ...baseNode,
    nodeType: 'character',
    parentId: null,
    ...overrides,
  };
}

function makeMemo(
  overrides: Partial<Memo> & Pick<Memo, 'id' | 'name' | 'order'>,
): Memo {
  return {
    ...baseNode,
    nodeType: 'memo',
    parentId: null,
    content: '',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// sanitizeFileName
// ---------------------------------------------------------------------------

describe('sanitizeFileName', () => {
  it('通常の文字列はそのまま返す', () => {
    expect(sanitizeFileName('第一章')).toBe('第一章');
  });

  it('スラッシュをハイフンに変換する', () => {
    expect(sanitizeFileName('act/scene')).toBe('act-scene');
  });

  it('バックスラッシュをハイフンに変換する', () => {
    expect(sanitizeFileName('act\\scene')).toBe('act-scene');
  });

  it('コロン等の特殊文字をハイフンに変換する', () => {
    // スペースはそのまま保持、コロンのみハイフンに変換される
    expect(sanitizeFileName('chapter: one')).toBe('chapter- one');
    // 連続する特殊文字は1つのハイフンにまとめる
    expect(sanitizeFileName('chapter::one')).toBe('chapter-one');
  });

  it('先頭・末尾のハイフンを除去する', () => {
    expect(sanitizeFileName('/chapter/')).toBe('chapter');
  });

  it('空文字列は untitled を返す', () => {
    expect(sanitizeFileName('')).toBe('untitled');
  });

  it('特殊文字のみは untitled を返す', () => {
    expect(sanitizeFileName('///')).toBe('untitled');
  });
});

// ---------------------------------------------------------------------------
// formatOrder
// ---------------------------------------------------------------------------

describe('formatOrder', () => {
  it('0 は "0000" になる', () => {
    expect(formatOrder(0)).toBe('0000');
  });

  it('42 は "0042" になる', () => {
    expect(formatOrder(42)).toBe('0042');
  });

  it('9999 は "9999" になる', () => {
    expect(formatOrder(9999)).toBe('9999');
  });

  it('10000 は 5桁になる（パディングは最低桁数のみ保証）', () => {
    expect(formatOrder(10000)).toBe('10000');
  });
});

// ---------------------------------------------------------------------------
// buildSegment
// ---------------------------------------------------------------------------

describe('buildSegment', () => {
  it('order と name を結合したセグメントを返す', () => {
    expect(buildSegment(0, '第一章')).toBe('0000_第一章');
    expect(buildSegment(3, 'プロローグ')).toBe('0003_プロローグ');
  });

  it('name に特殊文字が含まれる場合はサニタイズする', () => {
    expect(buildSegment(1, 'act/scene')).toBe('0001_act-scene');
  });
});

// ---------------------------------------------------------------------------
// buildProjectReadme
// ---------------------------------------------------------------------------

describe('buildProjectReadme', () => {
  const baseProject: Project = {
    id: '/projects/test',
    name: 'テストプロジェクト',
    ...baseTimestamps,
  };

  it('name のみのプロジェクトは h1 タイトルと空行を返す', () => {
    const result = buildProjectReadme(baseProject);
    expect(result).toBe('# テストプロジェクト\n');
  });

  it('synopsis があればセクションを含む', () => {
    const project: Project = { ...baseProject, synopsis: 'あらすじ内容' };
    const result = buildProjectReadme(project);
    expect(result).toContain('## あらすじ');
    expect(result).toContain('あらすじ内容');
  });

  it('theme, goal, targetWordCount, targetAudience が全てある場合', () => {
    const project: Project = {
      ...baseProject,
      synopsis: 'あらすじ',
      theme: 'テーマ',
      goal: 'ゴール',
      targetWordCount: 80000,
      targetAudience: '一般',
    };
    const result = buildProjectReadme(project);
    expect(result).toContain('## テーマ');
    expect(result).toContain('## ゴール');
    expect(result).toContain('## 目標文字数');
    expect(result).toContain('80000');
    expect(result).toContain('## 対象読者');
    expect(result).toContain('一般');
  });
});

// ---------------------------------------------------------------------------
// buildWritingMarkdown
// ---------------------------------------------------------------------------

describe('buildWritingMarkdown', () => {
  it('name と content を含む markdown を生成する', () => {
    const writing = makeWriting({
      id: '/writings/1.json',
      name: 'プロローグ',
      order: 0,
      content: '物語のはじまり。',
    });
    const result = buildWritingMarkdown(writing);
    expect(result).toBe('# プロローグ\n\n物語のはじまり。');
  });

  it('content が空の場合は h1 のみ', () => {
    const writing = makeWriting({
      id: '/writings/1.json',
      name: '空の章',
      order: 0,
    });
    const result = buildWritingMarkdown(writing);
    expect(result).toBe('# 空の章\n');
  });
});

// ---------------------------------------------------------------------------
// buildPlotMarkdown
// ---------------------------------------------------------------------------

describe('buildPlotMarkdown', () => {
  it('全フィールドがある場合は全セクションを含む', () => {
    const plot = makePlot({
      id: '/plots/1.json',
      name: 'メインプロット',
      order: 0,
      synopsis: 'あらすじ',
      setting: '舞台設定',
      theme: 'テーマ',
      structure: '三幕構成',
      conflict: '主人公 vs 敵',
      resolution: 'ハッピーエンド',
      notes: 'メモ',
    });
    const result = buildPlotMarkdown(plot);
    expect(result).toContain('# メインプロット');
    expect(result).toContain('## あらすじ');
    expect(result).toContain('## 舞台設定');
    expect(result).toContain('## テーマ');
    expect(result).toContain('## 構成');
    expect(result).toContain('## 葛藤');
    expect(result).toContain('## 解決');
    expect(result).toContain('## ノート');
  });

  it('フィールドが空の場合はそのセクションを省略する', () => {
    const plot = makePlot({
      id: '/plots/1.json',
      name: 'シンプルプロット',
      order: 0,
    });
    const result = buildPlotMarkdown(plot);
    expect(result).not.toContain('## あらすじ');
  });
});

// ---------------------------------------------------------------------------
// buildCharacterMarkdown
// ---------------------------------------------------------------------------

describe('buildCharacterMarkdown', () => {
  it('基本情報がある場合はテーブルを含む', () => {
    const character = makeCharacter({
      id: '/characters/1.json',
      name: '主人公',
      order: 0,
      role: '探偵',
      gender: '男性',
      age: '30',
      aliases: 'Mr.X',
    });
    const result = buildCharacterMarkdown(character);
    expect(result).toContain('| 項目 | 内容 |');
    expect(result).toContain('| 役割 | 探偵 |');
    expect(result).toContain('| 性別 | 男性 |');
    expect(result).toContain('| 年齢 | 30 |');
    expect(result).toContain('| 別名 | Mr.X |');
  });

  it('基本情報が全てない場合はテーブルを省略する', () => {
    const character = makeCharacter({
      id: '/characters/1.json',
      name: '謎の人物',
      order: 0,
    });
    const result = buildCharacterMarkdown(character);
    expect(result).not.toContain('| 項目 | 内容 |');
  });

  it('詳細フィールドがある場合はセクションを含む', () => {
    const character = makeCharacter({
      id: '/characters/1.json',
      name: '主人公',
      order: 0,
      appearance: '黒髪',
      personality: '誠実',
      background: '幼少期に孤独',
      motivation: '真実を追う',
      relationships: '相棒がいる',
      notes: '補足',
    });
    const result = buildCharacterMarkdown(character);
    expect(result).toContain('## 外見');
    expect(result).toContain('## 性格');
    expect(result).toContain('## 背景');
    expect(result).toContain('## 動機');
    expect(result).toContain('## 人間関係');
    expect(result).toContain('## ノート');
  });
});

// ---------------------------------------------------------------------------
// buildMemoMarkdown
// ---------------------------------------------------------------------------

describe('buildMemoMarkdown', () => {
  it('タグありのメモを正しく出力する', () => {
    const memo = makeMemo({
      id: '/memos/1.json',
      name: '設定メモ',
      order: 0,
      content: '世界観の説明。',
      tags: ['設定', '世界観'],
    });
    const result = buildMemoMarkdown(memo);
    expect(result).toContain('# 設定メモ');
    expect(result).toContain('タグ: 設定, 世界観');
    expect(result).toContain('世界観の説明。');
  });

  it('タグなしのメモはタグ行を省略する', () => {
    const memo = makeMemo({
      id: '/memos/1.json',
      name: 'タグなし',
      order: 0,
      content: 'メモ内容',
    });
    const result = buildMemoMarkdown(memo);
    expect(result).not.toContain('タグ:');
  });
});

// ---------------------------------------------------------------------------
// buildWritingEntries（ツリー構造）
// ---------------------------------------------------------------------------

describe('buildWritingEntries', () => {
  it('フラットなリストから zip パスを正しく生成する', () => {
    const writings: Writing[] = [
      makeWriting({ id: 'id-1', name: 'プロローグ', order: 0 }),
      makeWriting({ id: 'id-2', name: 'エピローグ', order: 1 }),
    ];
    const entries = buildWritingEntries(writings);
    expect(entries).toHaveLength(2);
    expect(entries[0].path).toBe('writings/0000_プロローグ.md');
    expect(entries[1].path).toBe('writings/0001_エピローグ.md');
  });

  it('フォルダノードは除外する', () => {
    const writings: Writing[] = [
      makeWriting({
        id: 'folder-1',
        name: '第一部',
        order: 0,
        nodeType: 'folder',
        content: '',
      }),
      makeWriting({
        id: 'id-1',
        name: '第一章',
        order: 0,
        parentId: 'folder-1',
      }),
    ];
    const entries = buildWritingEntries(writings);
    expect(entries).toHaveLength(1);
    expect(entries[0].path).toBe('writings/0000_第一部/0000_第一章.md');
  });

  it('ネストしたフォルダ構造でパスが正しく生成される', () => {
    const writings: Writing[] = [
      makeWriting({
        id: 'folder-1',
        name: '第一部',
        order: 0,
        nodeType: 'folder',
        content: '',
      }),
      makeWriting({
        id: 'folder-2',
        name: '前半',
        order: 0,
        nodeType: 'folder',
        content: '',
        parentId: 'folder-1',
      }),
      makeWriting({
        id: 'id-1',
        name: '第一章',
        order: 0,
        parentId: 'folder-2',
      }),
    ];
    const entries = buildWritingEntries(writings);
    expect(entries).toHaveLength(1);
    expect(entries[0].path).toBe(
      'writings/0000_第一部/0000_前半/0000_第一章.md',
    );
  });

  it('親が見つからない孤立ノードはルートに配置される', () => {
    const writings: Writing[] = [
      makeWriting({
        id: 'id-1',
        name: '孤立した章',
        order: 2,
        parentId: 'non-existent',
      }),
    ];
    const entries = buildWritingEntries(writings);
    expect(entries).toHaveLength(1);
    expect(entries[0].path).toBe('writings/0002_孤立した章.md');
  });
});

// ---------------------------------------------------------------------------
// buildPlotEntries
// ---------------------------------------------------------------------------

describe('buildPlotEntries', () => {
  it('フォルダを除外しプロット一覧の zip パスを生成する', () => {
    const plots: Plot[] = [
      makePlot({
        id: 'folder-1',
        name: 'グループ',
        order: 0,
        nodeType: 'folder',
      }),
      makePlot({
        id: 'id-1',
        name: 'メインプロット',
        order: 0,
        parentId: 'folder-1',
      }),
    ];
    const entries = buildPlotEntries(plots);
    expect(entries).toHaveLength(1);
    expect(entries[0].path).toBe('plots/0000_グループ/0000_メインプロット.md');
  });
});

// ---------------------------------------------------------------------------
// buildCharacterEntries
// ---------------------------------------------------------------------------

describe('buildCharacterEntries', () => {
  it('フォルダを除外しキャラクター一覧の zip パスを生成する', () => {
    const characters: Character[] = [
      makeCharacter({ id: 'id-1', name: '主人公', order: 0 }),
      makeCharacter({ id: 'id-2', name: '敵役', order: 1 }),
    ];
    const entries = buildCharacterEntries(characters);
    expect(entries).toHaveLength(2);
    expect(entries[0].path).toBe('characters/0000_主人公.md');
    expect(entries[1].path).toBe('characters/0001_敵役.md');
  });
});

// ---------------------------------------------------------------------------
// buildMemoEntries
// ---------------------------------------------------------------------------

describe('buildMemoEntries', () => {
  it('フォルダを除外しメモ一覧の zip パスを生成する', () => {
    const memos: Memo[] = [
      makeMemo({ id: 'id-1', name: '設定メモ', order: 0, tags: ['設定'] }),
    ];
    const entries = buildMemoEntries(memos);
    expect(entries).toHaveLength(1);
    expect(entries[0].path).toBe('memos/0000_設定メモ.md');
  });
});
