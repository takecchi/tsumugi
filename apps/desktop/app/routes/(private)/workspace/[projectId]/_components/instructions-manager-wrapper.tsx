import {
  InstructionsManager,
  type InstructionItem,
  type InstructionInput,
} from '@tsumugi/ui';
import {
  useCreateInstruction,
  useDeleteInstruction,
  useInstructions,
  useUpdateInstruction,
} from '~/hooks/instructions';
import type { Instruction } from '@tsumugi/adapter';

function toItem(i: Instruction): InstructionItem {
  return {
    id: i.id,
    title: i.title,
    content: i.content,
    enabled: i.enabled,
  };
}

interface InstructionsManagerWrapperProps {
  projectId: string;
}

export function InstructionsManagerWrapper({
  projectId,
}: InstructionsManagerWrapperProps) {
  const { data: instructions } = useInstructions(projectId);
  const { trigger: create, isMutating: creating } =
    useCreateInstruction(projectId);
  const { trigger: update, isMutating: updating } =
    useUpdateInstruction(projectId);
  const { trigger: remove } = useDeleteInstruction(projectId);

  const items = instructions ?? [];
  const sorted = [...items].sort((a, b) => a.order - b.order);
  const nextOrder = items.reduce((max, i) => Math.max(max, i.order), -1) + 1;

  return (
    <InstructionsManager
      instructions={sorted.map(toItem)}
      isSubmitting={creating || updating}
      onCreate={(input: InstructionInput) => {
        void create({ ...input, order: nextOrder });
      }}
      onUpdate={(id: string, input: InstructionInput) => {
        void update({ instructionId: id, data: input });
      }}
      onToggle={(id: string, enabled: boolean) => {
        void update({ instructionId: id, data: { enabled } });
      }}
      onDelete={(id: string) => {
        void remove(id);
      }}
    />
  );
}
