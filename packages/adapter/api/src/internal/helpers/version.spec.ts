import {
  CommitDiffFromJSON,
  CommitEntryFromJSON,
  CommitFromJSON,
  CommitListFromJSON,
  NodeRevisionListFromJSON,
  RestoreResultFromJSON,
} from '@tsumugi-chan/client';
import {
  toCommit,
  toCommitDiff,
  toCommitEntry,
  toCommitList,
  toNodeRevisionList,
  toRestoreResult,
} from '@/internal/helpers/version';

const commitJson = {
  id: 'commit_1',
  created_at: '2026-08-04T12:34:56Z',
  project_id: 'project_1',
  parent_id: null,
  message: '第一章を書き上げた',
  commit_type: 'manual',
  added_count: 2,
  modified_count: 1,
  removed_count: 0,
};

describe('toCommit', () => {
  it('コミットを変換する（createdAt は Date）', () => {
    const commit = toCommit(CommitFromJSON(commitJson));
    expect(commit).toEqual({
      id: 'commit_1',
      projectId: 'project_1',
      parentId: null,
      message: '第一章を書き上げた',
      commitType: 'manual',
      addedCount: 2,
      modifiedCount: 1,
      removedCount: 0,
      createdAt: new Date('2026-08-04T12:34:56Z'),
    });
    expect(commit.createdAt).toBeInstanceOf(Date);
  });

  it('parent_id が入っていれば保持する', () => {
    const commit = toCommit(
      CommitFromJSON({ ...commitJson, parent_id: 'commit_0' }),
    );
    expect(commit.parentId).toBe('commit_0');
  });
});

describe('toCommitList', () => {
  it('next_cursor が null なら終端として変換する', () => {
    const list = toCommitList(
      CommitListFromJSON({ commits: [commitJson], next_cursor: null }),
    );
    expect(list.commits).toHaveLength(1);
    expect(list.commits[0].id).toBe('commit_1');
    expect(list.nextCursor).toBeNull();
  });

  it('next_cursor があれば保持する', () => {
    const list = toCommitList(
      CommitListFromJSON({ commits: [], next_cursor: 'cursor_2' }),
    );
    expect(list.commits).toEqual([]);
    expect(list.nextCursor).toBe('cursor_2');
  });
});

describe('toCommitDiff', () => {
  it('modified エントリの field_changes / text_diffs を変換する', () => {
    const diff = toCommitDiff(
      CommitDiffFromJSON({
        base_commit_id: 'commit_0',
        commit_id: 'commit_1',
        entries: [
          {
            entry_type: 'node',
            target_id: 'node_1',
            change_type: 'modified',
            name: '第一章',
            node_type: 'writing',
            field_changes: [
              { field: 'name', old_value: '序章', new_value: '第一章' },
              { field: 'tags', old_value: null, new_value: '伏線' },
            ],
            text_diffs: [
              {
                field: 'content',
                lines: [
                  { op: 'eq', text: '雨が降っていた。' },
                  { op: 'del', text: '彼は歩いた。' },
                  { op: 'add', text: '彼は走った。' },
                ],
              },
            ],
          },
        ],
      }),
    );

    expect(diff.baseCommitId).toBe('commit_0');
    expect(diff.commitId).toBe('commit_1');
    expect(diff.entries[0]).toEqual({
      entryType: 'node',
      targetId: 'node_1',
      changeType: 'modified',
      name: '第一章',
      nodeType: 'writing',
      fieldChanges: [
        { field: 'name', oldValue: '序章', newValue: '第一章' },
        { field: 'tags', oldValue: null, newValue: '伏線' },
      ],
      textDiffs: [
        {
          field: 'content',
          lines: [
            { op: 'eq', text: '雨が降っていた。' },
            { op: 'del', text: '彼は歩いた。' },
            { op: 'add', text: '彼は走った。' },
          ],
        },
      ],
    });
  });

  it('added / removed エントリは field_changes / text_diffs が空配列になる', () => {
    const diff = toCommitDiff(
      CommitDiffFromJSON({
        base_commit_id: null,
        commit_id: 'commit_1',
        entries: [
          {
            entry_type: 'node',
            target_id: 'node_new',
            change_type: 'added',
            name: '新しいメモ',
            node_type: 'memo',
            field_changes: [],
            text_diffs: [],
          },
          {
            entry_type: 'glossary_term',
            target_id: 'term_1',
            change_type: 'removed',
            name: '古い用語',
            node_type: null,
            field_changes: [],
            text_diffs: [],
          },
        ],
      }),
    );

    expect(diff.baseCommitId).toBeNull();
    expect(diff.entries[0].fieldChanges).toEqual([]);
    expect(diff.entries[0].textDiffs).toEqual([]);
    expect(diff.entries[1].entryType).toBe('glossary_term');
    expect(diff.entries[1].nodeType).toBeNull();
  });

  it('未コミットの作業差分は commit_id が null になる', () => {
    const diff = toCommitDiff(
      CommitDiffFromJSON({
        base_commit_id: 'commit_1',
        commit_id: null,
        entries: [],
      }),
    );
    expect(diff.commitId).toBeNull();
    expect(diff.entries).toEqual([]);
  });
});

describe('toCommitEntry', () => {
  it('meta_fields / content_fields を変換する', () => {
    const entry = toCommitEntry(
      CommitEntryFromJSON({
        entry_type: 'node',
        target_id: 'node_1',
        name: '第一章',
        node_type: 'writing',
        meta_fields: [{ field: 'canon_status', value: 'confirmed' }],
        content_fields: [
          { field: 'content', value: '雨が降っていた。' },
          { field: 'notes', value: null },
        ],
      }),
    );
    expect(entry).toEqual({
      entryType: 'node',
      targetId: 'node_1',
      name: '第一章',
      nodeType: 'writing',
      metaFields: [{ field: 'canon_status', value: 'confirmed' }],
      contentFields: [
        { field: 'content', value: '雨が降っていた。' },
        { field: 'notes', value: null },
      ],
    });
  });
});

describe('toNodeRevisionList', () => {
  it('ノード変更履歴を変換する', () => {
    const list = toNodeRevisionList(
      NodeRevisionListFromJSON({
        revisions: [
          {
            commit_id: 'commit_2',
            message: '自動保存',
            commit_type: 'auto',
            created_at: '2026-08-04T09:00:00Z',
            change_type: 'modified',
          },
          {
            commit_id: 'commit_1',
            message: '初稿',
            commit_type: 'manual',
            created_at: '2026-08-03T09:00:00Z',
            change_type: 'added',
          },
        ],
        next_cursor: null,
      }),
    );

    expect(list.nextCursor).toBeNull();
    expect(list.revisions).toEqual([
      {
        commitId: 'commit_2',
        message: '自動保存',
        commitType: 'auto',
        createdAt: new Date('2026-08-04T09:00:00Z'),
        changeType: 'modified',
      },
      {
        commitId: 'commit_1',
        message: '初稿',
        commitType: 'manual',
        createdAt: new Date('2026-08-03T09:00:00Z'),
        changeType: 'added',
      },
    ]);
  });
});

describe('toRestoreResult', () => {
  it('バックアップコミットIDを保持する', () => {
    expect(
      toRestoreResult(
        RestoreResultFromJSON({
          backup_commit_id: 'commit_backup',
          restore_commit_id: 'commit_restore',
        }),
      ),
    ).toEqual({
      backupCommitId: 'commit_backup',
      restoreCommitId: 'commit_restore',
    });
  });

  it('未コミット変更が無い場合は backup_commit_id が null', () => {
    expect(
      toRestoreResult(
        RestoreResultFromJSON({
          backup_commit_id: null,
          restore_commit_id: 'commit_restore',
        }),
      ).backupCommitId,
    ).toBeNull();
  });
});
