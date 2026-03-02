import type { Meta, StoryObj } from "@storybook/react"
import { DiffHighlight, DiffInline, DiffSideBySide } from "./diff-highlight"

const meta: Meta<typeof DiffHighlight> = {
  title: "UI/DiffHighlight",
  component: DiffHighlight,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof meta>

// サンプルテキスト
const sampleTexts = {
  simple: {
    old: "こんばんは。呼んだかしら",
    new: "おはよう。呼んだかしら",
  },
  multipleChanges: {
    old: "今日は晴れていて、とても暖かい日でした。",
    new: "昨日は雨が降って、とても寒い日でした。",
  },
  insertion: {
    old: "主人公は家を出た。",
    new: "夜明け前、主人公は静かに家を出た。",
  },
  deletion: {
    old: "夜明け前の静寂が街を包んでいた。主人公は窓辺に立ち、遠くに見える山々を眺めていた。",
    new: "主人公は窓辺に立ち、山々を眺めていた。",
  },
  longText: {
    old: `旅に出たい気持ちはある。でも、最初の一歩が踏み出せない。そういう夜。

「こんばんは。呼んだかしら」

唐突に話しかけられる。丁寧で、少しだけ女の子っぽい声色`,
    new: `旅に出たい気持ちはある。でも、最初の一歩が踏み出せない。そういう夜。

「おはよう。呼んだかしら」

唐突に話しかけられる。丁寧で、少しだけ女の子っぽい声色`,
  },
}

export const Basic: Story = {
  args: {
    oldText: sampleTexts.simple.old,
    newText: sampleTexts.simple.new,
    showOld: true,
    showNew: true,
  },
}

export const OnlyDeleted: Story = {
  args: {
    oldText: sampleTexts.simple.old,
    newText: sampleTexts.simple.new,
    showOld: true,
    showNew: false,
  },
}

export const OnlyInserted: Story = {
  args: {
    oldText: sampleTexts.simple.old,
    newText: sampleTexts.simple.new,
    showOld: false,
    showNew: true,
  },
}

export const MultipleChanges: Story = {
  args: {
    oldText: sampleTexts.multipleChanges.old,
    newText: sampleTexts.multipleChanges.new,
    showOld: true,
    showNew: true,
  },
}

export const WithInsertion: Story = {
  args: {
    oldText: sampleTexts.insertion.old,
    newText: sampleTexts.insertion.new,
    showOld: true,
    showNew: true,
  },
}

export const WithDeletion: Story = {
  args: {
    oldText: sampleTexts.deletion.old,
    newText: sampleTexts.deletion.new,
    showOld: true,
    showNew: true,
  },
}

export const LongText: Story = {
  args: {
    oldText: sampleTexts.longText.old,
    newText: sampleTexts.longText.new,
    showOld: true,
    showNew: true,
  },
}

// DiffInline のストーリー
export const InlineView: StoryObj<typeof DiffInline> = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">シンプルな変更</h3>
        <DiffInline 
          oldText={sampleTexts.simple.old} 
          newText={sampleTexts.simple.new} 
        />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-2">複数箇所の変更</h3>
        <DiffInline 
          oldText={sampleTexts.multipleChanges.old} 
          newText={sampleTexts.multipleChanges.new} 
        />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-2">挿入</h3>
        <DiffInline 
          oldText={sampleTexts.insertion.old} 
          newText={sampleTexts.insertion.new} 
        />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-2">削除</h3>
        <DiffInline 
          oldText={sampleTexts.deletion.old} 
          newText={sampleTexts.deletion.new} 
        />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-2">長いテキスト</h3>
        <DiffInline 
          oldText={sampleTexts.longText.old} 
          newText={sampleTexts.longText.new} 
        />
      </div>
    </div>
  ),
}

// DiffSideBySide のストーリー
export const SideBySideView: StoryObj<typeof DiffSideBySide> = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">シンプルな変更</h3>
        <DiffSideBySide 
          oldText={sampleTexts.simple.old} 
          newText={sampleTexts.simple.new} 
        />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-2">複数箇所の変更</h3>
        <DiffSideBySide 
          oldText={sampleTexts.multipleChanges.old} 
          newText={sampleTexts.multipleChanges.new} 
        />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-2">挿入</h3>
        <DiffSideBySide 
          oldText={sampleTexts.insertion.old} 
          newText={sampleTexts.insertion.new} 
        />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-2">削除</h3>
        <DiffSideBySide 
          oldText={sampleTexts.deletion.old} 
          newText={sampleTexts.deletion.new} 
        />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-2">長いテキスト</h3>
        <DiffSideBySide 
          oldText={sampleTexts.longText.old} 
          newText={sampleTexts.longText.new} 
        />
      </div>
    </div>
  ),
}

// 比較表示
export const AllViews: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold mb-4">差分表示の比較</h2>
        <p className="text-sm text-muted-foreground mb-4">
          同じテキストを3つの異なる方法で表示
        </p>
      </div>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">1. インライン表示（統合）</h3>
          <DiffHighlight 
            oldText={sampleTexts.longText.old} 
            newText={sampleTexts.longText.new}
            showOld={true}
            showNew={true}
          />
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-2">2. インライン表示（分離）</h3>
          <DiffInline 
            oldText={sampleTexts.longText.old} 
            newText={sampleTexts.longText.new} 
          />
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-2">3. サイドバイサイド表示</h3>
          <DiffSideBySide 
            oldText={sampleTexts.longText.old} 
            newText={sampleTexts.longText.new} 
          />
        </div>
      </div>
    </div>
  ),
}

// エッジケース
export const EdgeCases: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">空文字列から追加</h3>
        <DiffInline oldText="" newText="新しいテキストが追加されました。" />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-2">全削除</h3>
        <DiffInline oldText="削除されるテキスト" newText="" />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-2">変更なし</h3>
        <DiffInline oldText="変更なしのテキスト" newText="変更なしのテキスト" />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-2">完全に異なるテキスト</h3>
        <DiffInline 
          oldText="完全に異なる元のテキスト" 
          newText="全く違う新しいテキスト" 
        />
      </div>
    </div>
  ),
}
