import { useCallback } from 'react';
import {
  useMemo as useMemoHook,
  useMemoTree,
  useUpdateMemo,
} from '~/hooks/memos';
import {
  MemoEditor,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@tsumugi/ui';
import { useDebouncedSave } from '~/routes/(private)/workspace/[projectId]/_hooks/useDebouncedSave';
import { NodeAttributesBar } from './node-attributes-bar';
import { NodeRevisionWrapper } from '../version-history/node-revision-wrapper';

const NO_REVALIDATE = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
} as const;

interface MemoEditorWrapperProps {
  id: string;
  projectId: string;
}

export function MemoEditorWrapper({ id, projectId }: MemoEditorWrapperProps) {
  const { data: memo, mutate } = useMemoHook(id, NO_REVALIDATE);
  const { mutate: mutateTree } = useMemoTree(projectId);
  const { trigger: updateMemo } = useUpdateMemo(id);

  const onSave = useCallback(
    async (field: string, value: unknown) => {
      await updateMemo({ [field]: value });
      if (field === 'name') await mutateTree();
    },
    [updateMemo, mutateTree],
  );

  const debouncedSave = useDebouncedSave(onSave);

  const handleFieldChange = useCallback(
    (field: string, value: unknown) => {
      void mutate((prev) => (prev ? { ...prev, [field]: value } : prev), {
        revalidate: false,
      });
      debouncedSave(field, value);
    },
    [mutate, debouncedSave],
  );

  if (!memo) return null;

  return (
    <Tabs defaultValue="body" className="flex h-full min-h-0 flex-col gap-0">
      <NodeAttributesBar
        projectId={projectId}
        contentType="memo"
        nodeId={id}
        canonStatus={memo.canonStatus}
        contextPolicy={memo.contextPolicy}
        editPolicy={memo.editPolicy}
      >
        <TabsList className="h-7">
          <TabsTrigger value="body">内容</TabsTrigger>
          <TabsTrigger value="history">履歴</TabsTrigger>
        </TabsList>
      </NodeAttributesBar>
      <TabsContent value="body" className="min-h-0 flex-1">
        <MemoEditor
          name={memo.name}
          content={memo.content}
          tags={memo.tags ?? []}
          onNameChange={(v) => handleFieldChange('name', v)}
          onContentChange={(v) => handleFieldChange('content', v)}
          onTagsChange={(v) => handleFieldChange('tags', v)}
        />
      </TabsContent>
      <TabsContent value="history" className="min-h-0 flex-1">
        <NodeRevisionWrapper projectId={projectId} nodeId={id} />
      </TabsContent>
    </Tabs>
  );
}
