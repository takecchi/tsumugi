import * as React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DiffInline } from '@/components/ui/diff-highlight';
import { cn } from '@/lib/utils';
import {
  Sparkles,
  Wand2,
  ChevronDown,
  ChevronRight,
  Loader2,
} from 'lucide-react';

export type FindingSeverity = 'info' | 'warning' | 'error';
export type FindingCategory =
  | 'setting'
  | 'timeline'
  | 'character'
  | 'notation'
  | 'continuity';
export type FindingStatus = 'open' | 'dismissed' | 'resolved';

export interface ConsistencyFindingItem {
  id: string;
  severity: FindingSeverity;
  category: FindingCategory;
  quote: string;
  startLine: number | null;
  endLine: number | null;
  description: string;
  suggestion: string | null;
  status: FindingStatus;
}

export interface ConsistencyCheckHistoryItem {
  id: string;
  status: 'processing' | 'completed' | 'error';
  findingCount: number;
  summary: string | null;
  createdAt: Date;
}

export interface ConsistencyCheckPanelProps {
  findings: ConsistencyFindingItem[];
  summary?: string | null;
  isRunning?: boolean;
  onRun?: () => void;
  onUpdateFindingStatus?: (findingId: string, status: FindingStatus) => void;
  onFixFinding?: (findingId: string) => void;
  history?: ConsistencyCheckHistoryItem[];
  onSelectHistory?: (checkId: string) => void;
  className?: string;
}

const SEVERITY_META: Record<
  FindingSeverity,
  { label: string; className: string }
> = {
  error: {
    label: 'エラー',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  },
  warning: {
    label: '注意',
    className:
      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  },
  info: {
    label: '情報',
    className:
      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  },
};

const CATEGORY_LABELS: Record<FindingCategory, string> = {
  setting: '設定',
  timeline: '時系列',
  character: '人物',
  notation: '表記',
  continuity: '連続性',
};

const STATUS_OPTIONS: { value: FindingStatus; label: string }[] = [
  { value: 'open', label: '未対応' },
  { value: 'dismissed', label: '却下' },
  { value: 'resolved', label: '解決' },
];

const HISTORY_STATUS_LABELS: Record<
  ConsistencyCheckHistoryItem['status'],
  string
> = {
  processing: '実行中',
  completed: '完了',
  error: 'エラー',
};

function SeverityBadge({ severity }: { severity: FindingSeverity }) {
  const meta = SEVERITY_META[severity];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium',
        meta.className,
      )}
    >
      {meta.label}
    </span>
  );
}

function CategoryBadge({ category }: { category: FindingCategory }) {
  return (
    <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
      {CATEGORY_LABELS[category]}
    </span>
  );
}

function StatusControl({
  status,
  onChange,
}: {
  status: FindingStatus;
  onChange?: (status: FindingStatus) => void;
}) {
  return (
    <div className="inline-flex gap-1">
      {STATUS_OPTIONS.map((option) => (
        <Button
          key={option.value}
          size="xs"
          variant={status === option.value ? 'secondary' : 'ghost'}
          className={cn(status === option.value && 'font-semibold')}
          aria-pressed={status === option.value}
          onClick={() => onChange?.(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

function FindingCard({
  finding,
  onUpdateFindingStatus,
  onFixFinding,
}: {
  finding: ConsistencyFindingItem;
  onUpdateFindingStatus?: (findingId: string, status: FindingStatus) => void;
  onFixFinding?: (findingId: string) => void;
}) {
  const isDeemphasized =
    finding.status === 'dismissed' || finding.status === 'resolved';

  const hasLine = finding.startLine !== null;
  const lineLabel = hasLine
    ? `L${finding.startLine}${
        finding.endLine !== null && finding.endLine !== finding.startLine
          ? `–${finding.endLine}`
          : ''
      }`
    : null;

  return (
    <Card
      className={cn(
        'gap-3 py-3 transition-opacity',
        isDeemphasized && 'opacity-60',
      )}
    >
      <CardContent className="space-y-2 px-3">
        {/* バッジ行 */}
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={finding.severity} />
          <CategoryBadge category={finding.category} />
          {lineLabel && (
            <span className="text-xs font-medium text-muted-foreground">
              {lineLabel}
            </span>
          )}
        </div>

        {/* 該当箇所ハイライト */}
        <div className="whitespace-pre-wrap rounded border-l-2 border-border bg-muted px-2 py-1.5 font-mono text-xs">
          {finding.quote}
        </div>

        {/* 説明 */}
        <p className="whitespace-pre-wrap text-sm">{finding.description}</p>

        {/* 修正案 */}
        {finding.suggestion !== null && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">修正案</p>
            <DiffInline
              label="修正"
              oldText={finding.quote}
              newText={finding.suggestion}
            />
          </div>
        )}

        {/* フッターアクション */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <StatusControl
            status={finding.status}
            onChange={(status) => onUpdateFindingStatus?.(finding.id, status)}
          />
          <Button
            size="xs"
            variant="outline"
            onClick={() => onFixFinding?.(finding.id)}
          >
            <Wand2 className="size-3" />
            この指摘を修正
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function HistorySection({
  history,
  onSelectHistory,
}: {
  history: ConsistencyCheckHistoryItem[];
  onSelectHistory?: (checkId: string) => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="border-t">
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start rounded-none px-3"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        {open ? (
          <ChevronDown className="size-4" />
        ) : (
          <ChevronRight className="size-4" />
        )}
        <span className="text-xs font-medium">
          チェック履歴 ({history.length})
        </span>
      </Button>
      {open && (
        <div className="max-h-40 overflow-y-auto px-2 pb-2">
          <div className="space-y-1">
            {history.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                className="h-auto w-full justify-start px-2 py-1.5 text-left"
                onClick={() => onSelectHistory?.(item.id)}
              >
                <div className="flex min-w-0 flex-col">
                  <span className="text-xs font-medium">
                    {item.createdAt.toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {HISTORY_STATUS_LABELS[item.status]} ・ 指摘{' '}
                    {item.findingCount} 件
                  </span>
                </div>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ConsistencyCheckPanel({
  findings,
  summary,
  isRunning = false,
  onRun,
  onUpdateFindingStatus,
  onFixFinding,
  history,
  onSelectHistory,
  className,
}: ConsistencyCheckPanelProps) {
  const showEmptyState = findings.length === 0 && !isRunning;

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h2 className="text-sm font-semibold">矛盾チェック</h2>
        <Button size="sm" onClick={onRun} disabled={isRunning}>
          {isRunning ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {isRunning ? 'チェック中…' : 'チェック実行'}
        </Button>
      </div>

      {/* サマリー */}
      {summary && (
        <div className="border-b bg-muted/40 px-3 py-2">
          <p className="whitespace-pre-wrap text-xs text-muted-foreground">
            {summary}
          </p>
        </div>
      )}

      {/* 指摘一覧 */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 p-3">
          {isRunning && findings.length === 0 && (
            <p className="animate-pulse py-8 text-center text-sm text-muted-foreground">
              整合性をチェックしています…
            </p>
          )}
          {showEmptyState ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              矛盾は見つかりませんでした。『チェック実行』で確認できます。
            </p>
          ) : (
            findings.map((finding) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                onUpdateFindingStatus={onUpdateFindingStatus}
                onFixFinding={onFixFinding}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* 履歴 */}
      {history && history.length > 0 && (
        <HistorySection history={history} onSelectHistory={onSelectHistory} />
      )}
    </div>
  );
}
