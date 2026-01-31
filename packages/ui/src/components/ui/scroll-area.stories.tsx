import type { Meta, StoryObj } from "@storybook/react";
import { ScrollArea } from "./scroll-area";

const meta = {
  title: "UI/ScrollArea",
  component: ScrollArea,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ScrollArea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ScrollArea className="h-[200px] w-[350px] rounded-md border p-4">
      <div className="space-y-4">
        <div className="text-lg font-medium">スクロールエリアのデモ</div>
        <p className="text-sm text-muted-foreground">
          これはスクロール可能なコンテンツです。コンテンツがコンテナの高さを超えると、スクロールバーが表示されます。
        </p>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="p-2 border rounded">
            <h4 className="font-medium">セクション {i + 1}</h4>
            <p className="text-sm text-muted-foreground">
              これはサンプルコンテンツです。スクロールをテストするために複数のセクションを用意しました。
            </p>
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
};

export const Horizontal: Story = {
  render: () => (
    <ScrollArea className="h-[100px] w-[400px] rounded-md border">
      <div className="flex space-x-4 p-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-32 h-16 bg-muted rounded flex items-center justify-center">
            <span className="text-sm">アイテム {i + 1}</span>
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
};
