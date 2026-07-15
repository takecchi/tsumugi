import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import { AIUsage, type AIUsageSessionItem } from './ai-usage';

const meta = {
  title: 'Features/AIUsage',
  component: AIUsage,
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
} satisfies Meta<typeof AIUsage>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockSessions: AIUsageSessionItem[] = [
  {
    sessionId: '1',
    title: '第1章のプロット相談',
    promptTokens: 12400,
    completionTokens: 3200,
    totalTokens: 15600,
  },
  {
    sessionId: '2',
    title: 'キャラクター設定のブラッシュアップ',
    promptTokens: 8100,
    completionTokens: 2450,
    totalTokens: 10550,
  },
  {
    sessionId: '3',
    title: '整合性チェックの修正',
    promptTokens: 3300,
    completionTokens: 900,
    totalTokens: 4200,
  },
];

const mockTotal = {
  promptTokens: 23800,
  completionTokens: 6550,
  totalTokens: 30350,
};

export const Default: Story = {
  args: {
    sessions: mockSessions,
    total: mockTotal,
  },
};

export const Empty: Story = {
  args: {
    sessions: [],
    total: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  },
};

export const Loading: Story = {
  args: {
    sessions: mockSessions,
    total: mockTotal,
    isLoading: true,
  },
};

export const Interactive: StoryObj = {
  render: () => {
    const [isLoading, setIsLoading] = React.useState(false);

    const handleRefresh = () => {
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 800);
    };

    return (
      <AIUsage
        sessions={mockSessions}
        total={mockTotal}
        isLoading={isLoading}
        onRefresh={handleRefresh}
      />
    );
  },
};
