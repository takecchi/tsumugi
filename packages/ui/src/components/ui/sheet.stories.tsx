import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Button } from "./button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "./sheet";

const meta = {
  title: "UI/Sheet",
  component: Sheet,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">右から開く</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>シートタイトル</SheetTitle>
          <SheetDescription>
            これはシートの説明文です。補足情報をここに記載します。
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 py-2">
          <p className="text-sm">シートの中身です。</p>
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">閉じる</Button>
          </SheetClose>
          <Button>保存</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};

export const LeftSide: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">左から開く</Button>
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>サイドバー</SheetTitle>
          <SheetDescription>
            左側から開くシートです。ナビゲーションなどに利用できます。
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 py-2 space-y-2">
          <p className="text-sm font-medium">メニュー</p>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>ダッシュボード</li>
            <li>プロジェクト</li>
            <li>設定</li>
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  ),
};

export const Interactive: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    const [saved, setSaved] = useState(false);

    return (
      <div className="flex flex-col items-center gap-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button>シートを開く</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>設定</SheetTitle>
              <SheetDescription>
                設定を変更して保存してください。
              </SheetDescription>
            </SheetHeader>
            <div className="px-4 py-2">
              <label htmlFor="project-name" className="text-sm font-medium">プロジェクト名</label>
              <input
                id="project-name"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                defaultValue="異世界転生物語"
              />
            </div>
            <SheetFooter>
              <SheetClose asChild>
                <Button variant="outline">キャンセル</Button>
              </SheetClose>
              <Button
                onClick={() => {
                  setSaved(true);
                  setOpen(false);
                  setTimeout(() => setSaved(false), 2000);
                }}
              >
                保存
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        {saved && (
          <p className="text-sm text-green-600">保存しました</p>
        )}
      </div>
    );
  },
};

export const NoCloseButton: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">閉じるボタンなし</Button>
      </SheetTrigger>
      <SheetContent showCloseButton={false}>
        <SheetHeader>
          <SheetTitle>カスタムシート</SheetTitle>
          <SheetDescription>
            閉じるボタンを非表示にしたシートです。オーバーレイクリックで閉じます。
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 py-2">
          <p className="text-sm">背景のオーバーレイをクリックして閉じてください。</p>
        </div>
      </SheetContent>
    </Sheet>
  ),
};
