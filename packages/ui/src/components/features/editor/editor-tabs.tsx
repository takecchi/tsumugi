import { X, BookOpen, Users, StickyNote, PenLine, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';

export type EditorContentType = 'plot' | 'character' | 'memo' | 'writing' | 'project';

export interface EditorTab {
  id: string;
  name: string;
  type: EditorContentType;
  /** アクティブなタブかどうか */
  active?: boolean;
}

const contentTypeIcons: Record<EditorContentType, React.ElementType> = {
  plot: BookOpen,
  character: Users,
  memo: StickyNote,
  writing: PenLine,
  project: Settings,
};

// ─── TabItem (internal) ───

interface TabItemProps {
  tab: EditorTab;
  isActive: boolean;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onCloseOthers: (id: string) => void;
  onCloseAll: () => void;
  tabCount: number;
}

function TabItem({ tab, isActive, onSelect, onClose, onCloseOthers, onCloseAll, tabCount }: TabItemProps) {
  const Icon = contentTypeIcons[tab.type];

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose(tab.id);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          role="tab"
          tabIndex={0}
          aria-selected={isActive}
          onClick={() => onSelect(tab.id)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(tab.id); }}
          className={cn(
            'group/tab flex h-9 shrink-0 cursor-pointer items-center gap-1.5 border-r border-b-2 px-3 text-xs transition-colors',
            isActive
              ? 'border-b-primary bg-background text-foreground'
              : 'border-b-transparent bg-muted/50 text-muted-foreground hover:bg-muted',
          )}
        >
          <Icon className="size-3.5 shrink-0" />
          <span className="max-w-32 truncate">{tab.name}</span>
          <button
            type="button"
            onClick={handleClose}
            className={cn(
              'ml-1 flex size-4 items-center justify-center rounded-sm hover:bg-foreground/10',
              isActive ? 'opacity-60 hover:opacity-100' : 'opacity-0 group-hover/tab:opacity-60 group-hover/tab:hover:opacity-100',
            )}
          >
            <X className="size-3" />
          </button>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={() => onClose(tab.id)}>
          閉じる
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onCloseOthers(tab.id)} disabled={tabCount <= 1}>
          他のタブを閉じる
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => onCloseAll()}>
          すべてのタブを閉じる
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

// ─── EditorTabs (exported) ───

export interface EditorTabsProps {
  tabs: EditorTab[];
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onCloseOtherTabs: (id: string) => void;
  onCloseAllTabs: () => void;
  children: React.ReactNode;
}

export function EditorTabs({ tabs, onSelectTab, onCloseTab, onCloseOtherTabs, onCloseAllTabs, children }: EditorTabsProps) {
  if (tabs.length === 0) {
    return <div className="flex h-full flex-col">{children}</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 overflow-x-auto border-b bg-muted/30">
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            isActive={tab.active === true}
            onSelect={onSelectTab}
            onClose={onCloseTab}
            onCloseOthers={onCloseOtherTabs}
            onCloseAll={onCloseAllTabs}
            tabCount={tabs.length}
          />
        ))}
      </div>
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

