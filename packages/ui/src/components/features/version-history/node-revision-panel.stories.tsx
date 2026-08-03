import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import { NodeRevisionPanel } from './node-revision-panel';
import { CommitDiffView } from './commit-diff-view';
import { mockDiffEntries, mockNodeRevisions } from './mock-data';

const meta = {
  title: 'Features/NodeRevisionPanel',
  component: NodeRevisionPanel,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ height: '600px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NodeRevisionPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    revisions: mockNodeRevisions,
    selectedCommitId: 'commit_4',
    detail: (
      <CommitDiffView
        entries={mockDiffEntries.slice(0, 1)}
        title="第二章の視点を三人称に統一した"
        subtitle="このノードの差分"
      />
    ),
  },
};

export const Empty: Story = {
  args: {
    revisions: [],
  },
};

export const Loading: Story = {
  args: {
    revisions: [],
    isLoading: true,
  },
};

export const LoadFailed: Story = {
  args: {
    revisions: [],
    hasError: true,
  },
};

export const Interactive: StoryObj = {
  render: () => {
    const [selectedCommitId, setSelectedCommitId] = React.useState<
      string | null
    >(null);
    const [notice, setNotice] = React.useState<string | null>(null);

    const selected = mockNodeRevisions.find(
      (revision) => revision.commitId === selectedCommitId,
    );

    return (
      <NodeRevisionPanel
        revisions={mockNodeRevisions}
        selectedCommitId={selectedCommitId}
        notice={notice}
        onDismissNotice={() => setNotice(null)}
        onSelect={setSelectedCommitId}
        onRestore={(commitId) => {
          const target = mockNodeRevisions.find(
            (revision) => revision.commitId === commitId,
          );
          setNotice(`「${target?.message ?? ''}」の時点の本文に戻しました。`);
        }}
        detail={
          selected ? (
            <CommitDiffView
              entries={mockDiffEntries.slice(0, 1)}
              title={selected.message}
              subtitle="このノードの差分"
            />
          ) : (
            <CommitDiffView
              entries={[]}
              emptyMessage="履歴を選ぶと、その時点の差分が表示されます。"
            />
          )
        }
      />
    );
  },
};
