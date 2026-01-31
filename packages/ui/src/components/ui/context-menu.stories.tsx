import type { Meta, StoryObj } from "@storybook/react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "./context-menu";

const meta = {
  title: "UI/ContextMenu",
  component: ContextMenu,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ContextMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className="flex h-40 w-72 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        右クリックしてください
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={() => console.log("閉じる")}>
          閉じる
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => console.log("他のタブを閉じる")}>
          他のタブを閉じる
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => console.log("すべてのタブを閉じる")}>
          すべてのタブを閉じる
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
};

export const WithDisabledItem: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className="flex h-40 w-72 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        右クリックしてください
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem>コピー</ContextMenuItem>
        <ContextMenuItem>貼り付け</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem disabled>削除（無効）</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
};

export const ManyItems: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className="flex h-40 w-72 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        右クリックしてください
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem>元に戻す</ContextMenuItem>
        <ContextMenuItem>やり直す</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem>切り取り</ContextMenuItem>
        <ContextMenuItem>コピー</ContextMenuItem>
        <ContextMenuItem>貼り付け</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem>すべて選択</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
};
