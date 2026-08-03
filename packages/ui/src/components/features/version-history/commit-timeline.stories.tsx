import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import { CommitTimeline, type CommitTimelineItem } from './commit-timeline';
import { CommitDiffView } from './commit-diff-view';
import { mockCommits, mockDiffEntries } from './mock-data';

const meta = {
  title: 'Features/CommitTimeline',
  component: CommitTimeline,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ height: '600px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CommitTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    commits: mockCommits,
    hasUncommittedChanges: true,
    selectedCommitId: 'commit_4',
    hasMore: true,
    detail: (
      <CommitDiffView
        entries={mockDiffEntries}
        title="第二章の視点を三人称に統一した"
        subtitle="commit_3 との差分"
      />
    ),
  },
};

export const Empty: Story = {
  args: {
    commits: [],
  },
};

export const Loading: Story = {
  args: {
    commits: [],
    isLoading: true,
  },
};

export const NoChangesNotice: Story = {
  args: {
    commits: mockCommits,
    notice: '変更はありません。',
  },
};

export const AfterRestore: Story = {
  args: {
    commits: mockCommits,
    undoBackupCommitId: 'commit_2',
  },
};

export const Interactive: StoryObj = {
  render: () => {
    const [commits, setCommits] =
      React.useState<CommitTimelineItem[]>(mockCommits);
    const [selectedCommitId, setSelectedCommitId] = React.useState<
      string | null
    >('commit_4');
    const [isUncommittedSelected, setIsUncommittedSelected] =
      React.useState(false);
    const [hasUncommittedChanges, setHasUncommittedChanges] =
      React.useState(true);
    const [notice, setNotice] = React.useState<string | null>(null);
    const [undoBackupCommitId, setUndoBackupCommitId] = React.useState<
      string | null
    >(null);

    const selected = commits.find((commit) => commit.id === selectedCommitId);

    const handleSave = (message: string) => {
      if (!hasUncommittedChanges) {
        // 409 が正常系として返るケースを模した穏当な通知
        setNotice('変更はありません。');
        return;
      }
      const created: CommitTimelineItem = {
        id: `commit_${commits.length + 6}`,
        message,
        commitType: 'manual',
        addedCount: 0,
        modifiedCount: 1,
        removedCount: 0,
        createdAt: new Date('2026-08-04T19:30:00'),
      };
      setCommits((prev) => [created, ...prev]);
      setHasUncommittedChanges(false);
      setIsUncommittedSelected(false);
      setSelectedCommitId(created.id);
      setNotice(null);
    };

    const handleRestore = (commitId: string) => {
      const target = commits.find((commit) => commit.id === commitId);
      const backup: CommitTimelineItem = {
        id: `commit_backup_${commitId}`,
        message: '復元前の自動バックアップ',
        commitType: 'backup',
        addedCount: 0,
        modifiedCount: 1,
        removedCount: 0,
        createdAt: new Date('2026-08-04T19:40:00'),
      };
      const restore: CommitTimelineItem = {
        id: `commit_restore_${commitId}`,
        message: `「${target?.message ?? ''}」の時点に復元`,
        commitType: 'restore',
        addedCount: 0,
        modifiedCount: 2,
        removedCount: 1,
        createdAt: new Date('2026-08-04T19:41:00'),
      };
      setCommits((prev) => [restore, backup, ...prev]);
      setUndoBackupCommitId(backup.id);
      setHasUncommittedChanges(false);
      setSelectedCommitId(restore.id);
    };

    return (
      <CommitTimeline
        commits={commits}
        hasUncommittedChanges={hasUncommittedChanges}
        selectedCommitId={selectedCommitId}
        isUncommittedSelected={isUncommittedSelected}
        notice={notice}
        onDismissNotice={() => setNotice(null)}
        undoBackupCommitId={undoBackupCommitId}
        onUndoRestore={(backupCommitId) => handleRestore(backupCommitId)}
        onDismissUndo={() => setUndoBackupCommitId(null)}
        onSave={handleSave}
        onSelectCommit={(commitId) => {
          setSelectedCommitId(commitId);
          setIsUncommittedSelected(false);
        }}
        onSelectUncommitted={() => {
          setIsUncommittedSelected(true);
          setSelectedCommitId(null);
        }}
        onRestore={handleRestore}
        detail={
          isUncommittedSelected ? (
            <CommitDiffView
              entries={mockDiffEntries.slice(0, 1)}
              title="未コミットの変更"
              subtitle="最新コミットとの差分"
            />
          ) : selected ? (
            <CommitDiffView
              entries={mockDiffEntries}
              title={selected.message}
              subtitle="親コミットとの差分"
            />
          ) : (
            <CommitDiffView entries={[]} />
          )
        }
      />
    );
  },
};
