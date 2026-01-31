import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { WritingEditor } from "./writing-editor";

const meta = {
  title: "Features/WritingEditor",
  component: WritingEditor,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ height: "600px" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof WritingEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: "第1章 出会い",
    content: "夜明け前の静寂が街を包んでいた。\n\n主人公は窓辺に立ち、遠くに見える山々を眺めていた。",
    wordCount: 35,
  },
};

export const Empty: Story = {
  args: {
    name: "新しい執筆",
    content: "",
    wordCount: 0,
  },
};

export const ReadOnly: Story = {
  args: {
    name: "読み取り専用",
    content: "この文章は編集できません。",
    wordCount: 13,
    readOnly: true,
  },
};

export const Interactive: StoryObj = {
  render: () => {
    const [name, setName] = useState("第1章 出会い");
    const [content, setContent] = useState("ここに文章を入力してください...");

    return (
      <WritingEditor
        name={name}
        content={content}
        wordCount={content.length}
        onNameChange={setName}
        onContentChange={setContent}
      />
    );
  },
};

export const AutoIndent: StoryObj = {
  render: () => {
    const [content, setContent] = useState(
      "\u3000夜明け前の静寂が街を包んでいた。\n「おはよう」\n\u3000主人公は窓辺に立ち、遠くに見える山々を眺めていた。"
    );

    return (
      <WritingEditor
        name="自動一字下げ（会話文スキップ）"
        content={content}
        wordCount={content.length}
        onContentChange={setContent}
        autoIndent
      />
    );
  },
};

export const AutoIndentAll: StoryObj = {
  render: () => {
    const [content, setContent] = useState(
      "\u3000夜明け前の静寂が街を包んでいた。\n\u3000「おはよう」\n\u3000主人公は窓辺に立ち、遠くに見える山々を眺めていた。"
    );

    return (
      <WritingEditor
        name="全行一字下げモード（会話文もインデント）"
        content={content}
        wordCount={content.length}
        onContentChange={setContent}
        autoIndent
        noIndentMarkers={[]}
      />
    );
  },
};

export const AutoIndentDisabled: StoryObj = {
  render: () => {
    const [content, setContent] = useState("自動一字下げが無効の状態です。");

    return (
      <WritingEditor
        name="一字下げ無効"
        content={content}
        wordCount={content.length}
        onContentChange={setContent}
        autoIndent={false}
      />
    );
  },
};
