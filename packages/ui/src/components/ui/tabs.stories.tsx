import type { Meta, StoryObj } from "@storybook/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

const meta = {
  title: "UI/Tabs",
  component: Tabs,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="account" className="w-[400px]">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="account">アカウント</TabsTrigger>
        <TabsTrigger value="password">パスワード</TabsTrigger>
      </TabsList>
      <TabsContent value="account" className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">アカウント設定</h3>
          <p className="text-sm text-muted-foreground">
            アカウント情報を変更します。名前とメールアドレスを更新できます。
          </p>
        </div>
      </TabsContent>
      <TabsContent value="password" className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">パスワード設定</h3>
          <p className="text-sm text-muted-foreground">
            パスワードを変更します。セキュリティのため、定期的な変更をおすすめします。
          </p>
        </div>
      </TabsContent>
    </Tabs>
  ),
};

export const Vertical: Story = {
  render: () => (
    <Tabs defaultValue="account" orientation="vertical" className="w-[400px]">
      <TabsList className="grid w-full grid-cols-1">
        <TabsTrigger value="account">アカウント</TabsTrigger>
        <TabsTrigger value="password">パスワード</TabsTrigger>
        <TabsTrigger value="notifications">通知</TabsTrigger>
      </TabsList>
      <TabsContent value="account" className="mt-4">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">アカウント設定</h3>
          <p className="text-sm text-muted-foreground">アカウント情報を管理します。</p>
        </div>
      </TabsContent>
      <TabsContent value="password" className="mt-4">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">パスワード設定</h3>
          <p className="text-sm text-muted-foreground">パスワードを変更します。</p>
        </div>
      </TabsContent>
      <TabsContent value="notifications" className="mt-4">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">通知設定</h3>
          <p className="text-sm text-muted-foreground">通知の設定を管理します。</p>
        </div>
      </TabsContent>
    </Tabs>
  ),
};
