import { useCallback } from 'react';
import { useProject, useUpdateProject } from '~/hooks/projects';
import { ProjectEditor, type ProjectEditorData } from '@tsumugi/ui';
import { useDebouncedSave } from '~/routes/workspace/[projectId]/_hooks/useDebouncedSave';
import type { Project } from '@tsumugi/adapter';

const NO_REVALIDATE = { revalidateOnFocus: false, revalidateOnReconnect: false } as const;

interface ProjectEditorWrapperProps {
  projectId: string;
  onNameChange?: (name: string) => void;
}

const toEditorData = (project: Project): ProjectEditorData => ({
  name: project.name,
  synopsis: project.synopsis ?? '',
  theme: project.theme ?? '',
  goal: project.goal ?? '',
  targetWordCount: project.targetWordCount != null ? String(project.targetWordCount) : '',
  targetAudience: project.targetAudience ?? '',
});

export function ProjectEditorWrapper({ projectId, onNameChange }: ProjectEditorWrapperProps) {
  const { data: project, mutate } = useProject(projectId, NO_REVALIDATE);
  const { trigger: updateProject } = useUpdateProject(projectId);

  const onSave = useCallback(async (field: string, value: unknown) => {
    const saveValue = field === 'targetWordCount'
      ? (value === '' ? undefined : Number(value))
      : value;
    await updateProject({ [field]: saveValue });
  }, [updateProject]);

  const debouncedSave = useDebouncedSave(onSave);

  const handleChange = useCallback((field: keyof ProjectEditorData, value: string) => {
    void mutate((prev) => prev ? { ...prev, [field]: value } : prev, { revalidate: false });
    debouncedSave(field, value);
    if (field === 'name') onNameChange?.(value);
  }, [mutate, debouncedSave, onNameChange]);

  if (!project) return null;

  return (
    <ProjectEditor
      data={toEditorData(project)}
      onChange={handleChange}
    />
  );
}
