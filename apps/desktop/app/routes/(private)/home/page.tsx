import { useState } from 'react';
import { useNavigate, type MetaFunction } from 'react-router';
import { useProjects, useCreateProject } from '~/hooks/projects';
import { useLogout } from '~/hooks/auth';
import {
  ProjectList,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@tsumugi/ui';
import type { ProjectItem } from '@tsumugi/ui';
import { PlusIcon, FolderIcon, LogOutIcon } from 'lucide-react';
import { PATH_WORKSPACE } from '~/constants/path';

export const meta: MetaFunction = () => [
  { title: 'Tsumugi - プロジェクト一覧' },
];

const isApiAdapter = import.meta.env.VITE_ADAPTER === 'api';

function toProjectItems(
  projects: { id: string; name: string }[] | undefined,
): ProjectItem[] {
  if (!projects) return [];
  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    path: isApiAdapter ? '' : p.id.replace(/^\/Users\/[^/]+/, '~'),
  }));
}

export default function Page() {
  const navigate = useNavigate();
  const { data: projects, isLoading } = useProjects();
  const { trigger: createProject, isMutating: isCreating } = useCreateProject();
  const { trigger: logout, isMutating: isLoggingOut } = useLogout();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('untitled');
  const [error, setError] = useState<string | null>(null);

  const defaultWorkDir = '~/TsumugiProjects';

  const handleOpenCreateDialog = () => {
    setNewProjectTitle('untitled');
    setError(null);
    setIsCreateDialogOpen(true);
  };

  const handleCreateProject = async () => {
    if (!newProjectTitle.trim()) return;

    try {
      setError(null);
      const project = await createProject({
        name: newProjectTitle.trim(),
      });
      if (project) {
        setIsCreateDialogOpen(false);
        setNewProjectTitle('untitled');
        await navigate(`${PATH_WORKSPACE}/${encodeURIComponent(project.id)}`);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      setError(`プロジェクトの作成に失敗しました: ${errorMessage}`);
    }
  };

  const handleSelectProject = (project: ProjectItem) => {
    navigate(`${PATH_WORKSPACE}/${encodeURIComponent(project.id)}`);
  };

  return (
    <div className="flex min-h-screen justify-center bg-background">
      <div className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-4xl">
          {/* ヘッダー */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/icon-512.png"
                alt="Tsumugi"
                className="size-8 rounded-lg"
              />
              <div>
                <h1 className="text-lg font-bold text-foreground">Tsumugi</h1>
                <p className="text-xs text-muted-foreground">
                  AI小説執筆エディタ
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void logout()}
              disabled={isLoggingOut}
            >
              <LogOutIcon className="mr-2 size-4" />
              {isLoggingOut ? 'ログアウト中...' : 'ログアウト'}
            </Button>
          </div>
          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-lg font-semibold">プロジェクト</h2>
              <Button size="sm" onClick={handleOpenCreateDialog}>
                <PlusIcon className="mr-1.5 size-4" />
                新規プロジェクト
              </Button>
            </div>
            <ProjectList
              projects={toProjectItems(projects)}
              isLoading={isLoading}
              onSelect={handleSelectProject}
            />
          </div>
        </div>
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>新規プロジェクト</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="title" className="text-sm font-medium">
                タイトル
              </label>
              <Input
                id="title"
                value={newProjectTitle}
                onChange={(e) => setNewProjectTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateProject();
                }}
              />
            </div>
            {!isApiAdapter && (
              <div className="grid gap-2">
                <span className="text-sm font-medium">場所</span>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FolderIcon className="size-4" />
                  <span>
                    {defaultWorkDir}/{newProjectTitle.trim()}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={handleCreateProject}
              disabled={!newProjectTitle.trim() || isCreating}
            >
              {isCreating ? '作成中...' : '作成'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
