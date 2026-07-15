import {
  ErrorStreamChunkFromJSON,
  FindingStreamChunkFromJSON,
  UsageStreamChunkFromJSON,
  type ConsistencyCheck as ApiConsistencyCheck,
  type ConsistencyCheckSummary as ApiConsistencyCheckSummary,
  type ConsistencyFinding as ApiConsistencyFinding,
} from '@tsumugi-chan/client';
import type {
  ConsistencyCheck,
  ConsistencyCheckSummary,
  ConsistencyFinding,
  ConsistencyStreamChunk,
} from '@tsumugi/adapter';
import { createSSEChunkStream, hasType } from './sse';

export function toConsistencyFinding(
  api: ApiConsistencyFinding,
): ConsistencyFinding {
  return {
    id: api.id,
    checkId: api.checkId,
    severity: api.severity,
    category: api.category,
    quote: api.quote,
    startLine: api.startLine,
    endLine: api.endLine,
    relatedNodeId: api.relatedNodeId,
    description: api.description,
    suggestion: api.suggestion,
    status: api.status,
    createdAt: api.createdAt,
  };
}

export function toConsistencyCheck(api: ApiConsistencyCheck): ConsistencyCheck {
  return {
    id: api.id,
    nodeId: api.nodeId,
    status: api.status,
    summary: api.summary,
    findings: api.findings.map(toConsistencyFinding),
    createdAt: api.createdAt,
  };
}

export function toConsistencyCheckSummary(
  api: ApiConsistencyCheckSummary,
): ConsistencyCheckSummary {
  return {
    id: api.id,
    nodeId: api.nodeId,
    status: api.status,
    summary: api.summary,
    findingCount: api.findingCount,
    createdAt: api.createdAt,
  };
}

/**
 * 矛盾チェック実行の v2 SSE チャンクを ConsistencyStreamChunk に正規化する。
 * start→finding×N→usage→finish。start はドメインに現れないため null。
 */
export function toConsistencyStreamChunk(
  raw: unknown,
): ConsistencyStreamChunk | null {
  if (!hasType(raw)) throw new Error('Invalid consistency SSE chunk');
  switch (raw.type) {
    case 'finding': {
      const chunk = FindingStreamChunkFromJSON(raw);
      return { type: 'finding', finding: toConsistencyFinding(chunk.finding) };
    }
    case 'usage': {
      const chunk = UsageStreamChunkFromJSON(raw);
      return { type: 'usage', usage: chunk.usage };
    }
    case 'error': {
      const chunk = ErrorStreamChunkFromJSON(raw);
      return { type: 'error', error: chunk.error };
    }
    case 'finish':
      return { type: 'done' };
    case 'start':
      return null;
  }
  return null;
}

/**
 * 矛盾チェック実行の SSE レスポンスを ReadableStream<ConsistencyStreamChunk> に変換する
 */
export function parseConsistencyStream(
  response: Response,
): ReadableStream<ConsistencyStreamChunk> {
  return createSSEChunkStream(
    response,
    toConsistencyStreamChunk,
    (message) => ({ type: 'error', error: message }),
  );
}
