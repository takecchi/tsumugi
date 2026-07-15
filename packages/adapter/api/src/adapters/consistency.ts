import type {
  AIChatSession,
  AIStreamChunk,
  ConsistencyAdapter,
  ConsistencyCheck,
  ConsistencyCheckSummary,
  ConsistencyFinding,
  ConsistencyStreamChunk,
  FindingStatus,
} from '@tsumugi/adapter';
import type { ApiClients } from '@/client';
import { fetchSSE, parseSSEStream } from '@/internal/helpers/sse';
import {
  parseConsistencyStream,
  toConsistencyCheck,
  toConsistencyCheckSummary,
  toConsistencyFinding,
} from '@/internal/helpers/consistency';
import { toSession } from '@/adapters/ai';

export function createConsistencyAdapter(
  clients: ApiClients,
): ConsistencyAdapter {
  return {
    async run(
      writingId: string,
    ): Promise<ReadableStream<ConsistencyStreamChunk>> {
      const opts = await clients.writings.runConsistencyCheckRequestOpts({
        writingId,
      });
      const response = await fetchSSE(clients.configuration, opts);
      return parseConsistencyStream(response);
    },

    async list(writingId: string): Promise<ConsistencyCheckSummary[]> {
      const checks = await clients.writings.getConsistencyChecks({ writingId });
      return checks.map(toConsistencyCheckSummary);
    },

    async get(checkId: string): Promise<ConsistencyCheck> {
      const check = await clients.consistency.getConsistencyCheck({ checkId });
      return toConsistencyCheck(check);
    },

    async updateFinding(
      findingId: string,
      status: FindingStatus,
    ): Promise<ConsistencyFinding> {
      const finding = await clients.consistency.updateConsistencyFinding({
        findingId,
        updateFindingRequest: { status },
      });
      return toConsistencyFinding(finding);
    },

    async createFixSession(findingId: string): Promise<{
      session: AIChatSession;
      stream: ReadableStream<AIStreamChunk>;
    }> {
      const opts = await clients.consistency.createFindingFixSessionRequestOpts(
        {
          findingId,
        },
      );
      const response = await fetchSSE(clients.configuration, opts);

      const newSessionId = response.headers.get('X-Session-Id');
      if (!newSessionId) {
        throw new Error(
          'X-Session-Id header not found in createFixSession response',
        );
      }

      const stream = parseSSEStream(response);
      const session = await clients.ai.getAISession({
        sessionId: newSessionId,
      });

      return {
        session: toSession(session),
        stream,
      };
    },
  };
}
