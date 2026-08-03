import { AlertTriangle, Check, CircleDashed, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AiRunFinishReason, AiRunPlanItem, AiRunStatus } from './types';
import {
  FINISH_REASON_META,
  FINISH_TONE_CLASS,
  STATUS_META,
  UNKNOWN_FINISH_META,
} from './labels';

export function StatusBadge({ status }: { status: AiRunStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium',
        meta.className,
      )}
    >
      {status === 'running' && <Loader2 className="size-3 animate-spin" />}
      {meta.label}
    </span>
  );
}

export function ProgressBar({
  label,
  value,
  max,
  note,
}: {
  label: string;
  value: number;
  max: number | null;
  note?: string;
}) {
  const percent =
    max != null && max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-medium text-muted-foreground">
          {label}
        </span>
        <span className="text-xs tabular-nums">
          {value.toLocaleString()} / {max != null ? max.toLocaleString() : '—'}
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        {...(max != null ? { 'aria-valuemax': max } : {})}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width]',
            percent >= 90 ? 'bg-destructive' : 'bg-primary',
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      {note && <p className="text-[10px] text-muted-foreground">{note}</p>}
    </div>
  );
}

export function PlanChecklist({ plan }: { plan: AiRunPlanItem[] }) {
  if (plan.length === 0) {
    return <p className="text-xs text-muted-foreground">計画を立てています…</p>;
  }
  return (
    <ol className="space-y-1.5">
      {plan.map((item, index) => (
        // key は index を使う。PlanItem.id は `${runId}-plan-${index}` の
        // インデックス採番で、計画更新は全上書きのため項目が入れ替わると
        // 同じ id が別内容を指してしまう。
        <li key={index} className="flex items-start gap-2 text-xs">
          {item.status === 'completed' ? (
            <Check className="mt-0.5 size-3.5 shrink-0 text-green-600" />
          ) : item.status === 'in_progress' ? (
            <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin text-primary" />
          ) : (
            <CircleDashed className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          )}
          <span
            className={cn(
              'min-w-0 whitespace-pre-wrap',
              item.status === 'completed' && 'text-muted-foreground',
              item.status === 'in_progress' && 'font-medium',
            )}
          >
            {item.status === 'in_progress' ? item.activeForm : item.content}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function FinishBanner({
  finishReason,
  lastError,
}: {
  /** null の場合は「理由不明で終了」として扱う（黙って隠さない） */
  finishReason: AiRunFinishReason | null;
  lastError: string | null;
}) {
  const meta =
    finishReason != null
      ? FINISH_REASON_META[finishReason]
      : UNKNOWN_FINISH_META;
  return (
    <div
      className={cn(
        'space-y-1 rounded-md border px-3 py-2',
        FINISH_TONE_CLASS[meta.tone],
      )}
    >
      <p className="flex items-center gap-1.5 text-xs font-semibold">
        {meta.tone === 'success' ? (
          <Check className="size-3.5" />
        ) : (
          <AlertTriangle className="size-3.5" />
        )}
        {meta.label}
      </p>
      <p className="text-xs">{meta.description}</p>
      {lastError && (
        <p className="text-xs break-words opacity-80">{lastError}</p>
      )}
    </div>
  );
}
