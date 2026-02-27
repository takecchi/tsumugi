import type { Adapter, AdapterConfig } from '@tsumugi/adapter';
import { createAuthAdapter } from '@/adapters/auth';
import { createProjectAdapter } from '@/adapters/project';
import { createPlotAdapter } from '@/adapters/plot';
import { createCharacterAdapter } from '@/adapters/character';
import { createMemoAdapter } from '@/adapters/memo';
import { createWritingAdapter } from '@/adapters/writing';
import { createAIAdapter } from '@/adapters/ai';
import { createSettingsAdapter } from '@/adapters/settings';

export function createAdapter(config: AdapterConfig = {}): Adapter {
  const workDir = config.local?.workDir;

  const projects = createProjectAdapter(workDir);
  const plots = createPlotAdapter(workDir);
  const characters = createCharacterAdapter(workDir);
  const memos = createMemoAdapter(workDir);
  const writings = createWritingAdapter(workDir);

  return {
    auth: createAuthAdapter(),
    projects,
    settings: createSettingsAdapter(),
    plots,
    characters,
    memos,
    writings,
    ai: createAIAdapter(config.local?.ai, { projects, plots, characters, memos, writings }),
  };
}
