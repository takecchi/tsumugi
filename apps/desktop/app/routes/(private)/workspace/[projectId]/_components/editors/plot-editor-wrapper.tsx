import { useCallback } from 'react';
import { usePlot, usePlotTree, useUpdatePlot } from '~/hooks/plots';
import { PlotEditor, type PlotEditorData } from '@tsumugi/ui';
import { useDebouncedSave } from '~/routes/(private)/workspace/[projectId]/_hooks/useDebouncedSave';
import type { Plot } from '@tsumugi/adapter';

const NO_REVALIDATE = { revalidateOnFocus: false, revalidateOnReconnect: false } as const;

interface PlotEditorWrapperProps {
  id: string;
  projectId: string;
}

const toEditorData = (plot: Plot): PlotEditorData => ({
  name: plot.name,
  synopsis: plot.synopsis ?? '',
  setting: plot.setting ?? '',
  theme: plot.theme ?? '',
  structure: plot.structure ?? '',
  conflict: plot.conflict ?? '',
  resolution: plot.resolution ?? '',
  notes: plot.notes ?? '',
});

export function PlotEditorWrapper({ id, projectId }: PlotEditorWrapperProps) {
  const { data: plot, mutate } = usePlot(id, NO_REVALIDATE);
  const { mutate: mutateTree } = usePlotTree(projectId);
  const { trigger: updatePlot } = useUpdatePlot(id);

  const onSave = useCallback(async (field: string, value: unknown) => {
    await updatePlot({ [field]: value });
    if (field === 'name') await mutateTree();
  }, [updatePlot, mutateTree]);

  const debouncedSave = useDebouncedSave(onSave);

  const handleChange = useCallback((field: keyof PlotEditorData, value: string) => {
    void mutate((prev) => prev ? { ...prev, [field]: value } : prev, { revalidate: false });
    debouncedSave(field, value);
  }, [mutate, debouncedSave]);

  if (!plot) return null;

  return (
    <PlotEditor
      data={toEditorData(plot)}
      onChange={handleChange}
    />
  );
}
