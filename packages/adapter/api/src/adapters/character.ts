import type { Character, CharacterAdapter, TreeNode } from '@tsumugi/adapter';
import type { ApiClients } from '@/client';
import type { Character as ApiCharacter } from '@tsumugi-chan/client';
import { findNodeInTree } from '@/internal/helpers/node-tree';

function toCharacter(api: ApiCharacter): Character {
  return {
    id: api.id,
    projectId: api.projectId,
    parentId: api.parentId,
    name: api.name,
    nodeType: api.nodeType,
    order: api.order,
    aliases: api.aliases ?? undefined,
    role: api.role ?? undefined,
    gender: api.gender ?? undefined,
    age: api.age ?? undefined,
    appearance: api.appearance ?? undefined,
    personality: api.personality ?? undefined,
    background: api.background ?? undefined,
    motivation: api.motivation ?? undefined,
    relationships: api.relationships ?? undefined,
    notes: api.notes ?? undefined,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
  };
}

export function createCharacterAdapter(clients: ApiClients): CharacterAdapter {
  return {
    async getByProjectId(projectId: string): Promise<Character[]> {
      const characters = await clients.projects.getCharacters({
        projectId,
      });
      return characters.map(toCharacter);
    },

    async getTreeByProjectId(projectId: string): Promise<TreeNode[]> {
      return await clients.projects.getNodeTree({
        projectId,
        nodeTypes: ['character', 'folder'],
      });
    },

    async getById(id: string): Promise<Character | null> {
      try {
        const character = await clients.characters.getCharacter({
          characterId: id,
        });
        return toCharacter(character);
      } catch {
        return null;
      }
    },

    // FIXME 未対応
    async getChildren(parentId: string): Promise<Character[]> {
      const character = await clients.characters.getCharacter({
        characterId: parentId,
      });
      const nodes = await clients.projects.getNodeTree({
        projectId: character.projectId,
        nodeTypes: ['character', 'folder'],
      });
      const parentNode = findNodeInTree(nodes, parentId);
      if (!parentNode) return [];
      const characters = await Promise.all(
        parentNode.children.map((node) =>
          clients.characters.getCharacter({ characterId: node.id }),
        ),
      );
      return characters.map(toCharacter);
    },

    async create(
      data: Omit<Character, 'id' | 'createdAt' | 'updatedAt'>,
    ): Promise<Character> {
      const character = await clients.projects.createCharacter({
        projectId: data.projectId,
        createCharacterRequest: {
          parentId: data.parentId ?? undefined,
          name: data.name,
          aliases: data.aliases,
          role: data.role,
          gender: data.gender,
          age: data.age,
          appearance: data.appearance,
          personality: data.personality,
          background: data.background,
          motivation: data.motivation,
          relationships: data.relationships,
          notes: data.notes,
        },
      });
      return toCharacter(character);
    },

    async update(
      id: string,
      data: Partial<
        Omit<Character, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>
      >,
    ): Promise<Character> {
      const character = await clients.characters.updateCharacter({
        characterId: id,
        updateCharacterRequest: {
          name: data.name,
          aliases: data.aliases,
          role: data.role,
          gender: data.gender,
          age: data.age,
          appearance: data.appearance,
          personality: data.personality,
          background: data.background,
          motivation: data.motivation,
          relationships: data.relationships,
          notes: data.notes,
        },
      });
      return toCharacter(character);
    },

    async delete(id: string): Promise<void> {
      await clients.characters.deleteCharacter({ characterId: id });
    },

    async move(
      id: string,
      newParentId: string | null,
      newOrder: number,
    ): Promise<Character> {
      const character = await clients.characters.getCharacter({
        characterId: id,
      });
      await clients.projects.reorderNodes({
        projectId: character.projectId,
        reorderNodesRequest: {
          changedNodes: [
            { nodeId: id, parentId: newParentId, order: newOrder },
          ],
        },
      });
      const result = await clients.characters.getCharacter({ characterId: id });
      return toCharacter(result);
    },

    async reorder(parentId: string | null, ids: string[]): Promise<void> {
      if (ids.length === 0) return;
      const first = await clients.characters.getCharacter({
        characterId: ids[0],
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
