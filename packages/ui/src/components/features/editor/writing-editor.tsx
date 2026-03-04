import * as React from 'react';
import { Pilcrow, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { isIMEActive } from '@/lib/keyboard-utils';
import { cn } from '@/lib/utils';
import {
  formatWritingText,
  DEFAULT_FORMAT_OPTIONS,
  type FormatOptions,
} from '@/lib/writing-format';

export interface WritingEditorProps {
  name?: string;
  content: string;
  onNameChange?: (name: string) => void;
  onContentChange?: (content: string) => void;
  className?: string;
  readOnly?: boolean;
  formatOptions?: FormatOptions;
  onFormatOptionsChange?: (options: FormatOptions) => void;
}

export function WritingEditor({
  name,
  content,
  onNameChange,
  onContentChange,
  className,
  readOnly = false,
  formatOptions,
  onFormatOptionsChange,
}: WritingEditorProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [localFormatOptions, setLocalFormatOptions] =
    React.useState<FormatOptions>(formatOptions ?? DEFAULT_FORMAT_OPTIONS);

  const currentOptions = formatOptions ?? localFormatOptions;
  const handleOptionsChange = React.useCallback(
    (opts: FormatOptions) => {
      setLocalFormatOptions(opts);
      onFormatOptionsChange?.(opts);
    },
    [onFormatOptionsChange],
  );

  const handleFormat = React.useCallback(() => {
    if (readOnly || !onContentChange) return;
    const textarea = textareaRef.current;
    const cursorPos = textarea?.selectionStart ?? 0;
    const result = formatWritingText(content, cursorPos, currentOptions);
    if (result.text !== content) {
      onContentChange(result.text);
      requestAnimationFrame(() => {
        if (textarea) {
          textarea.selectionStart = result.cursorPosition;
          textarea.selectionEnd = result.cursorPosition;
        }
      });
    }
  }, [content, currentOptions, onContentChange, readOnly]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (isIMEActive(e)) return;
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        handleFormat();
      }
    },
    [handleFormat],
  );

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
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              if (!readOnly) {
                onContentChange?.(e.target.value);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="ここに文章を入力..."
            readOnly={readOnly}
            className={cn(
              'resize-none border-none bg-transparent text-base leading-relaxed shadow-none outline-none focus-visible:ring-0',
              readOnly && 'cursor-default',
            )}
          />
        </div>
      </ScrollArea>
      <div className="flex items-center justify-between border-t px-4 py-1.5 text-xs text-muted-foreground">
        {!readOnly && (
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleFormat}
                  aria-label="テキストを整形"
                >
                  <Pilcrow className="size-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>テキストを整形 (⌃⇧F)</TooltipContent>
            </Tooltip>
            <FormatOptionsPopover
              options={currentOptions}
              onChange={handleOptionsChange}
            />
          </div>
        )}
        {readOnly && <div />}
        <span>{content.length.toLocaleString()} 文字</span>
      </div>
    </div>
  );
}

function FormatOptionsPopover({
  options,
  onChange,
}: {
  options: FormatOptions;
  onChange: (options: FormatOptions) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label="整形オプション">
          <ChevronDown className="size-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2" align="start" side="top">
        <p className="px-2 py-1 text-xs font-medium">整形オプション</p>
        <div className="mt-1 space-y-0.5">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-accent"
            onClick={() =>
              onChange({ ...options, autoIndent: !options.autoIndent })
            }
          >
            <span>一字下げ</span>
            <span
              className={cn(
                'text-xs',
                options.autoIndent
                  ? 'text-foreground'
                  : 'text-muted-foreground',
              )}
            >
              {options.autoIndent ? 'ON' : 'OFF'}
            </span>
          </button>
          <button
            type="button"
            className={cn(
              'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-accent',
              !options.autoIndent && 'opacity-50 pointer-events-none',
            )}
            onClick={() =>
              onChange({
                ...options,
                skipDialogueIndent: !options.skipDialogueIndent,
              })
            }
            disabled={!options.autoIndent}
          >
            <span>会話文をスキップ</span>
            <span
              className={cn(
                'text-xs',
                options.skipDialogueIndent && options.autoIndent
                  ? 'text-foreground'
                  : 'text-muted-foreground',
              )}
            >
              {options.skipDialogueIndent ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
