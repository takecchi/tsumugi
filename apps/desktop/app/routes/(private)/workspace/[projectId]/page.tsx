import { useParams, type MetaFunction, Navigate } from 'react-router';
import { useProject } from '~/hooks/projects';
import { useEditorTabs } from '~/routes/(private)/workspace/[projectId]/_hooks/useEditorTabs';
import { WorkspaceLayout, Skeleton, EditorTabs } from '@tsumugi/ui';
import { WorkspaceSidebar } from './_components/workspace-sidebar';
import { WorkspaceEditor } from './_components/workspace-editor';
import { WorkspaceAiPanel } from './_components/workspace-ai-panel';
import { PATH_HOME } from '~/constants/path';

export const meta: MetaFunction = () => [
  { title: 'Tsumugi - ワークスペース' },
  { name: 'description', content: 'AI-powered novel writing editor' },
];

export default function WorkspacePage() {
  const { projectId: encodedProjectId } = useParams<{ projectId: string }>();
  const projectId = encodedProjectId
    ? decodeURIComponent(encodedProjectId)
    : '';

  const { data: project, isLoading: isLoadingProject } = useProject(projectId);
  const {
    selectedNode,
    openTabs,
    selectNode,
    deselectNode,
    closeTab,
    closeOtherTabs,
    closeAllTabs,
    selectTab,
    selectProjectTab,
    updateProjectTabName,
  } = useEditorTabs(projectId, project?.name ?? '');

  if (isLoadingProject) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="h-6 w-[200px]" />
          <Skeleton className="h-4 w-[140px]" />
        </div>
      </div>
    );
  }

  if (!project) {
    return <Navigate to={PATH_HOME} replace />;
  }

  return (
    <WorkspaceLayout
      sidebar={
        <WorkspaceSidebar
          projectId={projectId}
          projectName={project.name}
          selectedNodeId={selectedNode?.id ?? null}
          onSelectNode={selectNode}
          onDeselectNode={deselectNode}
          onSelectProject={selectProjectTab}
        />
      }
      editor={
        <EditorTabs
          tabs={openTabs}
          onSelectTab={selectTab}
          onCloseTab={closeTab}
          onCloseOtherTabs={closeOtherTabs}
          onCloseAllTabs={closeAllTabs}
        >
          <WorkspaceEditor
            projectId={projectId}
            selectedNode={selectedNode}
            onProjectNameChange={updateProjectTabName}
          />
        </EditorTabs>
      }
      aiPanel={<WorkspaceAiPanel projectId={projectId} openTabs={openTabs} />}
    />
  );
}
