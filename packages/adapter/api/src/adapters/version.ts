import type {
  Commit,
  CommitDiff,
  CommitEntry,
  CommitList,
  CreateCommitResult,
  Node,
  NodeRevisionList,
  PaginationParams,
  RestoreCommitResult,
  VersionAdapter,
} from '@tsumugi/adapter';
import type { ApiClients } from '@/client';
import {
  toOptionalQueryValue,
  toPaginationQuery,
} from '@/internal/helpers/query';
import {
  isConflictError,
  isNotFoundError,
} from '@/internal/helpers/response-error';
import {
  toCommit,
  toCommitDiff,
  toCommitEntry,
  toCommitList,
  toNodeRevisionList,
  toRestoreResult,
} from '@/internal/helpers/version';
import { toNode } from '@/internal/helpers/node';

export function createVersionAdapter(clients: ApiClients): VersionAdapter {
  return {
    async createCommit(
      projectId: string,
      message: string,
    ): Promise<CreateCommitResult> {
      try {
        const commit = await clients.projects.createCommit({
          projectId,
          createCommitRequest: { message },
        });
        return { status: 'created', commit: toCommit(commit) };
      } catch (e: unknown) {
        // 409 は「前回コミットから変更がない」という正常系
        if (isConflictError(e)) return { status: 'no_changes' };
        throw e;
      }
    },

    async listCommits(
      projectId: string,
      params?: PaginationParams,
    ): Promise<CommitList> {
      const list = await clients.projects.getCommits({
        projectId,
        ...toPaginationQuery(params),
      });
      return toCommitList(list);
    },

    async getCommit(commitId: string): Promise<Commit | null> {
      try {
        const commit = await clients.commits.getCommit({ commitId });
        return toCommit(commit);
      } catch (e: unknown) {
        if (isNotFoundError(e)) return null;
        throw e;
      }
    },

    async getCommitDiff(
      commitId: string,
      baseCommitId?: string,
    ): Promise<CommitDiff> {
      const diff = await clients.commits.getCommitDiff({
        commitId,
        baseCommitId: toOptionalQueryValue(baseCommitId),
      });
      return toCommitDiff(diff);
    },

    async getProjectDiff(
      projectId: string,
      baseCommitId?: string,
    ): Promise<CommitDiff> {
      const diff = await clients.projects.getProjectDiff({
        projectId,
        baseCommitId: toOptionalQueryValue(baseCommitId),
      });
      return toCommitDiff(diff);
    },

    async getCommitEntry(
      commitId: string,
      targetId: string,
    ): Promise<CommitEntry | null> {
      try {
        const entry = await clients.commits.getCommitEntry({
          commitId,
          targetId,
        });
        return toCommitEntry(entry);
      } catch (e: unknown) {
        if (isNotFoundError(e)) return null;
        throw e;
      }
    },

    async restoreCommit(commitId: string): Promise<RestoreCommitResult> {
      try {
        const result = await clients.commits.restoreCommit({ commitId });
        return { status: 'restored', result: toRestoreResult(result) };
      } catch (e: unknown) {
        // 409 は「現在の状態が復元先と完全一致」という正常系
        if (isConflictError(e)) return { status: 'already_at_commit' };
        throw e;
      }
    },

    async listNodeRevisions(
      nodeId: string,
      params?: PaginationParams,
    ): Promise<NodeRevisionList> {
      const list = await clients.nodes.getNodeRevisions({
        nodeId,
        ...toPaginationQuery(params),
      });
      return toNodeRevisionList(list);
    },

    async restoreNode(nodeId: string, commitId: string): Promise<Node> {
      const node = await clients.nodes.restoreNode({
        nodeId,
        restoreNodeRequest: { commitId },
      });
      return toNode(node);
    },
  };
}
