import type { Meta, StoryObj } from "@storybook/react";
import { Separator } from "./separator";

const meta = {
  title: "UI/Separator",
  component: Separator,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-[300px] space-y-4">
      <div>
        <h4 className="text-sm font-medium">コンテンツ1</h4>
        <p className="text-sm text-muted-foreground">最初のセクションのコンテンツです。</p>
      </div>
      <Separator />
      <div>
        <h4 className="text-sm font-medium">コンテンツ2</h4>
        <p className="text-sm text-muted-foreground">2番目のセクションのコンテンツです。</p>
      </div>
      <Separator />
      <div>
        <h4 className="text-sm font-medium">コンテンツ3</h4>
        <p className="text-sm text-muted-foreground">3番目のセクションのコンテンツです。</p>
      </div>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex items-center space-x-4">
      <div className="space-y-2">
        <div className="w-4 h-4 bg-blue-500 rounded" />
        <div className="w-4 h-4 bg-green-500 rounded" />
        <div className="w-4 h-4 bg-purple-500 rounded" />
      </div>
      <Separator orientation="vertical" className="h-20" />
      <div className="space-y-2">
        <div className="w-4 h-4 bg-red-500 rounded" />
        <div className="w-4 h-4 bg-yellow-500 rounded" />
        <div className="w-4 h-4 bg-orange-500 rounded" />
      </div>
    </div>
  ),
};
