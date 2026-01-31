import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

const meta = {
  title: "UI/Dialog",
  component: Dialog,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">プロフィールを編集</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>プロフィール編集</DialogTitle>
          <DialogDescription>
            プロフィール情報をここで変更します。完了したら保存をクリックしてください。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="name" className="text-right">
              名前
            </label>
            <input
              id="name"
              defaultValue="田中 太郎"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="username" className="text-right">
              ユーザー名
            </label>
            <input
              id="username"
              defaultValue="@tanaka"
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit">変更を保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">確認ダイアログ</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>本当に削除しますか？</DialogTitle>
          <DialogDescription>
            この操作は元に戻すことができません。このデータが完全に削除されます。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline">キャンセル</Button>
          <Button variant="destructive">削除</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
