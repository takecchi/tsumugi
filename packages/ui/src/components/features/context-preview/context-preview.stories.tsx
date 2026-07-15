import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ContextPreview, type ContextPreviewSection } from './context-preview';

const meta = {
  title: 'Features/ContextPreview',
  component: ContextPreview,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ height: '600px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ContextPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockSections: ContextPreviewSection[] = [
  {
    tier: 1,
    title: '作品設定',
    content:
      '## 世界観\n\n中世ヨーロッパ風の架空世界「エルデン」。魔法が日常に溶け込んだ社会で、魔導士ギルドが政治の実権を握っている。\n\n- **主要都市**: 王都アルカディア\n- **通貨**: ゴルド\n- **暦**: 光暦',
    charCount: 96,
  },
  {
    tier: 2,
    title: 'キャラクター: レイン',
    content:
      '17歳の見習い魔導士。幼い頃に両親を亡くし、祖母に育てられた。好奇心が強く、禁書庫に忍び込む癖がある。\n\n口癖は「なんとかなるよ」。実は膨大な魔力を秘めているが、本人は自覚していない。物語を通じて自身の出自と向き合い、真の力に目覚めていく。師匠であるアーヴィンとの信頼関係が成長の鍵となる。序盤では未熟さが目立つが、仲間との出会いを経て少しずつ責任感を身につけていく。',
    charCount: 182,
  },
  {
    tier: 3,
    title: '直前のプロット',
    content:
      '第3章では、レインが禁書庫で古代魔法の書物を発見する。その内容を読み解くうちに、自分の血筋に隠された秘密の手がかりを掴む。',
    charCount: 61,
  },
];

export const Default: Story = {
  args: {
    sections: mockSections,
    totalCharCount: mockSections.reduce((sum, s) => sum + s.charCount, 0),
  },
};

export const Empty: Story = {
  args: {
    sections: [],
    totalCharCount: 0,
  },
};

export const Interactive: StoryObj = {
  render: () => {
    const [sections, setSections] =
      useState<ContextPreviewSection[]>(mockSections);
    const [isLoading, setIsLoading] = useState(false);

    const handleRefresh = () => {
      setIsLoading(true);
      setTimeout(() => {
        setSections((prev) => {
          const next: ContextPreviewSection = {
            tier: prev.length + 1,
            title: `追加コンテキスト ${prev.length + 1}`,
            content:
              '再取得のたびに追加される新しいコンテキストのサンプルです。Tierは末尾に追加されます。',
            charCount: 44,
          };
          return [...prev, next];
        });
        setIsLoading(false);
      }, 800);
    };

    const totalCharCount = sections.reduce((sum, s) => sum + s.charCount, 0);

    return (
      <ContextPreview
        sections={sections}
        totalCharCount={totalCharCount}
        isLoading={isLoading}
        onRefresh={handleRefresh}
      />
    );
  },
};
