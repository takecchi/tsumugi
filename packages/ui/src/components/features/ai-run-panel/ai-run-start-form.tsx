import * as React from 'react';
import { Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { isIMEActive } from '@/lib/keyboard-utils';
import type { AiModelOption } from '@/components/features/ai-panel/ai-panel';
import type { AiRunStartError, AiRunStartInput } from './types';
import { ModelSelector } from './ai-run-selectors';

// ─── 起動フォーム ───

/** 起動失敗の通知。409 のときは進行中 Run への導線を出す */
function StartErrorNotice({
  error,
  onSelectRun,
}: {
  error: AiRunStartError;
  onSelectRun?: (runId: string) => void;
}) {
  const runningRunId = error.runningRunId;
  return (
    <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/10 p-2.5">
      <p className="text-xs text-destructive">{error.message}</p>
      {runningRunId && (
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => onSelectRun?.(runningRunId)}
        >
          進行中の実行を見る
        </Button>
      )}
    </div>
  );
}

export function StartRunForm({
  onStartRun,
  isStarting,
  startError,
  onSelectRun,
  models,
  goalMaxLength,
  maxStepsRange,
  maxTotalTokensRange,
}: {
  onStartRun?: (input: AiRunStartInput) => void;
  isStarting: boolean;
  startError?: AiRunStartError | null;
  onSelectRun?: (runId: string) => void;
  models: AiModelOption[];
  goalMaxLength: number;
  maxStepsRange: { min: number; max: number; default: number };
  maxTotalTokensRange: { min: number; max: number; default: number };
}) {
  const maxStepsId = React.useId();
  const maxTotalTokensId = React.useId();
  const [goal, setGoal] = React.useState('');
  const [model, setModel] = React.useState<string | undefined>();
  const [maxSteps, setMaxSteps] = React.useState(maxStepsRange.default);
  const [maxTotalTokens, setMaxTotalTokens] = React.useState(
    maxTotalTokensRange.default,
  );

  const trimmedGoal = goal.trim();
  // 二重送信抑止: 送信中とゴール未入力・文字数超過では起動できない
  const canStart =
    trimmedGoal.length > 0 &&
    trimmedGoal.length <= goalMaxLength &&
    !isStarting;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canStart) return;
    onStartRun?.({
      goal: trimmedGoal,
      ...(model ? { model } : {}),
      maxSteps,
      maxTotalTokens,
    });
  };

  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-3">
      <div className="space-y-1">
        <p className="text-sm font-semibold">自律実行</p>
        <p className="text-xs text-muted-foreground">
          ゴールを渡すと、AIが自分で計画を立てて複数ステップを自動実行します。
          作成された内容は「検討中」として保存されます。
        </p>
      </div>

      {startError && (
        <StartErrorNotice error={startError} onSelectRun={onSelectRun} />
      )}

      <div className="space-y-1">
        <Textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="例: 第2章のプロットを整理して、登場人物の設定と矛盾がないようにメモを作成する"
          rows={4}
          maxLength={goalMaxLength}
          className="min-h-[96px] text-sm"
          onKeyDown={(e) => {
            if (
              e.key === 'Enter' &&
              (e.metaKey || e.ctrlKey) &&
              !isIMEActive(e)
            ) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <p className="text-right text-[10px] text-muted-foreground tabular-nums">
          {trimmedGoal.length} / {goalMaxLength.toLocaleString()}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label
            htmlFor={maxStepsId}
            className="block text-[10px] font-medium text-muted-foreground"
          >
            最大ステップ数
          </label>
          <Input
            id={maxStepsId}
            type="number"
            inputMode="numeric"
            min={maxStepsRange.min}
            max={maxStepsRange.max}
            value={maxSteps}
            onChange={(e) => setMaxSteps(Number(e.target.value))}
            onBlur={(e) =>
              setMaxSteps(
                clamp(
                  Number(e.target.value) || maxStepsRange.default,
                  maxStepsRange.min,
                  maxStepsRange.max,
                ),
              )
            }
            className="h-8 text-xs tabular-nums"
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor={maxTotalTokensId}
            className="block text-[10px] font-medium text-muted-foreground"
          >
            トークン予算
          </label>
          <Input
            id={maxTotalTokensId}
            type="number"
            inputMode="numeric"
            min={maxTotalTokensRange.min}
            max={maxTotalTokensRange.max}
            step={1000}
            value={maxTotalTokens}
            onChange={(e) => setMaxTotalTokens(Number(e.target.value))}
            onBlur={(e) =>
              setMaxTotalTokens(
                clamp(
                  Number(e.target.value) || maxTotalTokensRange.default,
                  maxTotalTokensRange.min,
                  maxTotalTokensRange.max,
                ),
              )
            }
            className="h-8 text-xs tabular-nums"
          />
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">
        トークン予算は<strong>出力だけでなく入力を含む合計</strong>です。
        毎回のバッチでコンテキスト全文を再送するため、入力は出力の10〜30倍になることがあります。
        小さすぎる値を設定するとすぐに打ち切られます。
      </p>

      <div className="flex items-center justify-between gap-2">
        {models.length > 0 ? (
          <ModelSelector
            models={models}
            model={model}
            onModelChange={setModel}
          />
        ) : (
          <span />
        )}
        <Button
          type="submit"
          size="sm"
          className="h-7 gap-1 px-3 text-xs"
          disabled={!canStart}
        >
          {isStarting ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Play className="size-3" />
          )}
          {isStarting ? '起動中…' : '実行開始'}
        </Button>
      </div>
    </form>
  );
}
