import { useCallback } from 'react';
import { useMemo as useMemoHook, useMemoTree, useUpdateMemo } from '~/hooks/memos';
import { MemoEditor } from '@tsumugi/ui';
import { useDebouncedSave } from '~/routes/(private)/workspace/[projectId]/_hooks/useDebouncedSave';

const NO_REVALIDATE = { revalidateOnFocus: false, revalidateOnReconnect: false } as const;

interface MemoEditorWrapperProps {
  id: string;
  projectId: string;
}

export function MemoEditorWrapper({ id, projectId }: MemoEditorWrapperProps) {
  const { data: memo, mutate } = useMemoHook(id, NO_REVALIDATE);
  const { mutate: mutateTree } = useMemoTree(projectId);
  const { trigger: updateMemo } = useUpdateMemo(id);

  const onSave = useCallback(async (field: string, value: unknown) => {
    await updateMemo({ [field]: value });
    if (field === 'name') await mutateTree();
  }, [updateMemo, mutateTree]);

  const debouncedSave = useDebouncedSave(onSave);

  const handleFieldChange = useCallback((field: string, value: unknown) => {
    void mutate((prev) => prev ? { ...prev, [field]: value } : prev, { revalidate: false });
    debouncedSave(field, value);
  }, [mutate, debouncedSave]);

  if (!memo) return null;

  return (
    <MemoEditor
      name={memo.name}
      content={memo.content}
      tags={memo.tags ?? []}
      onNameChange={(v) => handleFieldChange('name', v)}
      onContentChange={(v) => handleFieldChange('content', v)}
      onTagsChange={(v) => handleFieldChange('tags', v)}
    />
  );
}
