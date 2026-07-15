import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import {
  GlossaryManager,
  type GlossaryTermInput,
  type GlossaryTermItem,
} from './glossary-manager';

const meta = {
  title: 'Features/GlossaryManager',
  component: GlossaryManager,
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
} satisfies Meta<typeof GlossaryManager>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockTerms: GlossaryTermItem[] = [
  {
    id: '1',
    term: '紬',
    reading: 'つむぎ',
    aliases: ['つむぎ', 'ツムギ'],
    notes: '主人公の名前。ひらがな・カタカナ表記は誤り。',
  },
  {
    id: '2',
    term: '天ノ川高校',
    reading: 'あまのがわこうこう',
    aliases: ['天の川高校', 'アマノガワ高校'],
    notes: '物語の舞台となる高校。「ノ」は必ずカタカナで表記する。',
  },
  {
    id: '3',
    term: '御子柴 蓮',
    reading: 'みこしば れん',
    aliases: ['御子柴蓮', 'みこしばれん'],
    notes: 'ヒロインの幼馴染。姓と名の間は全角スペースで区切る。',
  },
  {
    id: '4',
    term: '刻印術',
    reading: 'こくいんじゅつ',
    aliases: [],
    notes: null,
  },
];

export const Default: Story = {
  args: {
    terms: mockTerms,
  },
};

export const Empty: Story = {
  args: {
    terms: [],
  },
};

let idCounter = mockTerms.length;
function nextId(): string {
  idCounter += 1;
  return `generated-${idCounter}`;
}

export const Interactive: StoryObj = {
  render: () => {
    const [terms, setTerms] = React.useState<GlossaryTermItem[]>(mockTerms);

    const handleCreate = (input: GlossaryTermInput) => {
      const item: GlossaryTermItem = {
        id: nextId(),
        term: input.term,
        reading: input.reading ?? null,
        aliases: input.aliases ?? [],
        notes: input.notes ?? null,
      };
      setTerms((prev) => [...prev, item]);
    };

    const handleUpdate = (id: string, input: GlossaryTermInput) => {
      setTerms((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                id,
                term: input.term,
                reading: input.reading ?? null,
                aliases: input.aliases ?? [],
                notes: input.notes ?? null,
              }
            : item,
        ),
      );
    };

    const handleDelete = (id: string) => {
      setTerms((prev) => prev.filter((item) => item.id !== id));
    };

    return (
      <GlossaryManager
        terms={terms}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    );
  },
};
