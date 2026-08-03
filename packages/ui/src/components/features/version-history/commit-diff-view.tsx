import * as React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Eye, Loader2 } from 'lucide-react';
import {
  buildDiffRows,
  countDiffLineOps,
  type DiffChangeTypeValue,
  type DiffLineOpValue,
  type RevisionEntryTypeValue,
} from '@/lib/version-history-utils';
import { ChangeTypeBadge, entryKindLabel, fieldLabel } from './version-badges';

/** 短い属性フィールドの before/after */
export interface DiffFieldChangeItem {
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

/** 行差分の 1 行 */
export interface DiffLineItem {
  op: DiffLineOpValue;
  text: string;
}

/** 長文フィールドの行単位差分 */
export interface TextDiffItem {
  field: string;
  lines: DiffLineItem[];
}

/** 差分エントリ（変更対象 1 件分） */
export interface CommitDiffEntryItem {
  entryType: RevisionEntryTypeValue;
  targetId: string;
  changeType: DiffChangeTypeValue;
  name: string;
  nodeType: string | null;
  /** 短い属性の before/after。added / removed では空配列 */
  fieldChanges: DiffFieldChangeItem[];
  /** 長文の行単位差分。added / removed では空配列 */
  textDiffs: TextDiffItem[];
}

/** コミット時点のエントリのスナップショット（added / removed の中身表示用） */
export interface CommitEntryContentItem {
  metaFields: { field: string; value: string | null }[];
  contentFields: { field: string; value: string | null }[];
}

export interface CommitDiffViewProps {
  entries: CommitDiffEntryItem[];
  /** 見出し（例: コミットメッセージ、「未コミットの変更」） */
  title?: string;
  /** 補足行（例: 比較元コミット） */
  subtitle?: string | null;
  isLoading?: boolean;
  /**
   * added / removed エントリの中身を取得する。
   * 差分APIは追加・削除された本文を返さないため、別途取得が必要。
   */
  onShowEntryContent?: (targetId: string) => void;
  /** 取得済みのエントリ内容（targetId をキーにする） */
  entryContents?: Record<string, CommitEntryContentItem | undefined>;
  /** 内容を取得中のエントリID */
  loadingEntryIds?: string[];
  /** 空のときに出すメッセージ */
  emptyMessage?: string;
  className?: string;
}

const LINE_OP_META: Record<
  DiffLineOpValue,
  { symbol: string; rowClassName: string }
> = {
  eq: { symbol: ' ', rowClassName: '' },
  add: {
    symbol: '+',
    rowClassName:
      'bg-green-50 text-green-900 dark:bg-green-950/40 dark:text-green-200',
  },
  del: {
    symbol: '−',
    rowClassName: 'bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200',
  },
};

function FieldChangeRow({ change }: { change: DiffFieldChangeItem }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">
        {fieldLabel(change.field)}
      </p>
      <div className="grid gap-1 sm:grid-cols-2">
        <div className="min-w-0 rounded border-l-2 border-destructive bg-red-50 px-2 py-1 dark:bg-red-950/30">
          <p className="text-[10px] text-muted-foreground">変更前</p>
          <p className="break-words whitespace-pre-wrap text-xs">
            {change.oldValue ?? (
              <span className="text-muted-foreground">（なし）</span>
            )}
          </p>
        </div>
        <div className="min-w-0 rounded border-l-2 border-green-500 bg-green-50 px-2 py-1 dark:bg-green-950/30">
          <p className="text-[10px] text-muted-foreground">変更後</p>
          <p className="break-words whitespace-pre-wrap text-xs">
            {change.newValue ?? (
              <span className="text-muted-foreground">（なし）</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function TextDiffBlock({ textDiff }: { textDiff: TextDiffItem }) {
  const rows = React.useMemo(
    () => buildDiffRows(textDiff.lines),
    [textDiff.lines],
  );
  const { added, removed } = React.useMemo(
    () => countDiffLineOps(textDiff.lines),
    [textDiff.lines],
  );

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          {fieldLabel(textDiff.field)}
        </p>
        <p className="font-mono text-[10px] text-muted-foreground">
          <span className="text-green-600 dark:text-green-400">+{added}</span>{' '}
          <span className="text-destructive">−{removed}</span>
        </p>
      </div>
      <div className="overflow-hidden rounded border font-mono text-xs">
        {rows.map((row, index) =>
          row.kind === 'gap' ? (
            <div
              key={`gap-${index}`}
              className="bg-muted/60 px-2 py-0.5 text-center text-[10px] text-muted-foreground"
            >
              … 変更のない {row.hiddenCount} 行を省略
            </div>
          ) : (
            <div
              key={`line-${index}`}
              className={cn(
                'flex gap-2 px-2',
                LINE_OP_META[row.op].rowClassName,
              )}
            >
              <span
                aria-hidden
                className="w-8 shrink-0 select-none text-right text-muted-foreground"
              >
                {row.oldLineNumber ?? ''}
              </span>
              <span
                aria-hidden
                className="w-8 shrink-0 select-none text-right text-muted-foreground"
              >
                {row.newLineNumber ?? ''}
              </span>
              <span aria-hidden className="w-2 shrink-0 select-none">
                {LINE_OP_META[row.op].symbol}
              </span>
              <span className="min-w-0 break-words whitespace-pre-wrap">
                {row.text === '' ? ' ' : row.text}
              </span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function EntryContentBlock({ content }: { content: CommitEntryContentItem }) {
  const fields = [...content.metaFields, ...content.contentFields].filter(
    (field) => field.value !== null && field.value !== '',
  );

  if (fields.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        表示できる内容がありません。
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {fields.map((field) => (
        <div key={field.field} className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            {fieldLabel(field.field)}
          </p>
          <p className="break-words whitespace-pre-wrap rounded bg-muted px-2 py-1 font-mono text-xs">
            {field.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function DiffEntryCard({
  entry,
  content,
  isLoadingContent,
  onShowEntryContent,
}: {
  entry: CommitDiffEntryItem;
  content: CommitEntryContentItem | undefined;
  isLoadingContent: boolean;
  onShowEntryContent?: (targetId: string) => void;
}) {
  // added / removed では差分APIが中身を返さないため、別途取得して見せる
  const needsContentFetch =
    entry.changeType !== 'modified' && onShowEntryContent !== undefined;
  const hasDiffBody =
    entry.fieldChanges.length > 0 || entry.textDiffs.length > 0;

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <ChangeTypeBadge changeType={entry.changeType} />
        <span className="inline-flex shrink-0 items-center rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
          {entryKindLabel(entry.entryType, entry.nodeType)}
        </span>
        <span className="min-w-0 truncate text-sm font-medium">
          {entry.name}
        </span>
      </div>

      {entry.fieldChanges.length > 0 && (
        <div className="space-y-2">
          {entry.fieldChanges.map((change) => (
            <FieldChangeRow key={change.field} change={change} />
          ))}
        </div>
      )}

      {entry.textDiffs.map((textDiff) => (
        <TextDiffBlock key={textDiff.field} textDiff={textDiff} />
      ))}

      {!hasDiffBody && (
        <div className="space-y-2">
          {content ? (
            <EntryContentBlock content={content} />
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {entry.changeType === 'added'
                  ? 'このエントリの中身は差分に含まれません。'
                  : 'このエントリは削除されました。削除前の中身は差分に含まれません。'}
              </p>
              {needsContentFetch && (
                <Button
                  size="xs"
                  variant="outline"
                  disabled={isLoadingContent}
                  onClick={() => onShowEntryContent?.(entry.targetId)}
                >
                  {isLoadingContent ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Eye className="size-3" />
                  )}
                  中身を表示
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * コミット差分（または未コミットの作業差分）を表示する。
 * 差分はバックエンドで計算済みのものをそのまま描画する（表示専用コンポーネント）。
 */
export function CommitDiffView({
  entries,
  title,
  subtitle,
  isLoading = false,
  onShowEntryContent,
  entryContents,
  loadingEntryIds,
  emptyMessage = '変更はありません。',
  className,
}: CommitDiffViewProps) {
  const loadingIds = React.useMemo(
    () => new Set(loadingEntryIds ?? []),
    [loadingEntryIds],
  );

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      {(title !== undefined || subtitle) && (
        <div className="shrink-0 border-b px-3 py-2">
          {title !== undefined && (
            <h3 className="truncate text-sm font-semibold">{title}</h3>
          )}
          {subtitle && (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      )}
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 p-3">
          {isLoading ? (
            <p className="animate-pulse py-8 text-center text-sm text-muted-foreground">
              差分を読み込んでいます…
            </p>
          ) : entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </p>
          ) : (
            entries.map((entry) => (
              <DiffEntryCard
                key={`${entry.entryType}-${entry.targetId}`}
                entry={entry}
                content={entryContents?.[entry.targetId]}
                isLoadingContent={loadingIds.has(entry.targetId)}
                onShowEntryContent={onShowEntryContent}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
