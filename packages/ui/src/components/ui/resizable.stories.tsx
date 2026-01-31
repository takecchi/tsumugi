import type { Meta, StoryObj } from "@storybook/react";
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from "./resizable";

const meta = {
  title: "UI/Resizable",
  component: ResizablePanelGroup,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ResizablePanelGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ResizablePanelGroup orientation="horizontal" className="min-h-[200px] max-w-md">
      <ResizablePanel defaultSize={50}>
        <div className="flex h-full items-center justify-center border rounded-md p-4">
          <p className="text-sm">リサイズ可能なパネル</p>
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={50}>
        <div className="flex h-full items-center justify-center border rounded-md p-4">
          <p className="text-sm">もう一つのパネル</p>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
};

export const WithMinSize: Story = {
  render: () => (
    <ResizablePanelGroup orientation="horizontal" className="min-h-[200px] max-w-md">
      <ResizablePanel defaultSize={30} minSize={20}>
        <div className="flex h-full items-center justify-center border rounded-md p-4">
          <p className="text-sm">最小サイズ: 20%</p>
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={70} minSize={40}>
        <div className="flex h-full items-center justify-center border rounded-md p-4">
          <p className="text-sm">最小サイズ: 40%</p>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
};

export const WithMaxSize: Story = {
  render: () => (
    <ResizablePanelGroup orientation="horizontal" className="min-h-[200px] max-w-md">
      <ResizablePanel defaultSize={25} maxSize={40}>
        <div className="flex h-full items-center justify-center border rounded-md p-4">
          <p className="text-sm">最大サイズ: 40%</p>
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={75}>
        <div className="flex h-full items-center justify-center border rounded-md p-4">
          <p className="text-sm">残りのスペース</p>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
};
