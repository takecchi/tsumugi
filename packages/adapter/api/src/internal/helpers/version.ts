import type {
  Commit,
  CommitDiff,
  CommitDiffEntry,
  CommitEntry,
  CommitEntryField,
  CommitList,
  DiffFieldChange,
  DiffLine,
  NodeRevision,
  NodeRevisionList,
  RestoreResult,
  TextDiff,
} from '@tsumugi/adapter';
import type {
  Commit as ApiCommit,
  CommitDiff as ApiCommitDiff,
  CommitDiffEntry as ApiCommitDiffEntry,
  CommitEntry as ApiCommitEntry,
  CommitEntryField as ApiCommitEntryField,
  CommitList as ApiCommitList,
  DiffLine as ApiDiffLine,
  FieldChange as ApiFieldChange,
  NodeRevision as ApiNodeRevision,
  NodeRevisionList as ApiNodeRevisionList,
  RestoreResult as ApiRestoreResult,
  TextDiff as ApiTextDiff,
} from '@tsumugi-chan/client';

export function toCommit(api: ApiCommit): Commit {
  return {
    id: api.id,
    projectId: api.projectId,
    parentId: api.parentId,
    message: api.message,
    commitType: api.commitType,
    addedCount: api.addedCount,
    modifiedCount: api.modifiedCount,
    removedCount: api.removedCount,
    createdAt: api.createdAt,
  };
}

export function toCommitList(api: ApiCommitList): CommitList {
  return {
    commits: api.commits.map(toCommit),
    nextCursor: api.nextCursor,
  };
}

export function toDiffFieldChange(api: ApiFieldChange): DiffFieldChange {
  return {
    field: api.field,
    oldValue: api.oldValue,
    newValue: api.newValue,
  };
}

export function toDiffLine(api: ApiDiffLine): DiffLine {
  return {
    op: api.op,
    text: api.text,
  };
}

export function toTextDiff(api: ApiTextDiff): TextDiff {
  return {
    field: api.field,
    lines: api.lines.map(toDiffLine),
  };
}

export function toCommitDiffEntry(api: ApiCommitDiffEntry): CommitDiffEntry {
  return {
    entryType: api.entryType,
    targetId: api.targetId,
    changeType: api.changeType,
    name: api.name,
    nodeType: api.nodeType,
    // added / removed では必ず空配列が返る（バックエンド仕様）
    fieldChanges: api.fieldChanges.map(toDiffFieldChange),
    textDiffs: api.textDiffs.map(toTextDiff),
  };
}

export function toCommitDiff(api: ApiCommitDiff): CommitDiff {
  return {
    baseCommitId: api.baseCommitId,
    // 未コミットの作業差分（getProjectDiff）では常に null
    commitId: api.commitId,
    entries: api.entries.map(toCommitDiffEntry),
  };
}

export function toCommitEntryField(api: ApiCommitEntryField): CommitEntryField {
  return {
    field: api.field,
    value: api.value,
  };
}

export function toCommitEntry(api: ApiCommitEntry): CommitEntry {
  return {
    entryType: api.entryType,
    targetId: api.targetId,
    name: api.name,
    nodeType: api.nodeType,
    metaFields: api.metaFields.map(toCommitEntryField),
    contentFields: api.contentFields.map(toCommitEntryField),
  };
}

export function toNodeRevision(api: ApiNodeRevision): NodeRevision {
  return {
    commitId: api.commitId,
    message: api.message,
    commitType: api.commitType,
    createdAt: api.createdAt,
    changeType: api.changeType,
  };
}

export function toNodeRevisionList(api: ApiNodeRevisionList): NodeRevisionList {
  return {
    revisions: api.revisions.map(toNodeRevision),
    nextCursor: api.nextCursor,
  };
}

export function toRestoreResult(api: ApiRestoreResult): RestoreResult {
  return {
    backupCommitId: api.backupCommitId,
    restoreCommitId: api.restoreCommitId,
  };
}
