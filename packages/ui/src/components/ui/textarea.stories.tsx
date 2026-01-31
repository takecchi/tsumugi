import type { Meta, StoryObj } from "@storybook/react";
import { Textarea } from "./textarea";

const meta = {
  title: "UI/Textarea",
  component: Textarea,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    autoResize: {
      control: "boolean",
      description: "内容に合わせて高さを自動調整する（JSベース）",
    },
  },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: "テキストを入力してください...",
    rows: 4,
    autoResize: true,
  },
};

export const WithValue: Story = {
  args: {
    value: "これはテキストエリアのサンプルテキストです。\n複数行の入力ができます。",
    rows: 4,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: "無効状態",
    rows: 4,
  },
};

export const Small: Story = {
  args: {
    placeholder: "小さいサイズ",
    rows: 2,
  },
};

export const Large: Story = {
  args: {
    placeholder: "大きいサイズ",
    rows: 8,
  },
};

export const AutoResize: Story = {
  args: {
    autoResize: true,
    placeholder: "入力すると高さが自動調整されます...",
    defaultValue:
      "これはautoResizeのデモです。\n改行を追加すると高さが自動的に伸びます。\nスクロールバーは表示されず、テキストエリア自体が拡張されます。\n\nさらに行を追加してみてください。",
  },
};

export const NoAutoResize: Story = {
  args: {
    autoResize: false,
    placeholder: "autoResize無効（固定サイズ）",
    rows: 4,
  },
};
