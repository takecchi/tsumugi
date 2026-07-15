import { useAdapter } from '~/hooks/useAdapter';
import useSWR, { type SWRConfiguration } from 'swr';
import useSWRMutation from 'swr/mutation';
import type {
  AIChatSession,
  AIStreamChunk,
  ConsistencyCheck,
  ConsistencyCheckSummary,
  ConsistencyFinding,
  ConsistencyStreamChunk,
  FindingStatus,
} from '@tsumugi/adapter';

interface ConsistencyChecksKey {
  type: 'consistencyChecks';
  writingId: string;
}

/**
 * 執筆ノードの矛盾チェック履歴（一覧）を取得する
 * @param writingId - 執筆ノードID
 * @param config
 */
export function useConsistencyChecks(
  writingId: string,
  config?: SWRConfiguration<ConsistencyCheckSummary[], Error>,
) {
  const adapter = useAdapter();
  return useSWR<ConsistencyCheckSummary[], Error, ConsistencyChecksKey>(
    { type: 'consistencyChecks', writingId },
    ({ writingId }) => adapter.consistency.list(writingId),
    config,
  );
}

interface ConsistencyCheckKey {
  type: 'consistencyCheck';
  checkId: string;
}

/**
 * 矛盾チェックの詳細（finding 全件）を取得する
 * @param checkId - 矛盾チェックID
 * @param config
 */
export function useConsistencyCheck(
  checkId: string,
  config?: SWRConfiguration<ConsistencyCheck, Error>,
) {
  const adapter = useAdapter();
  return useSWR<ConsistencyCheck, Error, ConsistencyCheckKey>(
    { type: 'consistencyCheck', checkId },
    ({ checkId }) => adapter.consistency.get(checkId),
    config,
  );
}

/**
 * 矛盾チェックを実行する（ストリーミング）。
 *
 * トリガーは ReadableStream を返すのみ。呼び出し側でストリームを消費し、
 * 完了後に useConsistencyChecks を `mutate` して履歴一覧を更新すること。
 * @param writingId - 執筆ノードID
 */
export function useRunConsistencyCheck(writingId: string) {
  const adapter = useAdapter();
  return useSWRMutation<
    ReadableStream<ConsistencyStreamChunk>,
    Error,
    ConsistencyChecksKey
  >(
    { type: 'consistencyChecks', writingId },
    ({ writingId }) => adapter.consistency.run(writingId),
    { revalidate: false },
  );
}

interface UpdateFindingArg {
  findingId: string;
  status: FindingStatus;
}

/**
 * 指摘（finding）のトリアージ状態を更新する
 * @param checkId - 矛盾チェックID
 * @revalidates useConsistencyCheck - 矛盾チェック詳細（finding一覧）を再フェッチする
 */
export function useUpdateFinding(checkId: string) {
  const adapter = useAdapter();
  return useSWRMutation<
    ConsistencyFinding,
    Error,
    ConsistencyCheckKey,
    UpdateFindingArg
  >({ type: 'consistencyCheck', checkId }, (_, { arg }) =>
    adapter.consistency.updateFinding(arg.findingId, arg.status),
  );
}

interface AISessionsKey {
  type: 'aiSessions';
  projectId: string;
}

/**
 * 指摘から修正セッション（write モードのチャット）を作成する。
 *
 * X-Session-Id で払い出されたセッションと AI 応答ストリームを返す。
 * @param projectId - プロジェクトID
 * @revalidates useAISessions - AIセッション一覧を再フェッチする
 */
export function useCreateFixSession(projectId: string) {
  const adapter = useAdapter();
  return useSWRMutation<
    { session: AIChatSession; stream: ReadableStream<AIStreamChunk> },
    Error,
    AISessionsKey,
    string
  >({ type: 'aiSessions', projectId }, (_, { arg: findingId }) =>
    adapter.consistency.createFixSession(findingId),
  );
}
