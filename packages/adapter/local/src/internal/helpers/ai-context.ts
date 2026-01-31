import type { AIChatContext } from '@tsumugi/adapter';
import type { ToolAdapters } from '@/adapters/ai-tools';

/**
 * プロジェクトの全コンテンツ名一覧を取得してシステムプロンプト用テキストに変換
 */
export async function buildProjectSummary(projectId: string, adapters: ToolAdapters): Promise<string> {
  const [project, plots, characters, memos, writings] = await Promise.all([
    adapters.projects.getById(projectId),
    adapters.plots.getByProjectId(projectId),
    adapters.characters.getByProjectId(projectId),
    adapters.memos.getByProjectId(projectId),
    adapters.writings.getByProjectId(projectId),
  ]);

  const lines: string[] = [];
  lines.push('## プロジェクト情報');
  if (project) {
    lines.push(`- プロジェクト名: ${project.name}`);
    if (project.synopsis) lines.push(`- あらすじ: ${project.synopsis}`);
    if (project.theme) lines.push(`- テーマ: ${project.theme}`);
    if (project.goal) lines.push(`- 終着点: ${project.goal}`);
    if (project.targetWordCount != null) lines.push(`- 執筆予定文字数: ${project.targetWordCount.toLocaleString()}字`);
    if (project.targetAudience) lines.push(`- ターゲット層: ${project.targetAudience}`);
  }

  const plotFiles = plots.filter((p) => p.nodeType !== 'folder');
  const charFiles = characters.filter((c) => c.nodeType !== 'folder');
  const memoFiles = memos.filter((m) => m.nodeType !== 'folder');
  const writingFiles = writings.filter((w) => w.nodeType !== 'folder');

  if (plotFiles.length) {
    lines.push('');
    lines.push(`### プロット一覧（${plotFiles.length}件）`);
    for (const plot of plotFiles) {
      lines.push(`- ${plot.name} (id: ${plot.id})${plot.synopsis ? ` — ${plot.synopsis.slice(0, 80)}` : ''}`);
    }
  }

  if (charFiles.length) {
    lines.push('');
    lines.push(`### キャラクター一覧（${charFiles.length}件）`);
    for (const char of charFiles) {
      lines.push(`- ${char.name} (id: ${char.id})${char.role ? ` — ${char.role}` : ''}`);
    }
  }

  if (memoFiles.length) {
    lines.push('');
    lines.push(`### メモ一覧（${memoFiles.length}件）`);
    for (const memo of memoFiles) {
      lines.push(`- ${memo.name} (id: ${memo.id})${memo.tags?.length ? ` [${memo.tags.join(', ')}]` : ''}`);
    }
  }

  if (writingFiles.length) {
    lines.push('');
    lines.push(`### 執筆一覧（${writingFiles.length}件）`);
    for (const writing of writingFiles) {
      lines.push(`- ${writing.name} (id: ${writing.id}) — ${writing.wordCount}文字`);
    }
  }

  return lines.join('\n');
}

/**
 * アクティブタブのコンテンツ全文を取得してシステムプロンプト用テキストに変換
 */
export async function fetchActiveTabContent(
  context: AIChatContext | undefined,
  adapters: ToolAdapters,
): Promise<string> {
  if (!context?.openTabs?.length) return '';

  const activeTab = context.openTabs.find((t) => t.active);
  if (!activeTab) return '';

  const contentTypeLabels: Record<string, string> = {
    plot: 'プロット',
    character: 'キャラクター',
    memo: 'メモ',
    writing: '執筆',
  };

  let content = '';
  switch (activeTab.contentType) {
    case 'plot': {
      const plot = await adapters.plots.getById(activeTab.id);
      if (plot) {
        const fields: string[] = [];
        if (plot.synopsis) fields.push(`あらすじ: ${plot.synopsis}`);
        if (plot.setting) fields.push(`舞台設定: ${plot.setting}`);
        if (plot.theme) fields.push(`テーマ: ${plot.theme}`);
        if (plot.structure) fields.push(`構成: ${plot.structure}`);
        if (plot.conflict) fields.push(`対立・葛藤: ${plot.conflict}`);
        if (plot.resolution) fields.push(`結末: ${plot.resolution}`);
        if (plot.notes) fields.push(`備考: ${plot.notes}`);
        content = fields.join('\n');
      }
      break;
    }
    case 'character': {
      const char = await adapters.characters.getById(activeTab.id);
      if (char) {
        const fields: string[] = [];
        if (char.aliases) fields.push(`別名: ${char.aliases}`);
        if (char.role) fields.push(`役職・立場: ${char.role}`);
        if (char.gender) fields.push(`性別: ${char.gender}`);
        if (char.age) fields.push(`年齢: ${char.age}`);
        if (char.appearance) fields.push(`外見: ${char.appearance}`);
        if (char.personality) fields.push(`性格: ${char.personality}`);
        if (char.background) fields.push(`経歴: ${char.background}`);
        if (char.motivation) fields.push(`動機・目的: ${char.motivation}`);
        if (char.relationships) fields.push(`人間関係: ${char.relationships}`);
        if (char.notes) fields.push(`備考: ${char.notes}`);
        content = fields.join('\n');
      }
      break;
    }
    case 'memo': {
      const memo = await adapters.memos.getById(activeTab.id);
      if (memo) {
        content = memo.content;
        if (memo.tags?.length) content = `タグ: ${memo.tags.join(', ')}\n\n${content}`;
      }
      break;
    }
    case 'writing': {
      const writing = await adapters.writings.getById(activeTab.id);
      if (writing) {
        content = writing.content;
      }
      break;
    }
  }

  if (!content) return '';

  const label = contentTypeLabels[activeTab.contentType] ?? activeTab.contentType;
  return `\n\n## 現在編集中のコンテンツ\n[${label}] ${activeTab.name} (id: ${activeTab.id})\n\n\`\`\`\n${content}\n\`\`\``;
}
