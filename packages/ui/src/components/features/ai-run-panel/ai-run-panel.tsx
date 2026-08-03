import { AlertTriangle, Loader2, Plus, RefreshCw, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { AiRunPanelProps } from './types';
import {
  DEFAULT_MAX_STEPS_RANGE,
  DEFAULT_MAX_TOTAL_TOKENS_RANGE,
  isActiveStatus,
} from './labels';
import {
  FinishBanner,
  PlanChecklist,
  ProgressBar,
  StatusBadge,
} from './ai-run-parts';
import { RunSelector } from './ai-run-selectors';
import { StartRunForm } from './ai-run-start-form';
import { RunTranscript } from './ai-run-transcript';

// ─── 本体 ───

/**
 * 自律エージェント Run のパネル。
 *
 * 表示専用コンポーネント（データ取得・ストリーム購読は行わない）。
 * `run` が未指定なら起動フォーム、指定されていれば進捗・計画・transcript を表示する。
 */
export function AiRunPanel({
  run,
  isLoadingRun = false,
  messages = [],
  streamingContent = null,
  runs = [],
  onSelectRun,
  onNewRun,
  onStartRun,
  onStopRun,
  isStarting = false,
  isStopping = false,
  isReconnecting = false,
  transientError = null,
  startError = null,
  models = [],
  goalMaxLength = 4000,
  maxStepsRange = DEFAULT_MAX_STEPS_RANGE,
  maxTotalTokensRange = DEFAULT_MAX_TOTAL_TOKENS_RANGE,
  className,
}: AiRunPanelProps) {
  const isActive = run != null && isActiveStatus(run.status);

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      <div className="flex items-center justify-between gap-2 border-b px-2 py-1.5">
        <RunSelector
          runs={runs}
          currentRunId={run?.id}
          onSelectRun={onSelectRun}
        />
        {(run != null || isLoadingRun) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={onNewRun}
          >
            <Plus className="size-3" />
            新しい実行
          </Button>
        )}
      </div>

      {run == null && isLoadingRun ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          実行を読み込んでいます…
        </div>
      ) : run == null ? (
        <ScrollArea className="min-h-0 flex-1">
          <StartRunForm
            onStartRun={onStartRun}
            isStarting={isStarting}
            startError={startError}
            onSelectRun={onSelectRun}
            models={models}
            goalMaxLength={goalMaxLength}
            maxStepsRange={maxStepsRange}
            maxTotalTokensRange={maxTotalTokensRange}
          />
        </ScrollArea>
      ) : (
        <>
          <div className="space-y-3 border-b px-3 py-2">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 text-xs whitespace-pre-wrap">{run.goal}</p>
              <StatusBadge status={run.status} />
            </div>

            {/* status だけでは成否が判別できないため、終了理由で文言を出し分ける */}
            {run.finishReason && (
              <FinishBanner
                finishReason={run.finishReason}
                lastError={run.lastError}
              />
            )}

            {isReconnecting && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <RefreshCw className="size-3 animate-spin" />
                接続が切れました。再接続しています…
              </p>
            )}

            {/* error チャンクは終端ではなく自動リトライされるため、失敗とは書かない */}
            {transientError && !run.finishReason && (
              <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                <span className="min-w-0 break-words">
                  一時的なエラーが発生しました。自動でリトライしています（
                  {transientError}）
                </span>
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <ProgressBar
                label="ステップ"
                value={run.stepCount}
                max={run.maxSteps}
              />
              <ProgressBar
                label="トークン（入力＋出力）"
                value={run.totalTokens}
                max={run.maxTotalTokens}
              />
            </div>

            <div className="flex items-center gap-3 text-[10px] text-muted-foreground tabular-nums">
              <span>作成ノード {run.createdNodeCount}</span>
              <span>サブエージェント {run.subagentCount}</span>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-muted-foreground">
                計画
              </p>
              <PlanChecklist plan={run.plan} />
            </div>
          </div>

          <RunTranscript
            messages={messages}
            streamingContent={streamingContent}
            isRunning={isActive}
          />

          {isActive && (
            <div className="border-t p-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 w-full gap-1 text-xs"
                onClick={onStopRun}
                disabled={isStopping}
              >
                {isStopping ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Square className="size-3" />
                )}
                {isStopping ? '停止を要求しました…' : '停止'}
              </Button>
              {isStopping && (
                <p className="mt-1 text-center text-[10px] text-muted-foreground">
                  現在のバッチが終わってから停止します
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
