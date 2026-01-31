import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { MemoEditor } from "./memo-editor";

const meta = {
  title: "Features/MemoEditor",
  component: MemoEditor,
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
} satisfies Meta<typeof MemoEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: "世界観設定",
    content: "この世界では魔法が日常的に使われている。\n\n魔力は生まれつき持っているもので、訓練によって強化できる。",
    tags: ["世界観", "魔法", "設定"],
  },
};

export const Empty: Story = {
  args: {
    name: "新しいメモ",
    content: "",
    tags: [],
  },
};

export const Interactive: StoryObj = {
  render: () => {
    const [name, setName] = useState("アイデアメモ");
    const [content, setContent] = useState("ここにメモを入力...");
    const [tags, setTags] = useState(["アイデア", "要検討"]);

    return (
      <MemoEditor
        name={name}
        content={content}
        tags={tags}
        onNameChange={setName}
        onContentChange={setContent}
        onTagsChange={setTags}
      />
    );
  },
};
