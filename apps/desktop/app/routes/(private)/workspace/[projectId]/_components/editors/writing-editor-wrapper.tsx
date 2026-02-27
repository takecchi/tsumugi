import { useCallback } from 'react';
import { useWriting, useWritingTree, useUpdateWriting } from '~/hooks/writings';
import { WritingEditor } from '@tsumugi/ui';
import { useDebouncedSave } from '~/routes/(private)/workspace/[projectId]/_hooks/useDebouncedSave';

const NO_REVALIDATE = { revalidateOnFocus: false, revalidateOnReconnect: false } as const;

interface WritingEditorWrapperProps {
  id: string;
  projectId: string;
}

export function WritingEditorWrapper({ id, projectId }: WritingEditorWrapperProps) {
  const { data: writing, mutate } = useWriting(id, NO_REVALIDATE);
  const { mutate: mutateTree } = useWritingTree(projectId);
  const { trigger: updateWriting } = useUpdateWriting(id);

  const onSave = useCallback(async (field: string, value: unknown) => {
    if (field === 'content') {
      const wc = (value as string).length;
      await updateWriting({ content: value as string, wordCount: wc });
    } else {
      await updateWriting({ [field]: value });
    }
    if (field === 'name') await mutateTree();
  }, [updateWriting, mutateTree]);

  const debouncedSave = useDebouncedSave(onSave);

  const handleNameChange = useCallback((value: string) => {
    void mutate((prev) => prev ? { ...prev, name: value } : prev, { revalidate: false });
    debouncedSave('name', value);
  }, [mutate, debouncedSave]);

  const handleContentChange = useCallback((value: string) => {
    const wc = value.length;
    void mutate((prev) => prev ? { ...prev, content: value, wordCount: wc } : prev, { revalidate: false });
    debouncedSave('content', value);
  }, [mutate, debouncedSave]);

  if (!writing) return null;

  return (
    <WritingEditor
      name={writing.name}
      content={writing.content}
      wordCount={writing.wordCount}
      onNameChange={handleNameChange}
      onContentChange={handleContentChange}
    />
  );
}
