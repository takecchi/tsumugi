import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import {
  CommitDiffView,
  type CommitEntryContentItem,
} from './commit-diff-view';
import { mockDiffEntries } from './mock-data';

const meta = {
  title: 'Features/CommitDiffView',
  component: CommitDiffView,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ height: '600px', maxWidth: '720px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CommitDiffView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    entries: mockDiffEntries,
    title: '第二章の視点を三人称に統一した',
    subtitle: 'commit_3 との差分',
  },
};

export const Empty: Story = {
  args: {
    entries: [],
    title: '未コミットの変更',
  },
};

export const Loading: Story = {
  args: {
    entries: [],
    isLoading: true,
  },
};

const mockEntryContents: Record<string, CommitEntryContentItem> = {
  node_memo_9: {
    metaFields: [{ field: 'canon_status', value: 'draft' }],
    contentFields: [
      {
        field: 'content',
        value:
          '図書室の鍵は司書室の引き出しにある。\n第四章で彼女が持ち出す前提で書く。',
      },
      { field: 'tags', value: '伏線, 小道具' },
    ],
  },
  term_3: {
    metaFields: [],
    contentFields: [
      { field: 'term', value: '旧校舎' },
      { field: 'reading', value: 'きゅうこうしゃ' },
      { field: 'notes', value: '第三章以降は使わない設定に変更したため削除。' },
    ],
  },
};

export const Interactive: StoryObj = {
  render: () => {
    const [entryContents, setEntryContents] = React.useState<
      Record<string, CommitEntryContentItem | undefined>
    >({});
    const [loadingEntryIds, setLoadingEntryIds] = React.useState<string[]>([]);

    // added / removed の中身は差分APIに含まれないため、別途取得する動きを再現する
    const handleShowEntryContent = (targetId: string) => {
      setLoadingEntryIds((prev) => [...prev, targetId]);
      setTimeout(() => {
        setEntryContents((prev) => ({
          ...prev,
          [targetId]: mockEntryContents[targetId],
        }));
        setLoadingEntryIds((prev) => prev.filter((id) => id !== targetId));
      }, 400);
    };

    return (
      <CommitDiffView
        entries={mockDiffEntries}
        title="第二章の視点を三人称に統一した"
        subtitle="親コミットとの差分"
        entryContents={entryContents}
        loadingEntryIds={loadingEntryIds}
        onShowEntryContent={handleShowEntryContent}
      />
    );
  },
};
