import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { EditorTabs, type EditorTab } from './editor-tabs';

const meta = {
  title: 'Features/EditorTabs',
  component: EditorTabs,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof EditorTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleTabs: EditorTab[] = [
  { id: '0', name: '異世界転生物語', type: 'project' },
  { id: '1', name: '1-1 出会い', type: 'writing', active: true },
  { id: '2', name: '起承転結', type: 'plot' },
  { id: '3', name: '主人公', type: 'character' },
  { id: '4', name: '世界観設定', type: 'memo' },
];

function EditorContent({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export const Default: Story = {
  args: {
    tabs: sampleTabs,
    onSelectTab: () => {
      console.log('onSelectTab');
    },
    onCloseTab: () => {
      console.log('onCloseTab');
    },
    onCloseOtherTabs: () => {
      console.log('onCloseOtherTabs');
    },
    onCloseAllTabs: () => {
      console.log('onCloseAllTabs');
    },
    children: <EditorContent label="1-1 出会い の内容" />,
  },
  decorators: [
    (Story) => (
      <div className="h-64">
        <Story />
      </div>
    ),
  ],
};

export const SingleTab: Story = {
  args: {
    tabs: [{ ...sampleTabs[0], active: true }],
    onSelectTab: () => {
      console.log('onSelectTab');
    },
    onCloseTab: () => {
      console.log('onCloseTab');
    },
    onCloseOtherTabs: () => {
      console.log('onCloseOtherTabs');
    },
    onCloseAllTabs: () => {
      console.log('onCloseAllTabs');
    },
    children: <EditorContent label="タブが1つだけ" />,
  },
  decorators: [
    (Story) => (
      <div className="h-64">
        <Story />
      </div>
    ),
  ],
};

export const NoTabs: Story = {
  args: {
    tabs: [],
    onSelectTab: () => {
      console.log('onSelectTab');
    },
    onCloseTab: () => {
      console.log('onCloseTab');
    },
    onCloseOtherTabs: () => {
      console.log('onCloseOtherTabs');
    },
    onCloseAllTabs: () => {
      console.log('onCloseAllTabs');
    },
    children: <EditorContent label="ファイルを選択してください" />,
  },
  decorators: [
    (Story) => (
      <div className="h-64">
        <Story />
      </div>
    ),
  ],
};

export const Interactive: StoryObj = {
  render: () => {
    const [tabs, setTabs] = useState<EditorTab[]>(sampleTabs);

    const setActive = (id: string) => {
      setTabs((prev) => prev.map((t) => ({ ...t, active: t.id === id })));
    };

    const handleClose = (id: string) => {
      setTabs((prev) => {
        const closing = prev.find((t) => t.id === id);
        const next = prev.filter((t) => t.id !== id);
        if (closing?.active && next.length > 0) {
          const closedIndex = prev.findIndex((t) => t.id === id);
          const newActiveIndex = Math.min(closedIndex, next.length - 1);
          next[newActiveIndex] = { ...next[newActiveIndex], active: true };
        }
        return next;
      });
    };

    const handleCloseOthers = (id: string) => {
      setTabs((prev) => prev.filter((t) => t.id === id).map((t) => ({ ...t, active: true })));
    };

    const handleCloseAll = () => {
      setTabs([]);
    };

    const activeTab = tabs.find((t) => t.active);

    return (
      <div className="h-64">
        <EditorTabs
          tabs={tabs}
          onSelectTab={setActive}
          onCloseTab={handleClose}
          onCloseOtherTabs={handleCloseOthers}
          onCloseAllTabs={handleCloseAll}
        >
          <EditorContent
            label={
              activeTab
                ? `${activeTab.name} の内容`
                : 'ファイルを選択してください'
            }
          />
        </EditorTabs>
      </div>
    );
  },
};

export const ManyTabs: StoryObj = {
  render: () => {
    const manyTabs: EditorTab[] = Array.from({ length: 15 }, (_, i) => ({
      id: String(i),
      name: `ファイル ${i + 1}`,
      type: (['writing', 'plot', 'character', 'memo', 'project'] as const)[i % 5],
      ...(i === 0 ? { active: true } : {}),
    }));
    const [tabs, setTabs] = useState(manyTabs);

    const setActive = (id: string) => {
      setTabs((prev) => prev.map((t) => ({ ...t, active: t.id === id })));
    };

    const handleClose = (id: string) => {
      setTabs((prev) => {
        const closing = prev.find((t) => t.id === id);
        const next = prev.filter((t) => t.id !== id);
        if (closing?.active && next.length > 0) {
          const closedIndex = prev.findIndex((t) => t.id === id);
          const newActiveIndex = Math.min(closedIndex, next.length - 1);
          next[newActiveIndex] = { ...next[newActiveIndex], active: true };
        }
        return next;
      });
    };

    const handleCloseOthers = (id: string) => {
      setTabs((prev) => prev.filter((t) => t.id === id).map((t) => ({ ...t, active: true })));
    };

    const handleCloseAll = () => {
      setTabs([]);
    };

    const activeTab = tabs.find((t) => t.active);

    return (
      <div className="h-64 w-[600px]">
        <EditorTabs
          tabs={tabs}
          onSelectTab={setActive}
          onCloseTab={handleClose}
          onCloseOtherTabs={handleCloseOthers}
          onCloseAllTabs={handleCloseAll}
        >
          <EditorContent
            label={
              activeTab
                ? `${activeTab.name} の内容`
                : 'ファイルを選択してください'
            }
          />
        </EditorTabs>
      </div>
    );
  },
};
