import { NodeTree } from '@tsumugi-chan/client';
import { findNodeInTree } from './node-tree';

describe('findNodeInTree', () => {
  const createMockNode = (
    id: string,
    name: string,
    children: NodeTree[] = [],
  ): NodeTree => ({
    id,
    name,
    children,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    projectId: 'test-project',
    parentId: null,
    nodeType: 'folder' as const,
    order: 0,
  });

  it('ルートレベルでノードを見つける', () => {
    const nodes: NodeTree[] = [
      createMockNode('1', 'Node 1'),
      createMockNode('2', 'Node 2'),
      createMockNode('3', 'Node 3'),
    ];

    const result = findNodeInTree(nodes, '2');
    expect(result).toEqual(createMockNode('2', 'Node 2'));
  });

  it('ネストされた子ノードを見つける', () => {
    const nodes: NodeTree[] = [
      createMockNode('1', 'Node 1', [
        createMockNode('1-1', 'Node 1-1'),
        createMockNode('1-2', 'Node 1-2', [
          createMockNode('1-2-1', 'Node 1-2-1'),
        ]),
      ]),
      createMockNode('2', 'Node 2'),
    ];

    const result = findNodeInTree(nodes, '1-2-1');
    expect(result).toEqual(createMockNode('1-2-1', 'Node 1-2-1'));
  });

  it('存在しないIDの場合はnullを返す', () => {
    const nodes: NodeTree[] = [
      createMockNode('1', 'Node 1'),
      createMockNode('2', 'Node 2'),
    ];

    const result = findNodeInTree(nodes, 'non-existent');
    expect(result).toBeNull();
  });

  it('空の配列の場合はnullを返す', () => {
    const result = findNodeInTree([], '1');
    expect(result).toBeNull();
  });

  it('深くネストされたツリーで正しく検索する', () => {
    const nodes: NodeTree[] = [
      createMockNode('1', 'Root', [
        createMockNode('1-1', 'Level 1', [
          createMockNode('1-1-1', 'Level 2', [
            createMockNode('1-1-1-1', 'Level 3', [
              createMockNode('target', 'Target'),
            ]),
          ]),
        ]),
      ]),
    ];

    const result = findNodeInTree(nodes, 'target');
    expect(result).toEqual(createMockNode('target', 'Target'));
  });

  it('最初に見つかったノードを返す（重複IDの場合）', () => {
    const nodes: NodeTree[] = [
      createMockNode('duplicate', 'First'),
      createMockNode('duplicate', 'Second'),
    ];

    const result = findNodeInTree(nodes, 'duplicate');
    expect(result).toEqual(createMockNode('duplicate', 'First'));
  });
});
