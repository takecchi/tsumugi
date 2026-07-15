import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import { AIMemoryPanel, type AIMemoryItem } from './ai-memory';

const meta = {
  title: 'Features/AIMemoryPanel',
  component: AIMemoryPanel,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ height: '600px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AIMemoryPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockMemories: AIMemoryItem[] = [
  {
    id: '1',
    content: '主人公・紬は照れると早口になる癖がある。',
    createdAt: new Date('2026-06-01T10:00:00'),
  },
  {
    id: '2',
    content: '物語の舞台は近未来の京都。刻印術は国家資格制。',
    createdAt: new Date('2026-06-03T14:30:00'),
  },
  {
    id: '3',
    content: 'ユーザーは常体（だ・である調）での提案を好む。',
    createdAt: new Date('2026-06-10T09:15:00'),
  },
];

export const Default: Story = {
  args: {
    memories: mockMemories,
  },
};

export const Empty: Story = {
  args: {
    memories: [],
  },
};

export const Interactive: StoryObj = {
  render: () => {
    const [memories, setMemories] =
      React.useState<AIMemoryItem[]>(mockMemories);

    const handleDelete = (id: string) => {
      setMemories((prev) => prev.filter((m) => m.id !== id));
    };

    return <AIMemoryPanel memories={memories} onDelete={handleDelete} />;
  },
};
