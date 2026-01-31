import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { CharacterEditor, type CharacterEditorData } from "./character-editor";

const meta = {
  title: "Features/CharacterEditor",
  component: CharacterEditor,
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
} satisfies Meta<typeof CharacterEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockData: CharacterEditorData = {
  name: "田中太郎",
  aliases: "タロー、勇者",
  role: "主人公",
  gender: "男性",
  age: "18歳",
  appearance: "黒髪短髪。身長175cm。鍛えられた体つきだが、目元は柔和。",
  personality: "正義感が強く、困っている人を放っておけない。やや無鉄砲なところがある。",
  background: "小さな村で育った農家の息子。幼い頃に両親を亡くし、祖父に育てられた。",
  motivation: "祖父の病を治す薬草を求めて旅に出る。",
  relationships: "幼馴染のヒロインとは兄妹のような関係。師匠の老騎士を尊敬している。",
  notes: "第3章で覚醒イベントあり。伏線を第1章から張っておく。",
};

export const Default: Story = {
  args: {
    data: mockData,
  },
};

export const Empty: Story = {
  args: {
    data: { name: "新しいキャラクター" },
  },
};

export const Interactive: StoryObj = {
  render: () => {
    const [data, setData] = useState<CharacterEditorData>(mockData);

    const handleChange = (field: keyof CharacterEditorData, value: string) => {
      setData((prev) => ({ ...prev, [field]: value }));
    };

    return <CharacterEditor data={data} onChange={handleChange} />;
  },
};
