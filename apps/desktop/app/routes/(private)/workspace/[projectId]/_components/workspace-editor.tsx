import type { SelectedNode } from '~/routes/(private)/workspace/[projectId]/_hooks/useEditorTabs';
import { WritingEditorWrapper } from './editors/writing-editor-wrapper';
import { PlotEditorWrapper } from './editors/plot-editor-wrapper';
import { CharacterEditorWrapper } from './editors/character-editor-wrapper';
import { MemoEditorWrapper } from './editors/memo-editor-wrapper';
import { ProjectEditorWrapper } from './editors/project-editor-wrapper';

interface WorkspaceEditorProps {
  projectId: string;
  selectedNode: SelectedNode | null;
  onProjectNameChange?: (name: string) => void;
}

export function WorkspaceEditor({ projectId, selectedNode, onProjectNameChange }: WorkspaceEditorProps) {
  if (!selectedNode) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">左のサイドバーからファイルを選択してください</p>
      </div>
    );
  }

  if (selectedNode.type === 'project') {
    return <ProjectEditorWrapper projectId={projectId} onNameChange={onProjectNameChange} />;
  }

  if (selectedNode.nodeType !== 'file') {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">左のサイドバーからファイルを選択してください</p>
      </div>
    );
  }

  switch (selectedNode.type) {
    case 'writing':
      return <WritingEditorWrapper id={selectedNode.id} projectId={projectId} />;
    case 'plot':
      return <PlotEditorWrapper id={selectedNode.id} projectId={projectId} />;
    case 'character':
      return <CharacterEditorWrapper id={selectedNode.id} projectId={projectId} />;
    case 'memo':
      return <MemoEditorWrapper id={selectedNode.id} projectId={projectId} />;
  }
}
