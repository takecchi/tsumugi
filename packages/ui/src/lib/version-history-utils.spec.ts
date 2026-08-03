import {
  buildDiffRows,
  COMMIT_MESSAGE_MAX_LENGTH,
  countDiffLineOps,
  formatChangeCounts,
  groupByDay,
  toLocalDateKey,
  validateCommitMessage,
  type DiffLineInput,
  type DiffRow,
} from '@/lib/version-history-utils';

describe('validateCommitMessage', () => {
  it('1文字以上ならエラーにならない', () => {
    expect(validateCommitMessage('a')).toBeNull();
    expect(validateCommitMessage('第一章を書き上げた')).toBeNull();
  });

  it('空文字・空白のみはエラー', () => {
    expect(validateCommitMessage('')).toBe('メッセージを入力してください');
    expect(validateCommitMessage('   \n\t ')).toBe(
      'メッセージを入力してください',
    );
  });

  it('上限文字数ちょうどは許可する', () => {
    expect(validateCommitMessage('あ'.repeat(COMMIT_MESSAGE_MAX_LENGTH))).toBe(
      null,
    );
  });

  it('上限を超えるとエラー', () => {
    expect(
      validateCommitMessage('あ'.repeat(COMMIT_MESSAGE_MAX_LENGTH + 1)),
    ).toBe('メッセージは500文字以内で入力してください');
  });

  it('前後の空白は文字数に含めない', () => {
    const message = `  ${'あ'.repeat(COMMIT_MESSAGE_MAX_LENGTH)}  `;
    expect(validateCommitMessage(message)).toBeNull();
  });
});

describe('formatChangeCounts', () => {
  it('0件の種別を省略する', () => {
    expect(formatChangeCounts({ added: 2, modified: 1, removed: 0 })).toBe(
      '追加 2件・変更 1件',
    );
    expect(formatChangeCounts({ added: 0, modified: 0, removed: 5 })).toBe(
      '削除 5件',
    );
  });

  it('全種別を表示する', () => {
    expect(formatChangeCounts({ added: 1, modified: 2, removed: 3 })).toBe(
      '追加 1件・変更 2件・削除 3件',
    );
  });

  it('すべて0件なら「変更なし」', () => {
    expect(formatChangeCounts({ added: 0, modified: 0, removed: 0 })).toBe(
      '変更なし',
    );
  });
});

describe('countDiffLineOps', () => {
  it('追加行と削除行を数える', () => {
    const lines: DiffLineInput[] = [
      { op: 'eq', text: 'a' },
      { op: 'del', text: 'b' },
      { op: 'add', text: 'c' },
      { op: 'add', text: 'd' },
    ];
    expect(countDiffLineOps(lines)).toEqual({ added: 2, removed: 1 });
  });

  it('空配列なら 0 件', () => {
    expect(countDiffLineOps([])).toEqual({ added: 0, removed: 0 });
  });
});

describe('buildDiffRows', () => {
  function lineRows(rows: DiffRow[]) {
    return rows.filter((row) => row.kind === 'line');
  }

  it('行番号を eq / del / add の規則で振る', () => {
    const rows = buildDiffRows([
      { op: 'eq', text: 'A' },
      { op: 'del', text: 'B' },
      { op: 'add', text: 'B2' },
      { op: 'eq', text: 'C' },
    ]);
    expect(lineRows(rows)).toEqual([
      {
        kind: 'line',
        op: 'eq',
        text: 'A',
        oldLineNumber: 1,
        newLineNumber: 1,
      },
      {
        kind: 'line',
        op: 'del',
        text: 'B',
        oldLineNumber: 2,
        newLineNumber: null,
      },
      {
        kind: 'line',
        op: 'add',
        text: 'B2',
        oldLineNumber: null,
        newLineNumber: 2,
      },
      {
        kind: 'line',
        op: 'eq',
        text: 'C',
        oldLineNumber: 3,
        newLineNumber: 3,
      },
    ]);
  });

  it('変更行が無い場合は折りたたまず全行返す', () => {
    const lines: DiffLineInput[] = Array.from({ length: 20 }, (_, i) => ({
      op: 'eq' as const,
      text: `line ${i}`,
    }));
    const rows = buildDiffRows(lines, 1);
    expect(rows).toHaveLength(20);
    expect(rows.every((row) => row.kind === 'line')).toBe(true);
  });

  it('変更箇所から離れた変更なし行を gap に折りたたむ', () => {
    const lines: DiffLineInput[] = [
      ...Array.from({ length: 10 }, (_, i) => ({
        op: 'eq' as const,
        text: `head ${i}`,
      })),
      { op: 'add', text: 'NEW' },
      ...Array.from({ length: 10 }, (_, i) => ({
        op: 'eq' as const,
        text: `tail ${i}`,
      })),
    ];
    const rows = buildDiffRows(lines, 2);

    // 先頭 8 行 / 末尾 8 行が折りたたまれ、前後2行 + 変更行のみ残る
    expect(rows[0]).toEqual({ kind: 'gap', hiddenCount: 8 });
    expect(rows[rows.length - 1]).toEqual({ kind: 'gap', hiddenCount: 8 });
    expect(lineRows(rows)).toHaveLength(5);
  });

  it('隣接する変更のコンテキストが重なる場合は gap を作らない', () => {
    const lines: DiffLineInput[] = [
      { op: 'add', text: 'x' },
      { op: 'eq', text: '1' },
      { op: 'eq', text: '2' },
      { op: 'add', text: 'y' },
    ];
    const rows = buildDiffRows(lines, 2);
    expect(rows.some((row) => row.kind === 'gap')).toBe(false);
    expect(rows).toHaveLength(4);
  });

  it('contextLines が 0 なら変更行のみ残す', () => {
    const rows = buildDiffRows(
      [
        { op: 'eq', text: 'a' },
        { op: 'del', text: 'b' },
        { op: 'eq', text: 'c' },
      ],
      0,
    );
    expect(rows).toEqual([
      { kind: 'gap', hiddenCount: 1 },
      {
        kind: 'line',
        op: 'del',
        text: 'b',
        oldLineNumber: 2,
        newLineNumber: null,
      },
      { kind: 'gap', hiddenCount: 1 },
    ]);
  });

  it('空配列は空配列を返す', () => {
    expect(buildDiffRows([])).toEqual([]);
  });
});

describe('toLocalDateKey', () => {
  it('ローカルタイムゾーンの YYYY-MM-DD を返す', () => {
    // jest は TZ=Asia/Tokyo で実行される
    expect(toLocalDateKey(new Date('2026-08-04T12:00:00+09:00'))).toBe(
      '2026-08-04',
    );
  });

  it('1桁の月日をゼロ埋めする', () => {
    expect(toLocalDateKey(new Date('2026-01-02T10:00:00+09:00'))).toBe(
      '2026-01-02',
    );
  });
});

describe('groupByDay', () => {
  interface Item {
    id: string;
    createdAt: Date;
  }
  const getDate = (item: Item) => item.createdAt;

  it('連続する同日の要素をまとめる', () => {
    const items: Item[] = [
      { id: 'c3', createdAt: new Date('2026-08-04T18:00:00+09:00') },
      { id: 'c2', createdAt: new Date('2026-08-04T09:00:00+09:00') },
      { id: 'c1', createdAt: new Date('2026-08-03T23:00:00+09:00') },
    ];
    const groups = groupByDay(items, getDate);
    expect(groups).toHaveLength(2);
    expect(groups[0].key).toBe('2026-08-04');
    expect(groups[0].items.map((i) => i.id)).toEqual(['c3', 'c2']);
    expect(groups[1].key).toBe('2026-08-03');
    expect(groups[1].items.map((i) => i.id)).toEqual(['c1']);
  });

  it('並べ替えず入力順を尊重する（非連続の同日は別グループ）', () => {
    const items: Item[] = [
      { id: 'a', createdAt: new Date('2026-08-04T10:00:00+09:00') },
      { id: 'b', createdAt: new Date('2026-08-03T10:00:00+09:00') },
      { id: 'c', createdAt: new Date('2026-08-04T11:00:00+09:00') },
    ];
    const groups = groupByDay(items, getDate);
    expect(groups.map((g) => g.key)).toEqual([
      '2026-08-04',
      '2026-08-03',
      '2026-08-04',
    ]);
  });

  it('空配列は空配列を返す', () => {
    expect(groupByDay([], getDate)).toEqual([]);
  });
});
