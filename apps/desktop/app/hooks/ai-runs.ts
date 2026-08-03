import { useCallback } from 'react';
import useSWR, { type SWRConfiguration } from 'swr';
import useSWRMutation from 'swr/mutation';
import type {
  AIMessage,
  AIRun,
  AIRunStreamChunk,
  CreateAIRunData,
  CreateAIRunResult,
} from '@tsumugi/adapter';
import { useAdapter } from '~/hooks/useAdapter';

export interface AIRunsKey {
  type: 'aiRuns';
  projectId: string;
}

export interface AIRunKey {
  type: 'aiRun';
  runId: string;
}

/** 自律Run 一覧の SWR キー（グローバル mutate 用） */
export function toAIRunsKey(projectId: string): AIRunsKey {
  return { type: 'aiRuns', projectId };
}

/** 自律Run 詳細の SWR キー（グローバル mutate 用） */
export function toAIRunKey(runId: string): AIRunKey {
  return { type: 'aiRun', runId };
}

/**
 * プロジェクトの自律Run 一覧を取得する（新しい順）
 * @param projectId - プロジェクトID
 * @param config
 */
export function useAIRuns(
  projectId: string,
  config?: SWRConfiguration<AIRun[], Error>,
) {
  const adapter = useAdapter();
  return useSWR<AIRun[], Error, AIRunsKey>(
    toAIRunsKey(projectId),
    ({ projectId }) => adapter.runs.list(projectId),
    config,
  );
}

/**
 * 自律Run の状態を取得する。
 *
 * 進捗（`stepCount` / `totalTokens` の累積）はここから読む。実行中はバッチ境界を
 * 知らせるチャンクが流れないため、呼び出し側が `refreshInterval` でポーリングする。
 * @param runId - Run ID
 * @param config
 */
export function useAIRun(
  runId: string,
  config?: SWRConfiguration<AIRun, Error>,
) {
  const adapter = useAdapter();
  return useSWR<AIRun, Error, AIRunKey>(
    toAIRunKey(runId),
    ({ runId }) => adapter.runs.get(runId),
    config,
  );
}

/**
 * 自律Run を作成して起動する。
 *
 * 進行中の Run が既にある場合（409）は throw せず `{ status: 'conflict' }` を返す。
 * 呼び出し側で `status` を分岐して進行中 Run への導線を出すこと。
 * @param projectId - プロジェクトID
 * @revalidates useAIRuns - 自律Run 一覧を再フェッチする
 */
export function useCreateAIRun(projectId: string) {
  const adapter = useAdapter();
  return useSWRMutation<CreateAIRunResult, Error, AIRunsKey, CreateAIRunData>(
    toAIRunsKey(projectId),
    ({ projectId }, { arg }) => adapter.runs.create(projectId, arg),
  );
}

/**
 * 自律Run を停止する（冪等）。
 *
 * 停止は現在のバッチ終了後に確定するため、**戻り値の `status` はまだ `running` の
 * ことがある。** そのため戻り値をキャッシュへ書かず（`populateCache` を使わない）、
 * 再フェッチした実際のサーバー状態を表示する。
 * @param runId - Run ID
 * @revalidates useAIRun - Run の状態を再フェッチする
 */
export function useStopAIRun(runId: string) {
  const adapter = useAdapter();
  return useSWRMutation<AIRun, Error, AIRunKey, undefined>(
    toAIRunKey(runId),
    ({ runId }) => adapter.runs.stop(runId),
  );
}

/**
 * Run の transcript を取得するコールバックを返す。
 *
 * SSE は過去チャンクをリプレイしないため、バッチ境界や再接続のたびにこれで
 * 取り直して表示内容を置き換える。
 * @param runId - Run ID
 */
export function useFetchAIRunMessages(runId: string) {
  const adapter = useAdapter();
  return useCallback(
    (): Promise<AIMessage[]> => adapter.runs.getMessages(runId),
    [adapter, runId],
  );
}

/**
 * 自律Run の購読ストリームを開くコールバックを返す。
 *
 * 返るストリームは切断時の再接続まで面倒をみるため、呼び出し側は届いたチャンクを
 * 反映するだけでよい（`transcript` チャンクではメッセージ状態を置き換える）。
 * @param runId - Run ID
 */
export function useSubscribeAIRun(runId: string) {
  const adapter = useAdapter();
  return useCallback(
    (): ReadableStream<AIRunStreamChunk> => adapter.runs.subscribe(runId),
    [adapter, runId],
  );
}
