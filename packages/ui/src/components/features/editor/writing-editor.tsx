import * as React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export interface WritingEditorProps {
  name?: string;
  content: string;
  onNameChange?: (name: string) => void;
  onContentChange?: (content: string) => void;
  className?: string;
  readOnly?: boolean;
}

export function WritingEditor({
  name,
  content,
  onNameChange,
  onContentChange,
  className,
  readOnly = false,
}: WritingEditorProps) {
  return (
    <div className={cn('flex h-full flex-col bg-background', className)}>
      {name !== undefined && (
        <div className="flex items-center border-b px-6 py-3">
          {onNameChange ? (
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className="w-full bg-transparent text-lg font-semibold outline-none focus:ring-1 focus:ring-ring rounded px-1"
              placeholder="タイトルを入力..."
              readOnly={readOnly}
            />
          ) : (
            <h1 className="text-lg font-semibold">{name}</h1>
          )}
        </div>
      )}
      <ScrollArea className="flex-1 overflow-hidden">
        <div className="p-6">
          <Textarea
            value={content}
            onChange={(e) => {
              if (!readOnly) {
                onContentChange?.(e.target.value);
              }
            }}
            placeholder="ここに文章を入力..."
            readOnly={readOnly}
            className={cn(
              'resize-none border-none bg-transparent text-base leading-relaxed shadow-none outline-none focus-visible:ring-0',
              readOnly && 'cursor-default',
            )}
          />
        </div>
      </ScrollArea>
      <div className="border-t px-6 py-2 text-xs text-muted-foreground">
        {content.length.toLocaleString()} 文字
      </div>
    </div>
  );
}
