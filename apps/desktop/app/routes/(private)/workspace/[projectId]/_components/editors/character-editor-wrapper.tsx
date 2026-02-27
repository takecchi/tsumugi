import { useCallback } from 'react';
import { useCharacter, useCharacterTree, useUpdateCharacter } from '~/hooks/characters';
import { CharacterEditor, type CharacterEditorData } from '@tsumugi/ui';
import { useDebouncedSave } from '~/routes/(private)/workspace/[projectId]/_hooks/useDebouncedSave';
import type { Character } from '@tsumugi/adapter';

const NO_REVALIDATE = { revalidateOnFocus: false, revalidateOnReconnect: false } as const;

interface CharacterEditorWrapperProps {
  id: string;
  projectId: string;
}

const toEditorData = (c: Character): CharacterEditorData => ({
  name: c.name,
  aliases: c.aliases ?? '',
  role: c.role ?? '',
  gender: c.gender ?? '',
  age: c.age ?? '',
  appearance: c.appearance ?? '',
  personality: c.personality ?? '',
  background: c.background ?? '',
  motivation: c.motivation ?? '',
  relationships: c.relationships ?? '',
  notes: c.notes ?? '',
});

export function CharacterEditorWrapper({ id, projectId }: CharacterEditorWrapperProps) {
  const { data: character, mutate } = useCharacter(id, NO_REVALIDATE);
  const { mutate: mutateTree } = useCharacterTree(projectId);
  const { trigger: updateCharacter } = useUpdateCharacter(id);

  const onSave = useCallback(async (field: string, value: unknown) => {
    await updateCharacter({ [field]: value });
    if (field === 'name') await mutateTree();
  }, [updateCharacter, mutateTree]);

  const debouncedSave = useDebouncedSave(onSave);

  const handleChange = useCallback((field: keyof CharacterEditorData, value: string) => {
    void mutate((prev) => prev ? { ...prev, [field]: value } : prev, { revalidate: false });
    debouncedSave(field, value);
  }, [mutate, debouncedSave]);

  if (!character) return null;

  return (
    <CharacterEditor
      data={toEditorData(character)}
      onChange={handleChange}
    />
  );
}
