import type {
  ExportAdapter,
  ExportOptions,
  ExportResult,
  ProjectAdapter,
  WritingAdapter,
  PlotAdapter,
  CharacterAdapter,
  MemoAdapter,
} from '@tsumugi/adapter';
import { zipSync, strToU8 } from 'fflate';
import {
  sanitizeFileName,
  buildProjectReadme,
  buildWritingEntries,
  buildPlotEntries,
  buildCharacterEntries,
  buildMemoEntries,
  type ZipEntry,
} from '@/internal/utils/export-markdown';

export interface ExportAdapterDeps {
  projects: ProjectAdapter;
  writings: WritingAdapter;
  plots: PlotAdapter;
  characters: CharacterAdapter;
  memos: MemoAdapter;
}

export function createExportAdapter(deps: ExportAdapterDeps): ExportAdapter {
  const { projects, writings, plots, characters, memos } = deps;

  return {
    async exportProject(
      projectId: string,
      options: ExportOptions = {},
    ): Promise<ExportResult> {
      const {
        includeWritings = true,
        includePlots = true,
        includeCharacters = true,
        includeMemos = true,
      } = options;

      const project = await projects.getById(projectId);
      if (!project) throw new Error(`Project not found: ${projectId}`);

      const entries: ZipEntry[] = [
        { path: 'README.md', content: buildProjectReadme(project) },
      ];

      if (includeWritings) {
        const ws = await writings.getByProjectId(projectId);
        entries.push(...buildWritingEntries(ws));
      }

      if (includePlots) {
        const ps = await plots.getByProjectId(projectId);
        entries.push(...buildPlotEntries(ps));
      }

      if (includeCharacters) {
        const cs = await characters.getByProjectId(projectId);
        entries.push(...buildCharacterEntries(cs));
      }

      if (includeMemos) {
        const ms = await memos.getByProjectId(projectId);
        entries.push(...buildMemoEntries(ms));
      }

      const projectSlug = sanitizeFileName(project.name);

      // プロジェクト名をトップレベルディレクトリとして zip を構築
      const zipFiles: Record<string, Uint8Array> = {};
      for (const entry of entries) {
        zipFiles[`${projectSlug}/${entry.path}`] = strToU8(entry.content);
      }

      const data = zipSync(zipFiles);
      const filename = `${projectSlug}-export.zip`;

      return { data, filename, mimeType: 'application/zip' };
    },
  };
}
