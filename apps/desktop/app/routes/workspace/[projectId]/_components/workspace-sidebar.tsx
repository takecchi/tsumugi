import type { TreeNode } from '@tsumugi/adapter';
import { useNavigate } from 'react-router';
import { useWritingTree, useCreateWriting, useDeleteWritingFromTree, useReorderWritings } from '~/hooks/writings';
import { usePlotTree, useCreatePlot, useDeletePlotFromTree, useReorderPlots } from '~/hooks/plots';
import { useCharacterTree, useCreateCharacter, useDeleteCharacterFromTree, useReorderCharacters } from '~/hooks/characters';
import { useMemoTree, useCreateMemo, useDeleteMemoFromTree, useReorderMemos } from '~/hooks/memos';
import {
  Sidebar,
  SidebarSection,
  Button,
  type TreeNodeData,
  type ContentType,
} from '@tsumugi/ui';
import { ArrowLeftIcon, SettingsIcon } from 'lucide-react';

function convertTreeNodes(nodes: TreeNode[], type: ContentType): TreeNodeData[] {
  return nodes.map((node) => ({
    id: node.id,
    name: node.name,
    type,
    nodeType: node.nodeType === 'folder' ? 'folder' : 'file',
    children: node.children ? convertTreeNodes(node.children, type) : undefined,
  }));
}

function flattenTree(nodes: TreeNode[]): TreeNode[] {
  return nodes.flatMap((n) => [n, ...(n.children ? flattenTree(n.children) : [])]);
}

// ─── 汎用セクションコンポーネント ───

interface ContentSectionProps {
  type: ContentType;
  defaultName: string;
  defaultFields?: Record<string, unknown>;
  tree: TreeNode[] | undefined;
  create: (data: Record<string, unknown>) => Promise<{ id: string; name: string; nodeType: string }>;
  remove: (id: string) => Promise<unknown>;
  reorder: (arg: { parentId: string | null; orderedIds: string[] }) => Promise<unknown>;
  selectedNodeId: string | null;
  onSelectNode: (node: TreeNodeData) => void;
  onDeselectNode: () => void;
}

function ContentSection({
  type,
  defaultName,
  defaultFields,
  tree,
  create,
  remove,
  reorder,
  selectedNodeId,
  onSelectNode,
  onDeselectNode,
}: ContentSectionProps) {
  const nodes = convertTreeNodes(tree ?? [], type);

  const handleCreate = async (_type: ContentType, parentId: string | null) => {
    const newOrder = flattenTree(tree ?? []).length;
    try {
      const item = await create({
        parentId, name: defaultName, nodeType: type, order: newOrder, ...defaultFields,
      });
      onSelectNode({ id: item.id, name: item.name, type, nodeType: item.nodeType === 'folder' ? 'folder' : 'file' });
    } catch (e) {
      console.error(`Failed to create ${type}:`, e);
    }
  };

  const handleDelete = async (node: TreeNodeData) => {
    try {
      await remove(node.id);
      if (selectedNodeId === node.id) onDeselectNode();
    } catch (e) {
      console.error(`Failed to delete ${type}:`, e);
    }
  };

  const handleReorder = async (parentId: string | null, orderedIds: string[]) => {
    try {
      await reorder({ parentId, orderedIds });
    } catch (e) {
      console.error(`Failed to reorder ${type}:`, e);
    }
  };

  return <SidebarSection type={type} nodes={nodes} onSelect={onSelectNode} onCreateFile={handleCreate} onDelete={handleDelete} onReorder={handleReorder} />;
}

// ─── 各カテゴリ（hooks をバインド） ───

interface CategoryProps {
  projectId: string;
  selectedNodeId: string | null;
  onSelectNode: (node: TreeNodeData) => void;
  onDeselectNode: () => void;
}

function PlotSection({ projectId, ...rest }: CategoryProps) {
  const { data: tree } = usePlotTree(projectId);
  const { trigger: triggerCreate } = useCreatePlot(projectId);
  const { trigger: remove } = useDeletePlotFromTree(projectId);
  const { trigger: reorder } = useReorderPlots(projectId);
  const create = (data: Record<string, unknown>) => triggerCreate(data as Parameters<typeof triggerCreate>[0]);
  return <ContentSection type="plot" defaultName="新しいプロット" tree={tree} create={create} remove={remove} reorder={reorder} {...rest} />;
}

function CharacterSection({ projectId, ...rest }: CategoryProps) {
  const { data: tree } = useCharacterTree(projectId);
  const { trigger: triggerCreate } = useCreateCharacter(projectId);
  const { trigger: remove } = useDeleteCharacterFromTree(projectId);
  const { trigger: reorder } = useReorderCharacters(projectId);
  const create = (data: Record<string, unknown>) => triggerCreate(data as Parameters<typeof triggerCreate>[0]);
  return <ContentSection type="character" defaultName="新しい登場人物" tree={tree} create={create} remove={remove} reorder={reorder} {...rest} />;
}

function MemoSection({ projectId, ...rest }: CategoryProps) {
  const { data: tree } = useMemoTree(projectId);
  const { trigger: triggerCreate } = useCreateMemo(projectId);
  const { trigger: remove } = useDeleteMemoFromTree(projectId);
  const { trigger: reorder } = useReorderMemos(projectId);
  const create = (data: Record<string, unknown>) => triggerCreate(data as Parameters<typeof triggerCreate>[0]);
  return <ContentSection type="memo" defaultName="新しいメモ" defaultFields={{ content: '' }} tree={tree} create={create} remove={remove} reorder={reorder} {...rest} />;
}

function WritingSection({ projectId, ...rest }: CategoryProps) {
  const { data: tree } = useWritingTree(projectId);
  const { trigger: triggerCreate } = useCreateWriting(projectId);
  const { trigger: remove } = useDeleteWritingFromTree(projectId);
  const { trigger: reorder } = useReorderWritings(projectId);
  const create = (data: Record<string, unknown>) => triggerCreate(data as Parameters<typeof triggerCreate>[0]);
  return <ContentSection type="writing" defaultName="新しい執筆" defaultFields={{ content: '', wordCount: 0 }} tree={tree} create={create} remove={remove} reorder={reorder} {...rest} />;
}

// ─── WorkspaceSidebar ───

interface WorkspaceSidebarProps {
  projectId: string;
  projectName: string;
  selectedNodeId: string | null;
  onSelectNode: (node: TreeNodeData) => void;
  onDeselectNode: () => void;
  onSelectProject?: () => void;
}

export function WorkspaceSidebar({
  projectId,
  projectName,
  selectedNodeId,
  onSelectNode,
  onDeselectNode,
  onSelectProject,
}: WorkspaceSidebarProps) {
  const navigate = useNavigate();

  return (
    <Sidebar
      selectedId={selectedNodeId}
      header={
        <div className="flex w-full min-w-0 items-center gap-2 px-2 py-1">
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            onClick={() => navigate('/')}
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{projectName}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            onClick={onSelectProject}
          >
            <SettingsIcon className="size-4" />
          </Button>
        </div>
      }
    >
      <PlotSection projectId={projectId} selectedNodeId={selectedNodeId} onSelectNode={onSelectNode} onDeselectNode={onDeselectNode} />
      <CharacterSection projectId={projectId} selectedNodeId={selectedNodeId} onSelectNode={onSelectNode} onDeselectNode={onDeselectNode} />
      <MemoSection projectId={projectId} selectedNodeId={selectedNodeId} onSelectNode={onSelectNode} onDeselectNode={onDeselectNode} />
      <WritingSection projectId={projectId} selectedNodeId={selectedNodeId} onSelectNode={onSelectNode} onDeselectNode={onDeselectNode} />
    </Sidebar>
  );
}
