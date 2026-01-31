import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Sidebar, SidebarSection, type TreeNodeData, type ContentType } from "./sidebar";

const mockPlots: TreeNodeData[] = [
  {
    id: "1",
    name: "第1章 プロット",
    type: "plot",
    nodeType: "folder",
    children: [
      { id: "1-1", name: "起承転結", type: "plot", nodeType: "file" },
      { id: "1-2", name: "キャラ動線", type: "plot", nodeType: "file" },
    ],
  },
  { id: "2", name: "全体構成", type: "plot", nodeType: "file" },
];

const mockCharacters: TreeNodeData[] = [
  {
    id: "3",
    name: "主要キャラクター",
    type: "character",
    nodeType: "folder",
    children: [
      { id: "3-1", name: "主人公", type: "character", nodeType: "file" },
      { id: "3-2", name: "ヒロイン", type: "character", nodeType: "file" },
    ],
  },
  { id: "4", name: "サブキャラ一覧", type: "character", nodeType: "file" },
];

const mockMemos: TreeNodeData[] = [
  { id: "5", name: "世界観設定", type: "memo", nodeType: "file" },
  { id: "6", name: "アイデアメモ", type: "memo", nodeType: "file" },
];

const mockWritings: TreeNodeData[] = [
  {
    id: "7",
    name: "第1章",
    type: "writing",
    nodeType: "folder",
    children: [
      { id: "7-1", name: "1-1 出会い", type: "writing", nodeType: "file" },
      { id: "7-2", name: "1-2 旅立ち", type: "writing", nodeType: "file" },
    ],
  },
  { id: "8", name: "プロローグ", type: "writing", nodeType: "file" },
];

function MockSidebarContent({ onSelect, onCreateFile }: { onSelect?: (node: TreeNodeData) => void; onCreateFile?: (type: ContentType, parentId: string | null) => void }) {
  return (
    <>
      <SidebarSection type="plot" nodes={mockPlots} onSelect={onSelect} onCreateFile={onCreateFile} />
      <SidebarSection type="character" nodes={mockCharacters} onSelect={onSelect} onCreateFile={onCreateFile} />
      <SidebarSection type="memo" nodes={mockMemos} onSelect={onSelect} onCreateFile={onCreateFile} />
      <SidebarSection type="writing" nodes={mockWritings} onSelect={onSelect} onCreateFile={onCreateFile} />
    </>
  );
}

const meta = {
  title: "Features/Sidebar",
  component: Sidebar,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ height: "600px", width: "280px" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    selectedId: null,
    children: <MockSidebarContent />,
  },
};

export const WithSelection: Story = {
  args: {
    selectedId: "1-1",
    children: <MockSidebarContent />,
  },
};

export const Empty: Story = {
  args: {
    selectedId: null,
  },
};

const mockLongNameNodes: TreeNodeData[] = [
  {
    id: "long-1",
    name: "とても長いタイトルのプロットで親要素の横幅を超えてしまうケース",
    type: "plot",
    nodeType: "file",
  },
  {
    id: "long-2",
    name: "第一章 主人公が旅に出る前の日常生活と幼馴染との別れのシーン",
    type: "writing",
    nodeType: "file",
  },
  {
    id: "long-3",
    name: "短い名前",
    type: "writing",
    nodeType: "file",
  },
];

export const LongNames: Story = {
  args: {
    selectedId: null,
    children: (
      <>
        <SidebarSection type="plot" nodes={mockLongNameNodes.filter(n => n.type === 'plot')} onDelete={(node) => console.log("Delete:", node)} />
        <SidebarSection type="writing" nodes={mockLongNameNodes.filter(n => n.type === 'writing')} onDelete={(node) => console.log("Delete:", node)} />
      </>
    ),
  },
};

export const Interactive: StoryObj = {
  render: () => {
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const handleSelect = (node: TreeNodeData) => {
      setSelectedId(node.id);
    };

    const handleCreateFile = (type: ContentType, parentId: string | null) => {
      console.log("Create file:", type, parentId);
    };

    return (
      <Sidebar selectedId={selectedId}>
        <MockSidebarContent onSelect={handleSelect} onCreateFile={handleCreateFile} />
      </Sidebar>
    );
  },
};
