import * as React from 'react';
import { FilePenLine, FilePlus2 } from 'lucide-react';
import { Markdown } from '@/components/ui/markdown';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { AiRunEditMessage, AiRunMessage } from './types';
import { CONTENT_TYPE_LABELS, EDIT_ACTION_LABELS } from './labels';

// ─── transcript ───

function EditMessageRow({ message }: { message: AiRunEditMessage }) {
  const typeLabel =
    CONTENT_TYPE_LABELS[message.contentType] ?? message.contentType;
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {message.action === 'create' ? (
        <FilePlus2 className="size-3.5 shrink-0" />
      ) : (
        <FilePenLine className="size-3.5 shrink-0" />
      )}
      <span className="min-w-0 truncate">
        [{typeLabel}] {message.targetName} を
        {EDIT_ACTION_LABELS[message.action]}しました
      </span>
    </div>
  );
}

export function RunTranscript({
  messages,
  streamingContent,
  isRunning,
}: {
  messages: AiRunMessage[];
  streamingContent: string | null;
  isRunning: boolean;
}) {
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const isAtBottomRef = React.useRef(true);

  React.useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const handleScroll = () => {
      const distance =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      isAtBottomRef.current = distance < 30;
    };
    viewport.addEventListener('scroll', handleScroll, { passive: true });
    return () => viewport.removeEventListener('scroll', handleScroll);
  }, []);

  React.useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !isAtBottomRef.current) return;
    viewport.scrollTop = viewport.scrollHeight;
  }, [messages, streamingContent]);

  const isEmpty = messages.length === 0 && streamingContent === null;

  return (
    <ScrollArea className="min-h-0 flex-1" viewportRef={viewportRef}>
      <div className="space-y-3 px-3 py-2">
        {isEmpty ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            {isRunning ? '実行を開始しました…' : '記録はありません'}
          </p>
        ) : (
          messages.map((message) =>
            message.kind === 'edit' ? (
              <EditMessageRow key={message.id} message={message} />
            ) : message.role === 'user' ? (
              <div
                key={message.id}
                className="w-full rounded-lg border px-3 py-1.5"
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            ) : (
              <Markdown key={message.id} className="text-sm">
                {message.content}
              </Markdown>
            ),
          )
        )}
        {streamingContent !== null && streamingContent !== '' && (
          <Markdown className="text-sm">{streamingContent}</Markdown>
        )}
        {isRunning && streamingContent === '' && (
          <p className="text-sm text-muted-foreground animate-pulse">
            考えています...
          </p>
        )}
      </div>
    </ScrollArea>
  );
}
