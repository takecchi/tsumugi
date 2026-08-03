import * as React from 'react';
import { Bot, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { AiModelOption } from '@/components/features/ai-panel/ai-panel';
import type { AiRunSummary } from './types';
import { StatusBadge } from './ai-run-parts';

export function RunSelector({
  runs,
  currentRunId,
  onSelectRun,
}: {
  runs: AiRunSummary[];
  currentRunId?: string;
  onSelectRun?: (runId: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const current = runs.find((run) => run.id === currentRunId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 min-w-0 gap-1 px-2 text-xs"
        >
          <span className="truncate">
            {current ? current.goal : '実行履歴'}
          </span>
          <ChevronDown className="size-3 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-1">
        {runs.length === 0 ? (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">
            実行履歴はありません
          </p>
        ) : (
          <ScrollArea className="h-64">
            <div className="space-y-0.5">
              {runs.map((run) => (
                <button
                  key={run.id}
                  type="button"
                  className={cn(
                    'flex w-full items-start gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-accent',
                    run.id === currentRunId && 'bg-accent',
                  )}
                  onClick={() => {
                    onSelectRun?.(run.id);
                    setOpen(false);
                  }}
                >
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2">{run.goal}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {run.createdAt.toLocaleString()}
                    </span>
                  </span>
                  <StatusBadge status={run.status} />
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function ModelSelector({
  models,
  model,
  onModelChange,
}: {
  models: AiModelOption[];
  model?: string;
  onModelChange: (model: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const current = models.find((m) => m.value === model);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs"
        >
          <Bot className="size-3" />
          {current?.label ?? 'モデル既定'}
          <ChevronDown className="size-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 p-1">
        <div className="space-y-0.5">
          {models.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={option.value === model ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 w-full justify-start gap-2 px-2 text-xs"
              onClick={() => {
                onModelChange(option.value);
                setOpen(false);
              }}
            >
              {option.value === model ? (
                <Check className="size-3" />
              ) : (
                <span className="size-3" />
              )}
              {option.label}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
