import type { Adapter, AdapterConfig } from './adapter';

const notImplemented = (): never => {
  throw new Error(
    '@tsumugi/adapter: This is a stub implementation. ' +
    'Replace with @tsumugi/adapter-local or @tsumugi/adapter-api at build time.'
  );
};

export class ProjectCancelledError extends Error {
  constructor() {
    super('Project creation cancelled by user');
    this.name = 'ProjectCancelledError';
  }
}

export function createAdapter(_: AdapterConfig = {}): Adapter {
  return {
    projects: {
      getAll: () => notImplemented(),
      getById: () => notImplemented(),
      create: () => notImplemented(),
      update: () => notImplemented(),
      delete: () => notImplemented(),
    },
    settings: {
      get: () => notImplemented(),
      update: () => notImplemented(),
    },
    plots: {
      getByProjectId: () => notImplemented(),
      getTreeByProjectId: () => notImplemented(),
      getById: () => notImplemented(),
      getChildren: () => notImplemented(),
      create: () => notImplemented(),
      update: () => notImplemented(),
      delete: () => notImplemented(),
      move: () => notImplemented(),
      reorder: () => notImplemented(),
    },
    characters: {
      getByProjectId: () => notImplemented(),
      getTreeByProjectId: () => notImplemented(),
      getById: () => notImplemented(),
      getChildren: () => notImplemented(),
      create: () => notImplemented(),
      update: () => notImplemented(),
      delete: () => notImplemented(),
      move: () => notImplemented(),
      reorder: () => notImplemented(),
    },
    memos: {
      getByProjectId: () => notImplemented(),
      getTreeByProjectId: () => notImplemented(),
      getById: () => notImplemented(),
      getChildren: () => notImplemented(),
      create: () => notImplemented(),
      update: () => notImplemented(),
      delete: () => notImplemented(),
      move: () => notImplemented(),
      reorder: () => notImplemented(),
      getByTag: () => notImplemented(),
    },
    writings: {
      getByProjectId: () => notImplemented(),
      getTreeByProjectId: () => notImplemented(),
      getById: () => notImplemented(),
      getChildren: () => notImplemented(),
      create: () => notImplemented(),
      update: () => notImplemented(),
      delete: () => notImplemented(),
      move: () => notImplemented(),
      reorder: () => notImplemented(),
      getTotalWordCount: () => notImplemented(),
    },
    ai: {
      chat: () => notImplemented(),
      getSessions: () => notImplemented(),
      getSession: () => notImplemented(),
      getMessages: () => notImplemented(),
      createSession: () => notImplemented(),
      acceptProposal: () => notImplemented(),
      rejectProposal: () => notImplemented(),
      deleteSession: () => notImplemented(),
      getMemories: () => notImplemented(),
      deleteMemory: () => notImplemented(),
      getUsage: () => notImplemented(),
    },
  };
}
