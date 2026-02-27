import { useState } from 'react';
import { useNavigate, type MetaFunction, Link } from 'react-router';
import { useProjects, useCreateProject } from '~/hooks/projects';
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
import { PlusIcon, FolderIcon } from 'lucide-react';
import { PATH_HOME, PATH_WORKSPACE } from '~/constants/path';

export const meta: MetaFunction = () => [
  { title: 'Tsumugi - プロジェクト' },
  { name: 'description', content: 'AI-powered novel writing editor' },
];

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <h1>ようこそ</h1>
      <Button variant="link" asChild>
        <Link to={PATH_HOME}>ホームに移動</Link>
      </Button>
    </div>
  );
}
