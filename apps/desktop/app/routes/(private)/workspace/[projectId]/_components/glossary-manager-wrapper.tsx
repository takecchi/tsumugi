import {
  GlossaryManager,
  type GlossaryTermItem,
  type GlossaryTermInput,
} from '@tsumugi/ui';
import {
  useCreateGlossaryTerm,
  useDeleteGlossaryTerm,
  useGlossaryTerms,
  useUpdateGlossaryTerm,
} from '~/hooks/glossary';
import type { GlossaryTerm } from '@tsumugi/adapter';

function toItem(t: GlossaryTerm): GlossaryTermItem {
  return {
    id: t.id,
    term: t.term,
    reading: t.reading,
    aliases: t.aliases,
    notes: t.notes,
  };
}

interface GlossaryManagerWrapperProps {
  projectId: string;
}

export function GlossaryManagerWrapper({
  projectId,
}: GlossaryManagerWrapperProps) {
  const { data: terms } = useGlossaryTerms(projectId);
  const { trigger: create, isMutating: creating } =
    useCreateGlossaryTerm(projectId);
  const { trigger: update, isMutating: updating } =
    useUpdateGlossaryTerm(projectId);
  const { trigger: remove } = useDeleteGlossaryTerm(projectId);

  return (
    <GlossaryManager
      terms={(terms ?? []).map(toItem)}
      isSubmitting={creating || updating}
      onCreate={(input: GlossaryTermInput) => {
        void create(input);
      }}
      onUpdate={(id: string, input: GlossaryTermInput) => {
        void update({ termId: id, data: input });
      }}
      onDelete={(id: string) => {
        void remove(id);
      }}
    />
  );
}
