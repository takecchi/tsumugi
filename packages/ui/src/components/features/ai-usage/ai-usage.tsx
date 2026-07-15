import * as React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface AIUsageSessionItem {
  sessionId: string;
  title: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AIUsageTotal {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AIUsageProps {
  sessions: AIUsageSessionItem[];
  total: AIUsageTotal;
  isLoading?: boolean;
  onRefresh?: () => void;
  className?: string;
}

function TokenStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-medium text-muted-foreground">
        {label}
      </span>
      <span className="text-sm tabular-nums">{value.toLocaleString()}</span>
    </div>
  );
}

/**
 * プロジェクトのAIトークン使用量を、合計＋セッション別に表示する。
 * 表示専用コンポーネント（データ取得は行わない）。
 */
export function AIUsage({
  sessions,
  total,
  isLoading = false,
  onRefresh,
  className,
}: AIUsageProps) {
  const sortedSessions = React.useMemo(
    () => [...sessions].sort((a, b) => b.totalTokens - a.totalTokens),
    [sessions],
  );

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h2 className="text-sm font-semibold">トークン使用量</h2>
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

      <div className="border-b bg-muted/30 px-4 py-3">
        <p className="mb-1 text-xs font-medium text-muted-foreground">
          プロジェクト合計
        </p>
        <div className="flex items-end gap-6">
          <div className="flex flex-col">
            <span className="text-2xl font-semibold tabular-nums">
              {total.totalTokens.toLocaleString()}
            </span>
            <span className="text-[10px] text-muted-foreground">
              合計トークン
            </span>
          </div>
          <TokenStat label="入力" value={total.promptTokens} />
          <TokenStat label="出力" value={total.completionTokens} />
        </div>
      </div>

      {sortedSessions.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
          使用量の記録はまだありません
        </div>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-2 p-4">
            {sortedSessions.map((session) => (
              <Card key={session.sessionId} className="gap-2 py-3">
                <CardHeader className="px-4">
                  <CardTitle className="truncate text-sm">
                    {session.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex gap-6 px-4">
                  <TokenStat label="合計" value={session.totalTokens} />
                  <TokenStat label="入力" value={session.promptTokens} />
                  <TokenStat label="出力" value={session.completionTokens} />
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
