import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { ProjectEditor, type ProjectEditorData } from './project-editor';

const meta = {
  title: "Features/ProjectEditor",
  component: ProjectEditor,
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
} satisfies Meta<typeof ProjectEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockData: ProjectEditorData = {
  name: "異世界転生物語",
  synopsis: "現代日本で交通事故に遭った主人公が、剣と魔法の世界に転生する。前世の知識を活かしながら、仲間とともに魔王討伐を目指す冒険譚。",
  theme: "自分の居場所を見つけること。前世では得られなかった「つながり」を異世界で築いていく。",
  goal: "魔王を倒すことではなく、主人公が「ここが自分の居場所だ」と心から思える瞬間を描く。",
  targetWordCount: "120000",
  targetAudience: "10代後半〜20代のライトノベル読者層。異世界ファンタジーが好きな層。",
};

export const Default: Story = {
  args: {
    data: mockData,
  },
};

export const Empty: Story = {
  args: {
    data: {
      name: "新しい作品",
      synopsis: "",
      theme: "",
      goal: "",
      targetWordCount: "",
      targetAudience: "",
    },
  },
};

export const Interactive: StoryObj = {
  render: () => {
    const [data, setData] = useState<ProjectEditorData>(mockData);

    const handleChange = (field: keyof ProjectEditorData, value: string) => {
      setData((prev) => ({ ...prev, [field]: value }));
    };

    return <ProjectEditor data={data} onChange={handleChange} />;
  },
};
