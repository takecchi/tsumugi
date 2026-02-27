import type { Meta, StoryObj } from "@storybook/react";
import { LoadingPage } from "./loading-page";

const meta = {
  title: "Layout/LoadingPage",
  component: LoadingPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    message: {
      control: "text",
      description: "表示するメッセージ",
    },
    className: {
      control: "text",
      description: "追加のCSSクラス",
    },
  },
} satisfies Meta<typeof LoadingPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const WithCustomMessage: Story = {
  args: {
    message: "データを読み込んでいます...",
  },
};

export const AuthenticationLoading: Story = {
  args: {
    message: "ログイン情報を確認しています",
  },
};

export const ProjectLoading: Story = {
  args: {
    message: "プロジェクトを読み込んでいます",
  },
};

export const WithCustomStyling: Story = {
  args: {
    message: "カスタムスタイル適用中",
    className: "bg-slate-50 dark:bg-slate-900",
  },
};
