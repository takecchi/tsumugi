import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { WritingEditor } from './writing-editor';
import {
  DEFAULT_FORMAT_OPTIONS,
  type FormatOptions,
} from '@/lib/writing-format';

const meta = {
  title: 'Features/WritingEditor',
  component: WritingEditor,
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
} satisfies Meta<typeof WritingEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: '第1章 出会い',
    content:
      '夜明け前の静寂が街を包んでいた。\n\n主人公は窓辺に立ち、遠くに見える山々を眺めていた。',
  },
};

export const Empty: Story = {
  args: {
    name: '新しい執筆',
    content: '',
  },
};

export const ReadOnly: Story = {
  args: {
    name: '読み取り専用',
    content: 'この文章は編集できません。',
    readOnly: true,
  },
};

export const Interactive: StoryObj = {
  render: () => {
    const [name, setName] = useState('第1章 出会い');
    const [content, setContent] = useState('ここに文章を入力してください...');

    return (
      <WritingEditor
        name={name}
        content={content}
        onNameChange={setName}
        onContentChange={setContent}
      />
    );
  },
};

export const WithFormatting: StoryObj = {
  render: () => {
    const [content, setContent] = useState(
      '夜明け前の静寂が街を包んでいた。\n「おはよう」\n主人公は窓辺に立ち、遠くに見える山々を眺めていた。\n『心の中でつぶやいた』',
    );
    const [options, setOptions] = useState<FormatOptions>(
      DEFAULT_FORMAT_OPTIONS,
    );

    return (
      <WritingEditor
        name="フォーマット機能デモ"
        content={content}
        onContentChange={setContent}
        formatOptions={options}
        onFormatOptionsChange={setOptions}
      />
    );
  },
};
