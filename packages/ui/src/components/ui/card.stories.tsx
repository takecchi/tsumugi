import type { Meta, StoryObj } from "@storybook/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from "./card";
import { Button } from "./button";

const meta = {
  title: "UI/Card",
  component: Card,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: "380px" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>カードタイトル</CardTitle>
        <CardDescription>カードの説明文がここに入ります。</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">カードのコンテンツ部分です。</p>
      </CardContent>
    </Card>
  ),
};

export const WithFooter: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>フッター付きカード</CardTitle>
        <CardDescription>フッターにアクションを配置できます。</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">コンテンツがここに表示されます。</p>
      </CardContent>
      <CardFooter className="gap-2">
        <Button size="sm">保存</Button>
        <Button size="sm" variant="outline">キャンセル</Button>
      </CardFooter>
    </Card>
  ),
};

export const WithAction: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>アクション付きカード</CardTitle>
        <CardDescription>右上にアクションボタンを配置。</CardDescription>
        <CardAction>
          <Button size="sm" variant="outline">編集</Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-sm">CardAction を使うとヘッダー右上にボタンを置けます。</p>
      </CardContent>
    </Card>
  ),
};

export const Simple: Story = {
  render: () => (
    <Card className="p-6">
      <p className="text-sm">シンプルなカード。CardHeader 等を使わず直接コンテンツを配置。</p>
    </Card>
  ),
};
