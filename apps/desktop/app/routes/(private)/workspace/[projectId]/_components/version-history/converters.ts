import type {
  Commit,
  CommitDiffEntry,
  CommitEntry,
  NodeRevision,
} from '@tsumugi/adapter';
import type {
  CommitDiffEntryItem,
  CommitEntryContentItem,
  CommitTimelineItem,
  NodeRevisionItem,
} from '@tsumugi/ui';

export function toTimelineItem(commit: Commit): CommitTimelineItem {
  return {
    id: commit.id,
    message: commit.message,
    commitType: commit.commitType,
    addedCount: commit.addedCount,
    modifiedCount: commit.modifiedCount,
    removedCount: commit.removedCount,
    createdAt: commit.createdAt,
  };
}

export function toDiffEntryItem(entry: CommitDiffEntry): CommitDiffEntryItem {
  return {
    entryType: entry.entryType,
    targetId: entry.targetId,
    changeType: entry.changeType,
    name: entry.name,
    nodeType: entry.nodeType,
    fieldChanges: entry.fieldChanges.map((change) => ({
      field: change.field,
      oldValue: change.oldValue,
      newValue: change.newValue,
    })),
    textDiffs: entry.textDiffs.map((textDiff) => ({
      field: textDiff.field,
      lines: textDiff.lines.map((line) => ({ op: line.op, text: line.text })),
    })),
  };
}

export function toEntryContentItem(entry: CommitEntry): CommitEntryContentItem {
  return {
    metaFields: entry.metaFields.map((field) => ({
      field: field.field,
      value: field.value,
    })),
    contentFields: entry.contentFields.map((field) => ({
      field: field.field,
      value: field.value,
    })),
  };
}

export function toNodeRevisionItem(revision: NodeRevision): NodeRevisionItem {
  return {
    commitId: revision.commitId,
    message: revision.message,
    commitType: revision.commitType,
    createdAt: revision.createdAt,
    changeType: revision.changeType,
  };
}

/**
 * エントリ内容が取得できなかった場合に使う空の内容。
 * 「読み込み中」のまま止まらないようにするためのプレースホルダ。
 */
export const EMPTY_ENTRY_CONTENT: CommitEntryContentItem = {
  metaFields: [],
  contentFields: [],
};
