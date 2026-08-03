import type { CommitTimelineItem } from './commit-timeline';
import type { CommitDiffEntryItem } from './commit-diff-view';
import type { NodeRevisionItem } from './node-revision-panel';

/**
 * Story 用のモックデータ。
 * packages/ui は adapter に依存しないため、ここで直接定義する。
 */
export const mockCommits: CommitTimelineItem[] = [
  {
    id: 'commit_5',
    message: '自動保存',
    commitType: 'auto',
    addedCount: 0,
    modifiedCount: 1,
    removedCount: 0,
    createdAt: new Date('2026-08-04T18:42:00'),
  },
  {
    id: 'commit_4',
    message: '第二章の視点を三人称に統一した',
    commitType: 'manual',
    addedCount: 0,
    modifiedCount: 3,
    removedCount: 1,
    createdAt: new Date('2026-08-04T16:05:00'),
  },
  {
    id: 'commit_3',
    message: '「第一章 雨の帰り道」の時点に復元',
    commitType: 'restore',
    addedCount: 1,
    modifiedCount: 2,
    removedCount: 0,
    createdAt: new Date('2026-08-04T11:20:00'),
  },
  {
    id: 'commit_2',
    message: '復元前の自動バックアップ',
    commitType: 'backup',
    addedCount: 0,
    modifiedCount: 2,
    removedCount: 0,
    createdAt: new Date('2026-08-04T11:19:00'),
  },
  {
    id: 'commit_1',
    message: '第一章 雨の帰り道',
    commitType: 'manual',
    addedCount: 4,
    modifiedCount: 0,
    removedCount: 0,
    createdAt: new Date('2026-08-03T22:10:00'),
  },
];

export const mockDiffEntries: CommitDiffEntryItem[] = [
  {
    entryType: 'node',
    targetId: 'node_writing_1',
    changeType: 'modified',
    name: '第二章 図書室の午後',
    nodeType: 'writing',
    fieldChanges: [
      { field: 'name', oldValue: '第二章 図書室', newValue: '第二章 図書室の午後' },
      { field: 'canon_status', oldValue: 'draft', newValue: 'confirmed' },
    ],
    textDiffs: [
      {
        field: 'content',
        lines: [
          { op: 'eq', text: '　窓の外では、まだ雨が降り続いていた。' },
          { op: 'eq', text: '' },
          { op: 'del', text: '　私は本棚の前で立ち止まった。' },
          { op: 'add', text: '　彼女は本棚の前で立ち止まった。' },
          { op: 'add', text: '　背表紙をなぞる指が、一冊のところで止まる。' },
          { op: 'eq', text: '' },
          { op: 'eq', text: '「これ、まだ返してなかったんだ」' },
          { op: 'eq', text: '' },
          { op: 'eq', text: '　声が思ったより大きく響いて、慌てて口をつぐんだ。' },
          { op: 'eq', text: '　図書室には誰もいないはずだった。' },
          { op: 'eq', text: '' },
          { op: 'eq', text: '　けれど、奥の閲覧席から椅子を引く音がした。' },
          { op: 'del', text: '　私は息を止めた。' },
          { op: 'add', text: '　彼女は息を止めた。' },
        ],
      },
    ],
  },
  {
    entryType: 'node',
    targetId: 'node_memo_9',
    changeType: 'added',
    name: '伏線メモ: 図書室の鍵',
    nodeType: 'memo',
    fieldChanges: [],
    textDiffs: [],
  },
  {
    entryType: 'glossary_term',
    targetId: 'term_3',
    changeType: 'removed',
    name: '旧校舎',
    nodeType: null,
    fieldChanges: [],
    textDiffs: [],
  },
  {
    entryType: 'instruction',
    targetId: 'instruction_1',
    changeType: 'modified',
    name: '文体の指示',
    nodeType: null,
    fieldChanges: [
      { field: 'enabled', oldValue: 'false', newValue: 'true' },
    ],
    textDiffs: [
      {
        field: 'content',
        lines: [
          { op: 'del', text: '一人称視点で書く。' },
          { op: 'add', text: '三人称一元視点で書く。' },
          { op: 'eq', text: '地の文は常体、会話文は口語で。' },
        ],
      },
    ],
  },
];

export const mockNodeRevisions: NodeRevisionItem[] = [
  {
    commitId: 'commit_5',
    message: '自動保存',
    commitType: 'auto',
    createdAt: new Date('2026-08-04T18:42:00'),
    changeType: 'modified',
  },
  {
    commitId: 'commit_4',
    message: '第二章の視点を三人称に統一した',
    commitType: 'manual',
    createdAt: new Date('2026-08-04T16:05:00'),
    changeType: 'modified',
  },
  {
    commitId: 'commit_1',
    message: '第一章 雨の帰り道',
    commitType: 'manual',
    createdAt: new Date('2026-08-03T22:10:00'),
    changeType: 'added',
  },
];
