import * as React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Markdown } from '@/components/ui/markdown';
import { cn } from '@/lib/utils';

export interface ContextPreviewSection {
  tier: number;
  title: string;
  content: string;
  charCount: number;
}

export interface ContextPreviewProps {
  sections: ContextPreviewSection[];
  totalCharCount: number;
  isLoading?: boolean;
  onRefresh?: () => void;
  className?: string;
}

/** これより長い本文には折りたたみトグルを表示する */
const COLLAPSE_THRESHOLD = 280;

function SectionCard({ section }: { section: ContextPreviewSection }) {
  const [expanded, setExpanded] = React.useState(false);
  const collapsible = section.content.length > COLLAPSE_THRESHOLD;

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm">{section.title}</CardTitle>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              Tier {section.tier}
            </span>
            <span className="text-xs text-muted-foreground">
              {section.charCount.toLocaleString()} 文字
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4">
        <div
          className={cn(
            'overflow-hidden break-words',
            collapsible && !expanded && 'max-h-32',
          )}
        >
          <Markdown>{section.content}</Markdown>
        </div>
        {collapsible && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="mt-1 text-xs text-muted-foreground"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? '折りたたむ' : '続きを表示'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex-1 space-y-3 p-4">
      <p className="animate-pulse text-sm text-muted-foreground">
        コンテキストを取得中...
      </p>
      {[0, 1, 2].map((index) => (
        <div key={index} className="space-y-2 rounded-xl border p-4">
          <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
          <div className="h-3 w-full animate-pulse rounded bg-muted" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

/**
 * AIが現在参照しているコンテキストを、Tier順のカード一覧で表示する。
 * 表示専用コンポーネント（データ取得は行わない）。
 */
export function ContextPreview({
  sections,
  totalCharCount,
  isLoading = false,
  onRefresh,
  className,
}: ContextPreviewProps) {
  const sortedSections = React.useMemo(
    () => [...sections].sort((a, b) => a.tier - b.tier),
    [sections],
  );

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h2 className="text-sm font-semibold">AIに見えているコンテキスト</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            合計 {totalCharCount.toLocaleString()} 文字
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn('size-3', isLoading && 'animate-spin')} />
            再取得
          </Button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : sortedSections.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
          コンテキストはありません
        </div>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-3 p-4">
            {sortedSections.map((section, index) => (
              <SectionCard
                key={`${section.tier}-${section.title}-${index}`}
                section={section}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
