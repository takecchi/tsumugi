import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import {
  InstructionsManager,
  type InstructionInput,
  type InstructionItem,
} from './instructions-manager';

const meta = {
  title: 'Features/InstructionsManager',
  component: InstructionsManager,
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
} satisfies Meta<typeof InstructionsManager>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockInstructions: InstructionItem[] = [
  {
    id: '1',
    title: '文体の統一',
    content: '常体（だ・である調）で統一する。一文は短く、テンポよく。',
    enabled: true,
  },
  {
    id: '2',
    title: '視点の固定',
    content: '三人称一視点。主人公・紬の視点から逸脱しないこと。',
    enabled: true,
  },
  {
    id: '3',
    title: '過度な説明の抑制',
    content:
      '設定の説明的な地の文を避け、会話や行動で描写する（show, don’t tell）。',
    enabled: false,
  },
];

export const Default: Story = {
  args: {
    instructions: mockInstructions,
  },
};

export const Empty: Story = {
  args: {
    instructions: [],
  },
};

let idCounter = mockInstructions.length;
function nextId(): string {
  idCounter += 1;
  return `generated-${idCounter}`;
}

export const Interactive: StoryObj = {
  render: () => {
    const [instructions, setInstructions] =
      React.useState<InstructionItem[]>(mockInstructions);

    const handleCreate = (input: InstructionInput) => {
      const item: InstructionItem = {
        id: nextId(),
        title: input.title,
        content: input.content,
        enabled: input.enabled ?? true,
      };
      setInstructions((prev) => [...prev, item]);
    };

    const handleUpdate = (id: string, input: InstructionInput) => {
      setInstructions((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                id,
                title: input.title,
                content: input.content,
                enabled: input.enabled ?? item.enabled,
              }
            : item,
        ),
      );
    };

    const handleToggle = (id: string, enabled: boolean) => {
      setInstructions((prev) =>
        prev.map((item) => (item.id === id ? { ...item, enabled } : item)),
      );
    };

    const handleDelete = (id: string) => {
      setInstructions((prev) => prev.filter((item) => item.id !== id));
    };

    return (
      <InstructionsManager
        instructions={instructions}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onToggle={handleToggle}
        onDelete={handleDelete}
      />
    );
  },
};
