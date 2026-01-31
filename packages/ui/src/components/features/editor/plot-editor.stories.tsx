import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { PlotEditor, type PlotEditorData } from './plot-editor';

const meta = {
  title: "Features/PlotEditor",
  component: PlotEditor,
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
} satisfies Meta<typeof PlotEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockData: PlotEditorData = {
  name: "第1章 プロット",
  synopsis: "主人公が旅立ちを決意するまでの物語。幼馴染との別れと新たな出会いを描く。",
  setting: "中世ヨーロッパ風の架空世界。魔法が日常に溶け込んだ社会。",
  theme: "成長と自立",
  structure: "起：平穏な日常\n承：事件の発生\n転：決意\n結：旅立ち",
  conflict: "主人公の内面的な葛藤（安定を捨てる恐怖 vs 冒険への憧れ）",
  resolution: "幼馴染の後押しにより旅立ちを決意する",
  notes: "第2章への伏線を忘れずに入れる",
};

export const Default: Story = {
  args: {
    data: mockData,
  },
};

export const Empty: Story = {
  args: {
    data: { name: "新しいプロット" },
  },
};

export const Interactive: StoryObj = {
  render: () => {
    const [data, setData] = useState<PlotEditorData>(mockData);

    const handleChange = (field: keyof PlotEditorData, value: string) => {
      setData((prev) => ({ ...prev, [field]: value }));
    };

    return <PlotEditor data={data} onChange={handleChange} />;
  },
};
