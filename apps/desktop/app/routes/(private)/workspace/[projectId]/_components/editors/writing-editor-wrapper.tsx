import { useCallback } from 'react';
import { useWriting, useWritingTree, useUpdateWriting } from '~/hooks/writings';
import {
  WritingEditor,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@tsumugi/ui';
import { useDebouncedSave } from '~/routes/(private)/workspace/[projectId]/_hooks/useDebouncedSave';
import { NodeAttributesBar } from './node-attributes-bar';
import { ConsistencyPanelWrapper } from '../consistency-panel-wrapper';

const NO_REVALIDATE = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
} as const;

interface WritingEditorWrapperProps {
  id: string;
  projectId: string;
}

export function WritingEditorWrapper({
  id,
  projectId,
}: WritingEditorWrapperProps) {
  const { data: writing, mutate } = useWriting(id, NO_REVALIDATE);
  const { mutate: mutateTree } = useWritingTree(projectId);
  const { trigger: updateWriting } = useUpdateWriting(id);

  const onSave = useCallback(
    async (field: string, value: unknown) => {
      if (field === 'content') {
        const wc = (value as string).length;
        await updateWriting({ content: value as string, wordCount: wc });
      } else {
        await updateWriting({ [field]: value });
      }
      if (field === 'name') await mutateTree();
    },
    [updateWriting, mutateTree],
  );

  const debouncedSave = useDebouncedSave(onSave);

  const handleNameChange = useCallback(
    (value: string) => {
      void mutate((prev) => (prev ? { ...prev, name: value } : prev), {
        revalidate: false,
      });
      debouncedSave('name', value);
    },
    [mutate, debouncedSave],
  );

  const handleContentChange = useCallback(
    (value: string) => {
      const wc = value.length;
      void mutate(
        (prev) => (prev ? { ...prev, content: value, wordCount: wc } : prev),
        { revalidate: false },
      );
      debouncedSave('content', value);
    },
    [mutate, debouncedSave],
  );

  if (!writing) return null;

  return (
    <Tabs defaultValue="body" className="flex h-full min-h-0 flex-col gap-0">
      <NodeAttributesBar
        projectId={projectId}
        contentType="writing"
        nodeId={id}
        canonStatus={writing.canonStatus}
        contextPolicy={writing.contextPolicy}
      >
        <TabsList className="h-7">
          <TabsTrigger value="body">本文</TabsTrigger>
          <TabsTrigger value="consistency">整合性チェック</TabsTrigger>
        </TabsList>
      </NodeAttributesBar>
      <TabsContent value="body" className="min-h-0 flex-1">
        <WritingEditor
          name={writing.name}
          content={writing.content}
          onNameChange={handleNameChange}
          onContentChange={handleContentChange}
        />
      </TabsContent>
      <TabsContent value="consistency" className="min-h-0 flex-1">
        <ConsistencyPanelWrapper writingId={id} projectId={projectId} />
      </TabsContent>
    </Tabs>
  );
}
