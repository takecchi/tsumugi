import type { AIProposal, AIAdapterConfig, AIFieldChange, Plot, Writing, Project } from '@tsumugi/adapter';
import type { ToolAdapters } from '@/adapters/ai-tools';
import { executeAcceptProposal, buildProposalResult } from './ai-proposal';

// --- モック設定 ---

const mockFindProposalInMessages = jest.fn<Promise<AIProposal | undefined>, [string, string]>();
const mockUpdateProposalStatusInMessages = jest.fn<Promise<void>, [string, string, string]>();
const mockCheckAllProposalsProcessed = jest.fn<Promise<{ allProcessed: boolean; feedbackSummaries: { proposalId: string; status: string; targetName: string }[] }>, [string]>();
const mockGetProjectIdFromSessionPath = jest.fn<string, [string]>();

jest.mock('./ai-session', () => ({
  findProposalInMessages: (...args: [string, string]) => mockFindProposalInMessages(...args),
  updateProposalStatusInMessages: (...args: [string, string, string]) => mockUpdateProposalStatusInMessages(...args),
  checkAllProposalsProcessed: (...args: [string]) => mockCheckAllProposalsProcessed(...args),
  getProjectIdFromSessionPath: (...args: [string]) => mockGetProjectIdFromSessionPath(...args),
}));

jest.mock('./ai-stream', () => ({
  createChatStream: jest.fn().mockResolvedValue(new ReadableStream()),
}));

jest.mock('@/internal/utils/fs', () => ({
  join: jest.fn((...parts: string[]) => Promise.resolve(parts.join('/'))),
  readJson: jest.fn().mockResolvedValue(null),
}));

const ts = new Date('2025-01-01T00:00:00Z');

function makeConfig(): AIAdapterConfig {
  return { provider: 'openai', apiKey: 'test-key' };
}

function getConfig(): AIAdapterConfig {
  return makeConfig();
}

function createMockAdapters(overrides: {
  project?: Project | null;
  plot?: Plot | null;
  writing?: Writing | null;
} = {}): ToolAdapters {
  return {
    projects: {
      getAll: jest.fn(),
      getById: jest.fn().mockResolvedValue(overrides.project ?? null),
      create: jest.fn(),
      update: jest.fn().mockResolvedValue(overrides.project),
      delete: jest.fn(),
    },
    plots: {
      getByProjectId: jest.fn(),
      getTreeByProjectId: jest.fn(),
      getById: jest.fn().mockResolvedValue(overrides.plot ?? null),
      getChildren: jest.fn(),
      create: jest.fn(),
      update: jest.fn().mockResolvedValue(overrides.plot),
      delete: jest.fn(),
      move: jest.fn(),
      reorder: jest.fn(),
    },
    characters: {
      getByProjectId: jest.fn(),
      getTreeByProjectId: jest.fn(),
      getById: jest.fn().mockResolvedValue(null),
      getChildren: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      move: jest.fn(),
      reorder: jest.fn(),
    },
    memos: {
      getByProjectId: jest.fn(),
      getTreeByProjectId: jest.fn(),
      getById: jest.fn().mockResolvedValue(null),
      getChildren: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      move: jest.fn(),
      reorder: jest.fn(),
      getByTag: jest.fn(),
    },
    writings: {
      getByProjectId: jest.fn(),
      getTreeByProjectId: jest.fn(),
      getById: jest.fn().mockResolvedValue(overrides.writing ?? null),
      getChildren: jest.fn(),
      create: jest.fn(),
      update: jest.fn().mockResolvedValue(overrides.writing),
      delete: jest.fn(),
      move: jest.fn(),
      reorder: jest.fn(),
      getTotalWordCount: jest.fn(),
    },
  };
}

function makeProposal(overrides: Partial<AIProposal> = {}): AIProposal {
  return {
    id: 'prop-1',
    action: 'update',
    targetId: 'target-1',
    contentType: 'plot',
    targetName: 'テストプロット',
    updatedAt: ts,
    original: { synopsis: '元のあらすじ' },
    proposed: { synopsis: { type: 'replace', value: '新しいあらすじ' } },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetProjectIdFromSessionPath.mockReturnValue('/path/to/project');
  mockCheckAllProposalsProcessed.mockResolvedValue({ allProcessed: false, feedbackSummaries: [] });
  mockUpdateProposalStatusInMessages.mockResolvedValue(undefined);
});

// --- executeAcceptProposal ---

describe('executeAcceptProposal', () => {
  it('提案が見つからない場合エラーを投げる', async () => {
    mockFindProposalInMessages.mockResolvedValue(undefined);
    const adapters = createMockAdapters();

    await expect(
      executeAcceptProposal('session-1', 'missing-prop', getConfig, () => adapters),
    ).rejects.toThrow('提案が見つかりません');
  });

  describe('update (plot)', () => {
    it('コンフリクトなしで正常に更新する', async () => {
      const plot: Plot = {
        id: 'target-1', projectId: 'proj-1', parentId: null, name: 'テストプロット',
        nodeType: 'plot', order: 0, synopsis: '元のあらすじ', createdAt: ts, updatedAt: ts,
      };
      const adapters = createMockAdapters({ plot });
      mockFindProposalInMessages.mockResolvedValue(makeProposal());

      const result = await executeAcceptProposal('session-1', 'prop-1', getConfig, () => adapters);

      expect(adapters.plots.update).toHaveBeenCalledWith('target-1', { synopsis: '新しいあらすじ' });
      expect(mockUpdateProposalStatusInMessages).toHaveBeenCalledWith('session-1', 'prop-1', 'accepted');
      expect(result.feedback.status).toBe('accepted');
    });

    it('updatedAt が異なりフィールドが変更されている場合 conflict を返す', async () => {
      const laterDate = new Date('2025-01-02T00:00:00Z');
      const plot: Plot = {
        id: 'target-1', projectId: 'proj-1', parentId: null, name: 'テストプロット',
        nodeType: 'plot', order: 0, synopsis: '変更されたあらすじ', createdAt: ts, updatedAt: laterDate,
      };
      const adapters = createMockAdapters({ plot });
      mockFindProposalInMessages.mockResolvedValue(makeProposal({
        updatedAt: ts,
        original: { synopsis: '元のあらすじ' },
      }));

      const result = await executeAcceptProposal('session-1', 'prop-1', getConfig, () => adapters);

      expect(adapters.plots.update).not.toHaveBeenCalled();
      expect(mockUpdateProposalStatusInMessages).toHaveBeenCalledWith('session-1', 'prop-1', 'conflict');
      expect(result.feedback.status).toBe('conflict');
      expect(result.feedback.conflictDetails).toContain('synopsis');
    });

    it('updatedAt が異なるが変更フィールドが同じなら更新する', async () => {
      const laterDate = new Date('2025-01-02T00:00:00Z');
      const plot: Plot = {
        id: 'target-1', projectId: 'proj-1', parentId: null, name: 'テストプロット',
        nodeType: 'plot', order: 0, synopsis: '元のあらすじ', createdAt: ts, updatedAt: laterDate,
      };
      const adapters = createMockAdapters({ plot });
      mockFindProposalInMessages.mockResolvedValue(makeProposal({
        updatedAt: ts,
        original: { synopsis: '元のあらすじ' },
      }));

      const result = await executeAcceptProposal('session-1', 'prop-1', getConfig, () => adapters);

      expect(adapters.plots.update).toHaveBeenCalledWith('target-1', { synopsis: '新しいあらすじ' });
      expect(result.feedback.status).toBe('accepted');
    });

    it('対象コンテンツが見つからない場合 conflict を返す', async () => {
      const adapters = createMockAdapters({ plot: null });
      mockFindProposalInMessages.mockResolvedValue(makeProposal());

      const result = await executeAcceptProposal('session-1', 'prop-1', getConfig, () => adapters);

      expect(mockUpdateProposalStatusInMessages).toHaveBeenCalledWith('session-1', 'prop-1', 'conflict');
      expect(result.feedback.status).toBe('conflict');
      expect(result.feedback.conflictDetails).toContain('対象コンテンツが見つかりません');
    });
  });

  describe('update (project)', () => {
    it('プロジェクトを正常に更新する', async () => {
      const project: Project = {
        id: 'proj-1', name: 'テスト作品', synopsis: '元のあらすじ', createdAt: ts, updatedAt: ts,
      };
      const adapters = createMockAdapters({ project });
      mockFindProposalInMessages.mockResolvedValue(makeProposal({
        contentType: 'project',
        targetId: 'proj-1',
        proposed: { synopsis: { type: 'replace', value: '新しいあらすじ' } },
        original: { synopsis: '元のあらすじ' },
      }));

      const result = await executeAcceptProposal('session-1', 'prop-1', getConfig, () => adapters);

      expect(adapters.projects.update).toHaveBeenCalledWith('proj-1', { synopsis: '新しいあらすじ' });
      expect(result.feedback.status).toBe('accepted');
    });

    it('プロジェクトが見つからない場合 conflict を返す', async () => {
      const adapters = createMockAdapters({ project: null });
      mockFindProposalInMessages.mockResolvedValue(makeProposal({
        contentType: 'project',
        targetId: 'proj-1',
      }));

      const result = await executeAcceptProposal('session-1', 'prop-1', getConfig, () => adapters);

      expect(result.feedback.status).toBe('conflict');
      expect(result.feedback.conflictDetails).toContain('プロジェクトが見つかりません');
    });
  });

  describe('update (writing with line_edits)', () => {
    it('line_edits のコンフリクトを行内容ベースで検出する', async () => {
      const laterDate = new Date('2025-01-02T00:00:00Z');
      const writing: Writing = {
        id: 'w-1', projectId: 'proj-1', parentId: null, name: '第一章',
        nodeType: 'writing', order: 0, content: '変更された行1\n行2\n行3', wordCount: 10,
        createdAt: ts, updatedAt: laterDate,
      };
      const adapters = createMockAdapters({ writing });
      const proposed: Record<string, AIFieldChange> = {
        content: {
          type: 'line_edits',
          edits: [{ startLine: 1, endLine: 1, newText: '新しい行1' }],
        },
      };
      mockFindProposalInMessages.mockResolvedValue(makeProposal({
        contentType: 'writing',
        targetId: 'w-1',
        updatedAt: ts,
        original: { line_1: '元の行1' },
        proposed,
      }));

      const result = await executeAcceptProposal('session-1', 'prop-1', getConfig, () => adapters);

      expect(adapters.writings.update).not.toHaveBeenCalled();
      expect(result.feedback.status).toBe('conflict');
      expect(result.feedback.conflictDetails).toContain('行');
    });
  });

  describe('create', () => {
    it('プロットを新規作成する', async () => {
      const adapters = createMockAdapters();
      mockFindProposalInMessages.mockResolvedValue(makeProposal({
        action: 'create',
        contentType: 'plot',
        targetName: '新プロット',
        updatedAt: undefined,
        original: undefined,
        proposed: {
          name: { type: 'replace', value: '新プロット' },
          synopsis: { type: 'replace', value: 'あらすじ' },
        },
      }));

      const result = await executeAcceptProposal('session-1', 'prop-1', getConfig, () => adapters);

      expect(adapters.plots.create).toHaveBeenCalled();
      const createArg = (adapters.plots.create as jest.Mock).mock.calls[0][0];
      expect(createArg.name).toBe('新プロット');
      expect(createArg.synopsis).toBe('あらすじ');
      expect(createArg.projectId).toBe('/path/to/project');
      expect(createArg.nodeType).toBe('plot');
      expect(result.feedback.status).toBe('accepted');
    });

    it('執筆を新規作成する（wordCount が自動計算される）', async () => {
      const adapters = createMockAdapters();
      mockFindProposalInMessages.mockResolvedValue(makeProposal({
        action: 'create',
        contentType: 'writing',
        targetName: '第二章',
        updatedAt: undefined,
        original: undefined,
        proposed: {
          name: { type: 'replace', value: '第二章' },
          content: { type: 'replace', value: '本文テキスト' },
        },
      }));

      const result = await executeAcceptProposal('session-1', 'prop-1', getConfig, () => adapters);

      expect(adapters.writings.create).toHaveBeenCalled();
      const createArg = (adapters.writings.create as jest.Mock).mock.calls[0][0];
      expect(createArg.content).toBe('本文テキスト');
      expect(createArg.wordCount).toBe('本文テキスト'.length);
      expect(result.feedback.status).toBe('accepted');
    });
  });
});

// --- buildProposalResult ---

describe('buildProposalResult', () => {
  it('全提案が未処理の場合は stream なしで返す', async () => {
    mockCheckAllProposalsProcessed.mockResolvedValue({ allProcessed: false, feedbackSummaries: [] });
    const adapters = createMockAdapters();
    const feedback = { proposalId: 'prop-1', status: 'accepted' as const };

    const result = await buildProposalResult('session-1', feedback, getConfig, () => adapters);

    expect(result.feedback).toEqual(feedback);
    expect(result.stream).toBeUndefined();
  });

  it('全提案が処理済みだが session.json がない場合は stream なしで返す', async () => {
    mockCheckAllProposalsProcessed.mockResolvedValue({ allProcessed: true, feedbackSummaries: [] });
    const adapters = createMockAdapters();
    const feedback = { proposalId: 'prop-1', status: 'accepted' as const };

    const result = await buildProposalResult('session-1', feedback, getConfig, () => adapters);

    expect(result.feedback).toEqual(feedback);
    expect(result.stream).toBeUndefined();
  });

  it('全提案が処理済みで session.json がある場合は stream を返す', async () => {
    mockCheckAllProposalsProcessed.mockResolvedValue({ allProcessed: true, feedbackSummaries: [] });
    const { readJson } = jest.requireMock('@/internal/utils/fs') as { readJson: jest.Mock };
    readJson.mockImplementation(async (path: string) => {
      if (path.includes('session.json')) return { title: 'テスト', createdAt: ts.toISOString(), updatedAt: ts.toISOString() };
      if (path.includes('messages.json')) return [];
      return null;
    });
    const adapters = createMockAdapters();
    const feedback = { proposalId: 'prop-1', status: 'accepted' as const };

    const result = await buildProposalResult('session-1', feedback, getConfig, () => adapters);

    expect(result.feedback).toEqual(feedback);
    expect(result.stream).toBeDefined();
  });
});
