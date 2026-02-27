import type { Plot, PlotAdapter, TreeNode } from '@tsumugi/adapter';
import type { ApiClients } from '@/client';
import type { Plot as ApiPlot } from '@tsumugi-chan/client';
import { findNodeInTree } from '@/internal/helpers/node-tree';

function toPlot(api: ApiPlot): Plot {
  return {
    id: api.id,
    projectId: api.projectId,
    parentId: api.parentId,
    name: api.name,
    nodeType: api.nodeType,
    order: api.order,
    synopsis: api.synopsis ?? undefined,
    setting: api.setting ?? undefined,
    theme: api.theme ?? undefined,
    structure: api.structure ?? undefined,
    conflict: api.conflict ?? undefined,
    resolution: api.resolution ?? undefined,
    notes: api.notes ?? undefined,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
  };
}

export function createPlotAdapter(clients: ApiClients): PlotAdapter {
  return {
    async getByProjectId(projectId: string): Promise<Plot[]> {
      const plots = await clients.projects.getPlots({
        projectId,
      });
      return plots.map(toPlot);
    },

    async getTreeByProjectId(projectId: string): Promise<TreeNode[]> {
      return await clients.projects.getNodeTree({
        projectId,
        nodeTypes: ['plot', 'folder'],
      });
    },

    async getById(id: string): Promise<Plot | null> {
      try {
        const plot = await clients.plots.getPlot({
          plotId: id,
        });
        return toPlot(plot);
      } catch {
        return null;
      }
    },

    // FIXME 未対応
    async getChildren(parentId: string): Promise<Plot[]> {
      const plot = await clients.plots.getPlot({
        plotId: parentId,
      });
      const nodes = await clients.projects.getNodeTree({
        projectId: plot.projectId,
        nodeTypes: ['plot', 'folder'],
      });
      const parentNode = findNodeInTree(nodes, parentId);
      if (!parentNode) return [];
      const plots = await Promise.all(
        parentNode.children.map((node) =>
          clients.plots.getPlot({ plotId: node.id }),
        ),
      );
      return plots.map(toPlot);
    },

    async create(
      data: Omit<Plot, 'id' | 'createdAt' | 'updatedAt'>,
    ): Promise<Plot> {
      const plot = await clients.projects.createPlot({
        projectId: data.projectId,
        createPlotRequest: {
          parentId: data.parentId ?? undefined,
          name: data.name,
          synopsis: data.synopsis,
          setting: data.setting,
          theme: data.theme,
          structure: data.structure,
          conflict: data.conflict,
          resolution: data.resolution,
          notes: data.notes,
        },
      });
      return toPlot(plot);
    },

    async update(
      id: string,
      data: Partial<
        Omit<Plot, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>
      >,
    ): Promise<Plot> {
      const plot = await clients.plots.updatePlot({
        plotId: id,
        updatePlotRequest: {
          name: data.name,
          synopsis: data.synopsis,
          setting: data.setting,
          theme: data.theme,
          structure: data.structure,
          conflict: data.conflict,
          resolution: data.resolution,
          notes: data.notes,
        },
      });
      return toPlot(plot);
    },

    async delete(id: string): Promise<void> {
      await clients.plots.deletePlot({ plotId: id });
    },

    async move(
      id: string,
      newParentId: string | null,
      newOrder: number,
    ): Promise<Plot> {
      const plot = await clients.plots.getPlot({
        plotId: id,
      });
      await clients.projects.reorderNodes({
        projectId: plot.projectId,
        reorderNodesRequest: {
          changedNodes: [
            { nodeId: id, parentId: newParentId, order: newOrder },
          ],
        },
      });
      const result = await clients.plots.getPlot({ plotId: id });
      return toPlot(result);
    },

    async reorder(parentId: string | null, ids: string[]): Promise<void> {
      if (ids.length === 0) return;
      const first = await clients.plots.getPlot({
        plotId: ids[0],
      });
      await clients.projects.reorderNodes({
        projectId: first.projectId,
        reorderNodesRequest: {
          changedNodes: ids.map((nodeId, index) => ({
            nodeId,
            parentId: parentId ?? undefined,
            order: index,
          })),
        },
      });
    },
  };
}
