import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  FeedbackForm,
} from '@tsumugi/ui';
import { useSubmitFeedback } from '~/hooks/feedback';

export interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * どの画面・機能についての要望か（集計軸）。
   *
   * ドット区切りで命名を揃える（例: `home.feedback`, `ai.chat`）。
   * 画面側で自動付与し、ユーザーには入力させない。
   */
  surface: string;
}

/**
 * 要望・不満を送るダイアログ
 */
export function FeedbackDialog({
  open,
  onOpenChange,
  surface,
}: FeedbackDialogProps) {
  const { trigger, isMutating } = useSubmitFeedback();
  const [savedSummary, setSavedSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // DialogContent は閉じるとアンマウントされるため、下書きはここで保持する
  const [draft, setDraft] = useState('');

  const handleSubmit = async (summary: string) => {
    setError(null);
    try {
      const signal = await trigger({ surface, summary });
      if (signal) {
        setSavedSummary(signal.summary);
        setDraft('');
      } else {
        // trigger は後続の trigger に追い越されると undefined を返す
        setError('送信が中断されました。もう一度お試しください。');
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(`送信に失敗しました: ${message}`);
    }
  };

  const handleOpenChange = (next: boolean) => {
    // 閉じている間に遅れて届いたレスポンスが次回に持ち越されないよう、
    // 開くタイミングで状態をリセットする（閉じる際に消すと閉じるアニメ中に
    // 入力フォームが一瞬見えてしまう）
    if (next) {
      setSavedSummary(null);
      setError(null);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ご意見・ご要望</DialogTitle>
          <DialogDescription>
            使っていて困ったこと・ほしい機能を教えてください。今後の開発の参考にします。
          </DialogDescription>
        </DialogHeader>
        <FeedbackForm
          defaultValue={draft}
          onValueChange={setDraft}
          isSubmitting={isMutating}
          savedSummary={savedSummary}
          error={error}
          onSubmit={(summary) => void handleSubmit(summary)}
          onCancel={() => handleOpenChange(false)}
          onReset={() => {
            setSavedSummary(null);
            setError(null);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
