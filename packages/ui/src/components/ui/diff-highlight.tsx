import * as React from 'react';
import { cn } from '@/lib/utils';
import { computeWordDiff, type DiffSegment } from '@/lib/diff-utils';

export interface DiffHighlightProps {
  oldText: string;
  newText: string;
  className?: string;
  showOld?: boolean;
  showNew?: boolean;
}

/**
 * 差分をハイライト表示するコンポーネント
 */
export function DiffHighlight({
  oldText,
  newText,
  className,
  showOld = true,
  showNew = true,
}: DiffHighlightProps) {
  const segments = React.useMemo(() => {
    return computeWordDiff(oldText, newText);
  }, [oldText, newText]);

  const renderSegments = (
    segments: DiffSegment[],
    showDeletes: boolean,
    showInserts: boolean,
  ) => {
    return segments
      .map((segment, index) => {
        if (segment.type === 'equal') {
          return (
            <span key={index} className="text-foreground">
              {segment.text}
            </span>
          );
        } else if (segment.type === 'delete' && showDeletes) {
          return (
            <span
              key={index}
              className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
            >
              {segment.text}
            </span>
          );
        } else if (segment.type === 'insert' && showInserts) {
          return (
            <span
              key={index}
              className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
            >
              {segment.text}
            </span>
          );
        }
        return null;
      })
      .filter(Boolean);
  };

  if (showOld && showNew) {
    // 両方表示：削除と挿入を同時に表示
    return (
      <div className={cn('whitespace-pre-wrap', className)}>
        {renderSegments(segments, true, true)}
      </div>
    );
  } else if (showOld) {
    // 旧テキストのみ：削除箇所をハイライト
    return (
      <div className={cn('whitespace-pre-wrap', className)}>
        {renderSegments(segments, true, false)}
      </div>
    );
  } else if (showNew) {
    // 新テキストのみ：挿入箇所をハイライト
    return (
      <div className={cn('whitespace-pre-wrap', className)}>
        {renderSegments(segments, false, true)}
      </div>
    );
  }

  return null;
}

/**
 * サイドバイサイド表示用のコンポーネント
 */
export function DiffSideBySide({
  oldText,
  newText,
  className,
}: {
  oldText: string;
  newText: string;
  className?: string;
}) {
  const segments = React.useMemo(() => {
    return computeWordDiff(oldText, newText);
  }, [oldText, newText]);

  const renderOldSegments = (segments: DiffSegment[]) => {
    return segments
      .map((segment, index) => {
        if (segment.type === 'equal' || segment.type === 'delete') {
          return (
            <span
              key={index}
              className={cn(
                segment.type === 'delete'
                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                  : 'text-foreground',
              )}
            >
              {segment.text}
            </span>
          );
        }
        return null;
      })
      .filter(Boolean);
  };

  const renderNewSegments = (segments: DiffSegment[]) => {
    return segments
      .map((segment, index) => {
        if (segment.type === 'equal' || segment.type === 'insert') {
          return (
            <span
              key={index}
              className={cn(
                segment.type === 'insert'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                  : 'text-foreground',
              )}
            >
              {segment.text}
            </span>
          );
        }
        return null;
      })
      .filter(Boolean);
  };

  return (
    <div className={cn('grid grid-cols-2 gap-4', className)}>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground font-medium">変更前</p>
        <div className="text-sm whitespace-pre-wrap bg-destructive/5 rounded p-2 border">
          {renderOldSegments(segments)}
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground font-medium">変更後</p>
        <div className="text-sm whitespace-pre-wrap bg-green-500/5 rounded p-2 border">
          {renderNewSegments(segments)}
        </div>
      </div>
    </div>
  );
}

/**
 * インライン差分表示（GitHubスタイル）
 */
export function DiffInline({
  label,
  oldText,
  newText,
  className,
}: {
  label?: string;
  oldText: string;
  newText: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="space-y-2">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium">
            変更前{label ? ' - ' + label : ''}
          </p>
          <div className="text-sm whitespace-pre-wrap bg-destructive/5 rounded p-2 border-l-4 border-destructive">
            <DiffHighlight
              oldText={oldText}
              newText={newText}
              showOld
              showNew={false}
            />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium">
            変更後 - {label}
          </p>
          <div className="text-sm whitespace-pre-wrap bg-green-500/5 rounded p-2 border-l-4 border-green-500">
            <DiffHighlight
              oldText={oldText}
              newText={newText}
              showOld={false}
              showNew
            />
          </div>
        </div>
      </div>
    </div>
  );
}
