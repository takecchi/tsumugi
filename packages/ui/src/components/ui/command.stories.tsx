import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";

const meta = {
  title: "UI/Command",
  component: Command,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Command>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Command className="rounded-lg border shadow-md">
      <CommandInput placeholder="コマンドを検索..." />
      <CommandList>
        <CommandEmpty>結果が見つかりません。</CommandEmpty>
        <CommandGroup heading="提案">
          <CommandItem>カレンダー</CommandItem>
          <CommandItem>検索</CommandItem>
          <CommandItem>GitHub</CommandItem>
        </CommandGroup>
        <CommandGroup heading="設定">
          <CommandItem>プロフィール</CommandItem>
          <CommandItem>通知</CommandItem>
          <CommandItem>キーボードショートカット</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};

export const WithDialog: Story = {
  render: () => (
    <div className="flex items-center space-x-4">
      <Command className="rounded-lg border shadow-md">
        <CommandInput placeholder="タイプしてコマンドを検索..." />
        <CommandList>
          <CommandEmpty>結果が見つかりません。</CommandEmpty>
          <CommandGroup heading="提案">
            <CommandItem>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-500 rounded" />
                <span>ドキュメント</span>
              </div>
            </CommandItem>
            <CommandItem>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded" />
                <span>画像</span>
              </div>
            </CommandItem>
            <CommandItem>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-purple-500 rounded" />
                <span>ビデオ</span>
              </div>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  ),
};
