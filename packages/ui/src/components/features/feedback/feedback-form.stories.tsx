import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { FEEDBACK_MAX_LENGTH, FeedbackForm } from './feedback-form';

const meta = {
  title: 'Features/FeedbackForm',
  component: FeedbackForm,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ height: '600px', maxWidth: '480px', padding: '24px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FeedbackForm>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockSummary =
  'プロットの並び替えをドラッグでできるようにしてほしい。今は一つずつ順番を指定しないといけないので、章が増えると大変です。';

/** 代表的な入力済みの状態 */
export const Default: Story = {
  args: { defaultValue: mockSummary },
};

/** 未入力の状態（送信ボタンは無効） */
export const Empty: Story = {
  args: {},
};

/** 送信中（入力欄は編集不可になる） */
export const Submitting: Story = {
  args: { defaultValue: mockSummary, isSubmitting: true },
};

/** 上限超過（送信ボタンは無効・カウンタが赤・エラー文を表示） */
export const OverLimit: Story = {
  args: { defaultValue: 'あ'.repeat(FEEDBACK_MAX_LENGTH + 10) },
};

/** エラー表示 */
export const WithError: Story = {
  args: {
    defaultValue: mockSummary,
    error: '送信に失敗しました: ネットワークエラー',
  },
};

/** 送信完了（サーバー側で伏字化・切り詰めされた内容が返る） */
export const Submitted: Story = {
  args: {
    savedSummary:
      'プロットの並び替えをドラッグでできるようにしてほしい。「…」という指摘もありました。',
  },
};

/** 鉤括弧の中身が全て伏字化され、保存内容が空になったケース */
export const SubmittedWithEmptySummary: Story = {
  args: { savedSummary: '' },
};

/**
 * 実際の送信フローを模したストーリー。
 * サーバー側の伏字化（各種括弧の中身が40文字超）と280文字への切り詰めを再現する。
 */
export const Interactive: StoryObj = {
  render: () => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [savedSummary, setSavedSummary] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    /** 括弧の中身が40文字を超えたら伏字化し、280文字に切り詰める（サーバー処理の模擬） */
    const fakeServerProcess = (summary: string): string => {
      const pairs: [string, string][] = [
        ['「', '」'],
        ['『', '』'],
        ['“', '”'],
      ];
      const masked = pairs.reduce((text, [open, close]) => {
        const pattern = new RegExp(`${open}([^${close}]*)${close}`, 'g');
        return text.replace(pattern, (match, inner: string) =>
          [...inner].length > 40 ? `${open}…${close}` : match,
        );
      }, summary);
      return [...masked].slice(0, FEEDBACK_MAX_LENGTH).join('');
    };

    const handleSubmit = (summary: string) => {
      setError(null);
      setIsSubmitting(true);
      setTimeout(() => {
        setIsSubmitting(false);
        setSavedSummary(fakeServerProcess(summary));
      }, 600);
    };

    return (
      <FeedbackForm
        isSubmitting={isSubmitting}
        savedSummary={savedSummary}
        error={error}
        onSubmit={handleSubmit}
        onReset={() => setSavedSummary(null)}
        onCancel={() => setSavedSummary(null)}
      />
    );
  },
};
