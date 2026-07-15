import { useCallback, useEffect, useState } from 'react';
import {
  ConsistencyCheckPanel,
  type ConsistencyCheckHistoryItem,
  type ConsistencyFindingItem,
  type FindingStatus,
} from '@tsumugi/ui';
import {
  useConsistencyCheck,
  useConsistencyChecks,
  useCreateFixSession,
  useRunConsistencyCheck,
  useUpdateFinding,
} from '~/hooks/consistency';
import type {
  ConsistencyCheckSummary,
  ConsistencyFinding,
} from '@tsumugi/adapter';

function toFindingItem(f: ConsistencyFinding): ConsistencyFindingItem {
  return {
    id: f.id,
    severity: f.severity,
    category: f.category,
    quote: f.quote,
    startLine: f.startLine,
    endLine: f.endLine,
    description: f.description,
    suggestion: f.suggestion,
    status: f.status,
  };
}

function toHistoryItem(
  c: ConsistencyCheckSummary,
): ConsistencyCheckHistoryItem {
  return {
    id: c.id,
    status: c.status,
    findingCount: c.findingCount,
    summary: c.summary,
    createdAt: c.createdAt,
  };
}

/**
 * 履歴から選択された矛盾チェックの詳細をロードし、親に findings を引き上げる。
 * checkId が確定してからマウントされる（条件付きレンダリング）。
 */
function HistoryFindingsLoader({
  checkId,
  onLoaded,
}: {
  checkId: string;
  onLoaded: (
    findings: ConsistencyFindingItem[],
    summary: string | null,
  ) => void;
}) {
  const { data } = useConsistencyCheck(checkId);
  useEffect(() => {
    if (data) onLoaded(data.findings.map(toFindingItem), data.summary);
  }, [data, onLoaded]);
  return null;
}

interface ConsistencyPanelWrapperProps {
  writingId: string;
  projectId: string;
}

export function ConsistencyPanelWrapper({
  writingId,
  projectId,
}: ConsistencyPanelWrapperProps) {
  const { data: history, mutate: mutateHistory } =
    useConsistencyChecks(writingId);
  const { trigger: triggerRun } = useRunConsistencyCheck(writingId);
  const { trigger: triggerFix } = useCreateFixSession(projectId);
  // updateFinding は findingId のみで動作する。checkId はキャッシュ再検証用のバインドに使うだけ。
  const { trigger: triggerUpdateFinding } = useUpdateFinding(writingId);

  const [findings, setFindings] = useState<ConsistencyFindingItem[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [historyCheckId, setHistoryCheckId] = useState<string | null>(null);

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setHistoryCheckId(null);
    setFindings([]);
    setSummary(null);
    try {
      const stream = await triggerRun();
      const reader = stream.getReader();
      const collected: ConsistencyFindingItem[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value.type === 'finding' && value.finding) {
          collected.push(toFindingItem(value.finding));
          setFindings([...collected]);
        } else if (value.type === 'error') {
          console.error('[consistency] stream error:', value.error);
        }
      }
      await mutateHistory();
    } catch (e) {
      console.error('[consistency] run failed:', e);
    } finally {
      setIsRunning(false);
    }
  }, [triggerRun, mutateHistory]);

  const handleUpdateStatus = useCallback(
    async (findingId: string, status: FindingStatus) => {
      setFindings((prev) =>
        prev.map((f) => (f.id === findingId ? { ...f, status } : f)),
      );
      try {
        await triggerUpdateFinding({ findingId, status });
      } catch (e) {
        console.error('[consistency] update finding failed:', e);
      }
    },
    [triggerUpdateFinding],
  );

  const handleFix = useCallback(
    async (findingId: string) => {
      try {
        const { stream } = await triggerFix(findingId);
        // ストリームを消費して修正ターンを処理させる（メッセージはバックエンドに保存され、
        // AIパネルの会話一覧に新しい修正セッションとして現れる）。
        const reader = stream.getReader();
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }
      } catch (e) {
        console.error('[consistency] create fix session failed:', e);
      }
    },
    [triggerFix],
  );

  const handleSelectHistory = useCallback((checkId: string) => {
    setIsRunning(false);
    setHistoryCheckId(checkId);
  }, []);

  const handleHistoryLoaded = useCallback(
    (loaded: ConsistencyFindingItem[], loadedSummary: string | null) => {
      setFindings(loaded);
      setSummary(loadedSummary);
    },
    [],
  );

  const historyItems: ConsistencyCheckHistoryItem[] = (history ?? []).map(
    toHistoryItem,
  );

  return (
    <>
      {historyCheckId && !isRunning && (
        <HistoryFindingsLoader
          checkId={historyCheckId}
          onLoaded={handleHistoryLoaded}
        />
      )}
      <ConsistencyCheckPanel
        findings={findings}
        summary={summary}
        isRunning={isRunning}
        onRun={handleRun}
        onUpdateFindingStatus={handleUpdateStatus}
        onFixFinding={handleFix}
        history={historyItems}
        onSelectHistory={handleSelectHistory}
      />
    </>
  );
}
