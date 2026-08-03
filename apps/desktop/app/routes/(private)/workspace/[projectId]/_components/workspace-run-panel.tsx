import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AiRunPanel,
  type AiRunStartInput,
  type AiRunStartError,
} from '@tsumugi/ui';
import type { CreateAIRunData } from '@tsumugi/adapter';
import {
  useAIRun,
  useAIRuns,
  useCreateAIRun,
  useStopAIRun,
} from '~/hooks/ai-runs';
import { AI_MODELS } from '~/constants/ai-models';
import {
  AI_RUN_GOAL_MAX_LENGTH,
  AI_RUN_MAX_STEPS,
  AI_RUN_MAX_TOTAL_TOKENS,
  AI_RUN_POLL_INTERVAL_MS,
} from '~/constants/ai-runs';
import { useAIRunStream } from '../_hooks/useAIRunStream';
import {
  buildRunTranscript,
  isActiveRun,
  toAiRunDetail,
  toAiRunSummaries,
} from '../_utils/ai-run-utils';

interface WorkspaceRunPanelProps {
  projectId: string;
}

/**
 * 自律エージェント Run パネル（データ取得 + ストリーム購読）。
 *
 * runId が確定してから RunContent をマウントする。
 */
export function WorkspaceRunPanel({ projectId }: WorkspaceRunPanelProps) {
  const { data: runs } = useAIRuns(projectId);
  const { trigger: triggerCreate, isMutating: isStarting } =
    useCreateAIRun(projectId);

  const [selectedRunId, setSelectedRunId] = useState<string | undefined>();
  const [startError, setStartError] = useState<AiRunStartError | null>(null);

  // 進行中の Run があれば初回だけ自動で開く（別タブ・再読み込み後でも進捗に復帰できる）。
  // 「新しい実行」で意図的にフォームへ戻した場合に引き戻さないよう、初回限定にする。
  const didAutoSelectRef = useRef(false);
  useEffect(() => {
    if (didAutoSelectRef.current || !runs) return;
    didAutoSelectRef.current = true;
    const active = runs.find(isActiveRun);
    if (active) setSelectedRunId(active.id);
  }, [runs]);

  const handleStartRun = useCallback(
    async (input: AiRunStartInput) => {
      // 二重送信抑止（UI 側の disabled と合わせた二重の防御）
      if (isStarting) return;
      setStartError(null);

      const data: CreateAIRunData = {
        goal: input.goal,
        ...(input.model ? { model: input.model } : {}),
        maxSteps: input.maxSteps,
        maxTotalTokens: input.maxTotalTokens,
      };

      try {
        const result = await triggerCreate(data);
        if (!result) return;
        // 1プロジェクトにつき同時に走れる Run は1本だけ。
        // 409 は結果の型で返るので、進行中 Run への導線を出す。
        if (result.status === 'conflict') {
          setStartError({
            message: result.message,
            ...(result.runningRun
              ? { runningRunId: result.runningRun.id }
              : {}),
          });
          return;
        }
        setSelectedRunId(result.run.id);
      } catch (e) {
        setStartError({
          message: `自律実行の開始に失敗しました: ${
            e instanceof Error ? e.message : String(e)
          }`,
        });
      }
    },
    [isStarting, triggerCreate],
  );

  const handleSelectRun = useCallback((runId: string) => {
    setStartError(null);
    setSelectedRunId(runId);
  }, []);

  const handleNewRun = useCallback(() => {
    setStartError(null);
    setSelectedRunId(undefined);
  }, []);

  const runSummaries = useMemo(() => toAiRunSummaries(runs), [runs]);

  if (!selectedRunId) {
    return (
      <AiRunPanel
        run={null}
        runs={runSummaries}
        models={AI_MODELS}
        isStarting={isStarting}
        startError={startError}
        onStartRun={handleStartRun}
        onSelectRun={handleSelectRun}
        goalMaxLength={AI_RUN_GOAL_MAX_LENGTH}
        maxStepsRange={AI_RUN_MAX_STEPS}
        maxTotalTokensRange={AI_RUN_MAX_TOTAL_TOKENS}
      />
    );
  }

  return (
    <RunContent
      key={selectedRunId}
      projectId={projectId}
      runId={selectedRunId}
      runSummaries={runSummaries}
      onSelectRun={handleSelectRun}
      onNewRun={handleNewRun}
    />
  );
}

interface RunContentProps {
  projectId: string;
  runId: string;
  runSummaries: ReturnType<typeof toAiRunSummaries>;
  onSelectRun: (runId: string) => void;
  onNewRun: () => void;
}

/**
 * runId 確定後の表示。Run の状態を購読しつつ、進捗はポーリングで追う。
 */
function RunContent({
  projectId,
  runId,
  runSummaries,
  onSelectRun,
  onNewRun,
}: RunContentProps) {
  const { messages, streamingContent, plan, isReconnecting, transientError } =
    useAIRunStream(projectId, runId);

  // step / トークンの累積は AIRun から読む。バッチ境界を知らせるチャンクが
  // 流れないため、実行中はポーリングで追う。
  const { data: run, isLoading: isLoadingRun } = useAIRun(runId, {
    refreshInterval: (latest) =>
      isActiveRun(latest) ? AI_RUN_POLL_INTERVAL_MS : 0,
  });

  const { trigger: triggerStop } = useStopAIRun(runId);
  const [stopRequested, setStopRequested] = useState(false);

  const handleStopRun = useCallback(() => {
    // stopAIRun は冪等。ただしレスポンスの status はまだ running のことがあるため、
    // 「停止済み」の判定には使わず、実際に非アクティブになるまで要求中として扱う。
    setStopRequested(true);
    void triggerStop().catch((e) => {
      console.error('[ai-run] Failed to stop the run:', e);
      setStopRequested(false);
    });
  }, [triggerStop]);

  const isActive = isActiveRun(run);
  useEffect(() => {
    // run-status(stopped) やポーリングで停止が確定したら要求中表示を解除する
    if (!isActive) setStopRequested(false);
  }, [isActive]);

  const transcript = useMemo(() => buildRunTranscript(messages), [messages]);
  const detail = useMemo(
    () => (run ? toAiRunDetail(run, plan) : null),
    [run, plan],
  );

  return (
    <AiRunPanel
      run={detail}
      isLoadingRun={isLoadingRun}
      messages={transcript}
      streamingContent={streamingContent}
      runs={runSummaries}
      models={AI_MODELS}
      isStopping={stopRequested}
      isReconnecting={isReconnecting}
      transientError={transientError}
      onSelectRun={onSelectRun}
      onNewRun={onNewRun}
      onStopRun={handleStopRun}
      goalMaxLength={AI_RUN_GOAL_MAX_LENGTH}
      maxStepsRange={AI_RUN_MAX_STEPS}
      maxTotalTokensRange={AI_RUN_MAX_TOTAL_TOKENS}
    />
  );
}
