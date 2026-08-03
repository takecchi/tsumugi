import { useCallback, useEffect, useState } from 'react';
import { useSWRConfig } from 'swr';
import type { AIMessage, AIRunPlanItem, EditorTabType } from '@tsumugi/adapter';
import {
  toAIRunKey,
  toAIRunsKey,
  useFetchAIRunMessages,
  useSubscribeAIRun,
} from '~/hooks/ai-runs';
import { toContentItemKey, toContentTreeKey } from '../_utils/ai-panel-utils';

export interface AIRunStreamState {
  /** transcript（購読・バッチ境界ごとに取り直した結果で置き換わる） */
  messages: AIMessage[];
  /** 未確定のアシスタント発言。バッチ境界で transcript に畳み込まれる */
  streamingContent: string | null;
  /** ストリームから受け取った最新の計画（未受信なら null） */
  plan: AIRunPlanItem[] | null;
  /** 切断からの再接続待機中 */
  isReconnecting: boolean;
  /**
   * リトライ中のエラー。
   * `error` チャンクは終端ではなくバックエンドが最大2回リトライするため、
   * 「失敗した」ではなく「リトライしている」として見せる。
   */
  transientError: string | null;
}

const INITIAL_STATE: AIRunStreamState = {
  messages: [],
  streamingContent: null,
  plan: null,
  isReconnecting: false,
  transientError: null,
};

/**
 * 自律Run のストリームを購読して表示状態に反映する。
 *
 * 再接続はアダプター（`adapter.runs.subscribe`）が面倒をみるため、ここでは
 * 届いたチャンクを状態へ反映するだけ。
 *
 * @param projectId - プロジェクトID（ツリー再取得に使う）
 * @param runId - 購読する Run ID。undefined の間は購読しない
 */
export function useAIRunStream(
  projectId: string,
  runId: string | undefined,
): AIRunStreamState {
  const { mutate: globalMutate } = useSWRConfig();
  const subscribe = useSubscribeAIRun(runId ?? '');
  const fetchMessages = useFetchAIRunMessages(runId ?? '');

  const [state, setState] = useState<AIRunStreamState>(INITIAL_STATE);

  /**
   * 自律Run が作ったノードは canon_status: 'draft' で即座に保存済み。
   * Run の完了を待たずにツリーへ反映する。
   */
  const revalidateContent = useCallback(
    (contentType: EditorTabType | undefined, targetId: string | undefined) => {
      if (!contentType) return;
      if (contentType === 'project') {
        void globalMutate({ type: 'project', id: projectId });
        return;
      }
      if (targetId) {
        void globalMutate(toContentItemKey(contentType, targetId));
      }
      void globalMutate(toContentTreeKey(contentType, projectId));
    },
    [globalMutate, projectId],
  );

  useEffect(() => {
    if (!runId) {
      setState(INITIAL_STATE);
      return;
    }

    setState(INITIAL_STATE);

    let cancelled = false;
    const reader = subscribe().getReader();

    /** transcript を取り直して、畳み込み済みのストリーミングテキストを捨てる */
    const resyncTranscript = async () => {
      try {
        const messages = await fetchMessages();
        if (cancelled) return;
        setState((prev) => ({ ...prev, messages, streamingContent: null }));
      } catch (e) {
        console.error('[ai-run] Failed to resync the transcript:', e);
      }
    };

    const pump = async () => {
      while (!cancelled) {
        const { done, value } = await reader.read();
        if (done || cancelled) break;

        switch (value.type) {
          // 購読開始時・再接続時のスナップショット。追記ではなく置き換える
          case 'transcript':
            setState((prev) => ({
              ...prev,
              messages: value.messages ?? [],
              streamingContent: null,
              isReconnecting: false,
              transientError: null,
            }));
            break;

          case 'text':
            setState((prev) => ({
              ...prev,
              streamingContent:
                (prev.streamingContent ?? '') + (value.content ?? ''),
              transientError: null,
            }));
            break;

          case 'plan':
            setState((prev) => ({
              ...prev,
              plan: value.plan ?? [],
              transientError: null,
            }));
            break;

          case 'run_status':
            setState((prev) => ({ ...prev, transientError: null }));
            // 進捗の累積値と一覧の表示を実際のサーバー状態に合わせる
            void globalMutate(toAIRunKey(runId));
            void globalMutate(toAIRunsKey(projectId));
            if (value.finishReason != null) {
              // 終端。最終メッセージを取り込む
              await resyncTranscript();
            }
            break;

          // バッチ境界。ここまでの発言はバックエンドに保存済みなので取り直す
          case 'usage':
            await resyncTranscript();
            break;

          case 'proposal_result':
            revalidateContent(
              value.proposalFeedback?.contentType,
              value.proposalFeedback?.targetId,
            );
            break;

          // error は終端ではない（最大2回リトライされる）
          case 'error':
            setState((prev) => ({
              ...prev,
              transientError: value.error ?? '不明なエラー',
            }));
            break;

          case 'reconnecting':
            setState((prev) => ({ ...prev, isReconnecting: true }));
            break;

          // tool_call / proposal は transcript の順序が正なので、
          // 到着順に依存した表示はしない
          default:
            break;
        }
      }
    };

    pump().catch((e) => {
      if (!cancelled) console.error('[ai-run] stream pump failed:', e);
    });

    return () => {
      cancelled = true;
      void reader.cancel().catch(() => {
        // 購読の後片付けなので失敗しても無視する
      });
    };
  }, [
    runId,
    projectId,
    subscribe,
    fetchMessages,
    globalMutate,
    revalidateContent,
  ]);

  return state;
}
