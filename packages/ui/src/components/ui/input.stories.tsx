import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./input";

const meta = {
  title: "UI/Input",
  component: Input,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: "入力してください...",
  },
};

export const WithValue: Story = {
  args: {
    value: "テキスト入力",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: "無効状態",
  },
};

export const WithIcon: Story = {
  render: () => (
    <div className="relative">
      <svg
        className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <Input className="pl-9" placeholder="検索..." />
    </div>
  ),
};
