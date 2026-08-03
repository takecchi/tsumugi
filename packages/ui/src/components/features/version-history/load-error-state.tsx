import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export interface LoadErrorStateProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * 読み込みに失敗したことを示す表示。
 *
 * 履歴や差分の取得に失敗したとき、空状態（「履歴がありません」等）を出すと
 * 「データが存在しない」と誤解させてしまう。特に復元のような破壊的操作を
 * 伴う画面では危険なため、失敗は失敗として見せて再試行の導線を出す。
 */
export function LoadErrorState({
  message,
  onRetry,
  className,
}: LoadErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center gap-2 px-3 py-8 text-center',
        className,
      )}
    >
      <AlertTriangle className="size-5 text-destructive" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button size="xs" variant="outline" onClick={onRetry}>
          <RefreshCw className="size-3" />
          再試行
        </Button>
      )}
    </div>
  );
}
