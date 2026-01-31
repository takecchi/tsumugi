import * as React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  BookOpen,
  Users,
  StickyNote,
  PenLine,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export type ContentType = 'plot' | 'character' | 'memo' | 'writing';

export interface TreeNodeData {
  id: string;
  name: string;
  type: ContentType;
  nodeType: 'file' | 'folder';
  children?: TreeNodeData[];
}

const contentTypeConfig: Record<
  ContentType,
  { label: string; icon: React.ElementType }
> = {
  plot: { label: 'プロット', icon: BookOpen },
  character: { label: '登場人物', icon: Users },
  memo: { label: 'メモ', icon: StickyNote },
  writing: { label: '執筆', icon: PenLine },
};

// ─── Internal Context ───

interface SidebarContextValue {
  selectedId?: string | null;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
}

const SidebarContext = React.createContext<SidebarContextValue>({
  expandedIds: new Set(),
  onToggleExpand: () => {
    /* Provider外では呼ばれない想定のためnoop */
  },
});

function useSidebarContext() {
  return React.useContext(SidebarContext);
}

// ─── TreeNode (internal) ───

interface TreeNodeProps {
  node: TreeNodeData;
  level: number;
  onSelect?: (node: TreeNodeData) => void;
  onDelete?: (node: TreeNodeData) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

function TreeNode({ node, level, onSelect, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: TreeNodeProps) {
  const { selectedId, expandedIds, onToggleExpand } = useSidebarContext();
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const hasChildren =
    node.nodeType === 'folder' && node.children && node.children.length > 0;
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  const handleClick = () => {
    if (node.nodeType === 'folder') {
      onToggleExpand(node.id);
    }
    onSelect?.(node);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    setDeleteDialogOpen(false);
    onDelete?.(node);
  };

  return (
    <div>
      <div className="group/node flex items-center">
        <button
          onClick={handleClick}
          className={cn(
            'flex flex-1 w-0 min-w-0 items-center gap-1 rounded-sm px-2 py-1 text-sm hover:bg-sidebar-accent',
            isSelected && 'bg-sidebar-accent text-sidebar-accent-foreground',
          )}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
        >
          {node.nodeType === 'folder' ? (
            <>
              {hasChildren ? (
                isExpanded ? (
                  <ChevronDown className="size-4 shrink-0" />
                ) : (
                  <ChevronRight className="size-4 shrink-0" />
                )
              ) : (
                <span className="w-4" />
              )}
              {isExpanded ? (
                <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
              ) : (
                <Folder className="size-4 shrink-0 text-muted-foreground" />
              )}
            </>
          ) : (
            <>
              <span className="w-4" />
              <File className="size-4 shrink-0 text-muted-foreground" />
            </>
          )}
          <span className="flex-1 w-0 truncate text-left">{node.name}</span>
        </button>
        <div className="flex shrink-0 opacity-0 group-hover/node:opacity-100">
          {onMoveUp && !isFirst && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowUp className="size-3" />
            </Button>
          )}
          {onMoveDown && !isLast && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowDown className="size-3" />
            </Button>
          )}
          {onDelete && node.nodeType === 'file' && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handleDeleteClick}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-3" />
            </Button>
          )}
        </div>
      </div>
      {node.nodeType === 'folder' && isExpanded && node.children && (
        <div>
          {node.children.map((child, index) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              onDelete={onDelete}
              isFirst={index === 0}
              isLast={index === (node.children?.length ?? 0) - 1}
            />
          ))}
        </div>
      )}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>削除の確認</DialogTitle>
            <DialogDescription>
              「{node.name}」を削除しますか？この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── SidebarSection (exported) ───

export interface SidebarSectionProps {
  type: ContentType;
  nodes: TreeNodeData[];
  onSelect?: (node: TreeNodeData) => void;
  onCreateFile?: (type: ContentType, parentId: string | null) => void;
  onDelete?: (node: TreeNodeData) => void;
  onReorder?: (parentId: string | null, orderedIds: string[]) => void;
}

function swapNodes(nodes: TreeNodeData[], index: number, direction: 'up' | 'down'): string[] {
  const ids = nodes.map((n) => n.id);
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= ids.length) return ids;
  [ids[index], ids[targetIndex]] = [ids[targetIndex], ids[index]];
  return ids;
}

export function SidebarSection({
  type,
  nodes,
  onSelect,
  onCreateFile,
  onDelete,
  onReorder,
}: SidebarSectionProps) {
  const config = contentTypeConfig[type];
  const Icon = config.icon;
  const [isExpanded, setIsExpanded] = React.useState(true);

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newIds = swapNodes(nodes, index, direction);
    onReorder?.(null, newIds);
  };

  return (
    <div className="group mb-2">
      <div className="flex items-center justify-between px-2 py-1">
        <button
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground hover:text-foreground"
        >
          {isExpanded ? (
            <ChevronDown className="size-3" />
          ) : (
            <ChevronRight className="size-3" />
          )}
          <Icon className="size-3" />
          <span>{config.label}</span>
        </button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => onCreateFile?.(type, null)}
          className="opacity-0 group-hover:opacity-100 hover:opacity-100"
        >
          <Plus className="size-3" />
        </Button>
      </div>
      {isExpanded && (
        <div>
          {nodes.map((node, index) => (
            <TreeNode
              key={node.id}
              node={node}
              level={0}
              onSelect={onSelect}
              onDelete={onDelete}
              onMoveUp={onReorder ? () => handleMove(index, 'up') : undefined}
              onMoveDown={onReorder ? () => handleMove(index, 'down') : undefined}
              isFirst={index === 0}
              isLast={index === nodes.length - 1}
            />
          ))}
          {nodes.length === 0 && (
            <p className="px-4 py-2 text-xs text-muted-foreground">
              アイテムがありません
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sidebar (exported) ───

export interface SidebarProps {
  selectedId?: string | null;
  header?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export function Sidebar({ selectedId, header, className, children }: SidebarProps) {
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());

  const handleToggleExpand = React.useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const contextValue = React.useMemo<SidebarContextValue>(
    () => ({ selectedId, expandedIds, onToggleExpand: handleToggleExpand }),
    [selectedId, expandedIds, handleToggleExpand],
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <div className={cn('flex h-full flex-col', className)}>
        <div className="min-w-0 border-b px-4 py-3">
          {header ?? <h2 className="text-sm font-semibold">プロジェクト</h2>}
        </div>
        <ScrollArea className="flex-1 overflow-hidden">
          <div className="p-2">{children}</div>
        </ScrollArea>
      </div>
    </SidebarContext.Provider>
  );
}

