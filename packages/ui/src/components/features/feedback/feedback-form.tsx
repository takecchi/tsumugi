import * as React from 'react';
import { CheckCircle2Icon, SendIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { countChars, normalizeFeedbackText } from '@/lib/feedback-text';
import { cn } from '@/lib/utils';

/**
 * 入力欄の既定の上限文字数。
 *
 * サーバーは2000文字まで受け付けるが、保存・返却されるのは280文字までなので、
 * 切り詰めで内容が失われないよう入力側を280文字に寄せている。
 */
export const FEEDBACK_MAX_LENGTH = 280;

export interface FeedbackFormProps {
  /** 入力上限（コードポイント数）。既定は {@link FEEDBACK_MAX_LENGTH} */
  maxLength?: number;
  /**
   * 入力欄の初期値。
   *
   * マウント時のみ参照する。閉じても下書きを保持したい場合は、
   * 呼び出し側が {@link FeedbackFormProps.onValueChange} で受け取った値を渡し直す。
   */
  defaultValue?: string;
  /** 入力が変化したときに呼ばれる（下書き保持用） */
  onValueChange?: (value: string) => void;
  /** 送信中かどうか */
  isSubmitting?: boolean;
  /**
   * 送信完了後にサーバーが保存した内容。
   *
   * 伏字化・切り詰めが行われているため送信した文章とは一致しない。
   * 値が入っている間は完了表示になる。
   */
  savedSummary?: string | null;
  /** エラーメッセージ */
  error?: string | null;
  /** 送信（正規化済みの本文のみ。surface は呼び出し側が付与する） */
  onSubmit?: (summary: string) => void;
  /** 閉じる・キャンセル */
  onCancel?: () => void;
  /** 完了表示から入力state に戻す */
  onReset?: () => void;
  className?: string;
}

/**
 * プロダクトへの要望・不満を送るフォーム。
 *
 * 送信内容はサーバー側で伏字化・切り詰めされるため、その旨を明示している。
 */
export function FeedbackForm({
  maxLength = FEEDBACK_MAX_LENGTH,
  defaultValue = '',
  onValueChange,
  isSubmitting = false,
  savedSummary = null,
  error = null,
  onSubmit,
  onCancel,
  onReset,
  className,
}: FeedbackFormProps) {
  const [value, setValue] = React.useState(defaultValue);
  const textareaId = React.useId();
  const hintId = `${textareaId}-hint`;

  // 送信が成功したら入力を捨てる。完了表示から戻る経路が複数あっても
  // 送信済みのテキストが残って二重送信を誘発しないようにする。
  const isSaved = savedSummary !== null;
  React.useEffect(() => {
    if (isSaved) {
      setValue('');
      onValueChange?.('');
    }
  }, [isSaved, onValueChange]);

  const normalized = normalizeFeedbackText(value);
  const length = countChars(normalized);
  const isOverLimit = length > maxLength;
  const submitDisabled = isSubmitting || length === 0 || isOverLimit;

  const updateValue = (next: string) => {
    setValue(next);
    onValueChange?.(next);
  };

  const handleSubmit = () => {
    if (submitDisabled) return;
    onSubmit?.(normalized);
  };

  if (savedSummary !== null) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-start gap-2 text-sm" role="status">
          <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="space-y-1">
            <p className="font-medium">送信しました。ありがとうございます。</p>
            <p className="text-muted-foreground">
              サーバー側で伏字化・切り詰めが行われるため、保存された内容は送信した文章と一致しない場合があります。
            </p>
          </div>
        </div>
        {savedSummary.trim().length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              保存された内容
            </p>
            <p className="max-h-48 overflow-y-auto rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">
              {savedSummary}
            </p>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onReset}>
            続けて送る
          </Button>
          <Button type="button" onClick={onCancel}>
            閉じる
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      className={cn('space-y-4', className)}
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      <div className="space-y-1.5">
        <label htmlFor={textareaId} className="text-sm font-medium">
          ご意見・ご要望
        </label>
        <Textarea
          id={textareaId}
          value={value}
          onChange={(e) => updateValue(e.target.value)}
          disabled={isSubmitting}
          aria-describedby={hintId}
          aria-invalid={isOverLimit}
          // autoResize は長文貼り付けでダイアログが画面外まで伸びてボタンに
          // 届かなくなるため無効化し、高さを固定してスクロールさせる
          autoResize={false}
          className="max-h-48 min-h-32 resize-none overflow-y-auto"
          placeholder="例：プロットの並び替えをドラッグでできるようにしてほしい"
        />
        <div id={hintId} className="flex items-start justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            作品本文は貼らないでください。長い引用（「」『』“”
            の中身が40文字超）は自動で伏字になります。
          </p>
          <span
            className={cn(
              'shrink-0 text-xs tabular-nums',
              isOverLimit ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            {length} / {maxLength}
          </span>
        </div>
        {isOverLimit && (
          <p className="text-xs text-destructive">
            {maxLength}文字以内にしてください（現在{length}文字）。
          </p>
        )}
      </div>

      <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
        送信された内容は、改行や連続する空白を詰めたうえで最大{maxLength}
        文字に切り詰めて保存されます。そのため保存内容は入力した文章と一致しない場合があります。
      </p>

      {error !== null && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            キャンセル
          </Button>
        )}
        <Button type="submit" disabled={submitDisabled}>
          <SendIcon className="size-4" />
          {isSubmitting ? '送信中...' : '送信'}
        </Button>
      </div>
    </form>
  );
}
