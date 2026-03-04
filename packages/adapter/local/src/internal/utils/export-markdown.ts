import type {
  Project,
  Writing,
  Plot,
  Character,
  Memo,
  Node,
} from '@tsumugi/adapter';

export interface ZipEntry {
  /** zip 内のパス（プロジェクト名ディレクトリより下の相対パス） */
  path: string;
  content: string;
}

/**
 * ファイルシステムで安全なファイル名に変換する。
 * スラッシュ等の特殊文字は `-` に置換し、連続する `-` はまとめる。
 */
export function sanitizeFileName(name: string): string {
  return (
    name
      .replace(/[/\\:*?"<>|]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .trim() || 'untitled'
  );
}

/**
 * order を4桁ゼロパディングでフォーマットする。
 * 例: 0 → "0000", 42 → "0042"
 */
export function formatOrder(order: number): string {
  return String(order).padStart(4, '0');
}

/**
 * ノードのパスセグメントを生成する（拡張子なし）。
 * 例: order=3, name="第一章" → "0003_第一章"
 */
export function buildSegment(order: number, name: string): string {
  return `${formatOrder(order)}_${sanitizeFileName(name)}`;
}

/**
 * ノードの zip パスを再帰的に計算する（拡張子なし）。
 * 親ノードが存在する場合はそのパスをプレフィックスとして結合する。
 */
function getNodeZipPath(node: Node, nodeMap: Map<string, Node>): string {
  const segment = buildSegment(node.order, node.name);
  if (node.parentId === null) return segment;
  const parent = nodeMap.get(node.parentId);
  if (!parent) return segment;
  return `${getNodeZipPath(parent, nodeMap)}/${segment}`;
}

/**
 * プロジェクト概要の README.md コンテンツを生成する。
 */
export function buildProjectReadme(project: Project): string {
  const lines: string[] = [`# ${project.name}`, ''];
  if (project.synopsis) lines.push('## あらすじ', '', project.synopsis, '');
  if (project.theme) lines.push('## テーマ', '', project.theme, '');
  if (project.goal) lines.push('## ゴール', '', project.goal, '');
  if (project.targetWordCount != null)
    lines.push('## 目標文字数', '', String(project.targetWordCount), '');
  if (project.targetAudience)
    lines.push('## 対象読者', '', project.targetAudience, '');
  return lines.join('\n');
}

/**
 * Writing の markdown コンテンツを生成する。
 */
export function buildWritingMarkdown(writing: Writing): string {
  const lines: string[] = [`# ${writing.name}`, ''];
  if (writing.content) lines.push(writing.content);
  return lines.join('\n');
}

/**
 * Plot の markdown コンテンツを生成する。
 */
export function buildPlotMarkdown(plot: Plot): string {
  const lines: string[] = [`# ${plot.name}`, ''];
  if (plot.synopsis) lines.push('## あらすじ', '', plot.synopsis, '');
  if (plot.setting) lines.push('## 舞台設定', '', plot.setting, '');
  if (plot.theme) lines.push('## テーマ', '', plot.theme, '');
  if (plot.structure) lines.push('## 構成', '', plot.structure, '');
  if (plot.conflict) lines.push('## 葛藤', '', plot.conflict, '');
  if (plot.resolution) lines.push('## 解決', '', plot.resolution, '');
  if (plot.notes) lines.push('## ノート', '', plot.notes, '');
  return lines.join('\n');
}

/**
 * Character の markdown コンテンツを生成する。
 * 基本情報はテーブル形式、詳細説明はセクション形式で出力する。
 */
export function buildCharacterMarkdown(character: Character): string {
  const lines: string[] = [`# ${character.name}`, ''];

  const tableRows: string[] = [];
  if (character.role) tableRows.push(`| 役割 | ${character.role} |`);
  if (character.gender) tableRows.push(`| 性別 | ${character.gender} |`);
  if (character.age) tableRows.push(`| 年齢 | ${character.age} |`);
  if (character.aliases) tableRows.push(`| 別名 | ${character.aliases} |`);

  if (tableRows.length > 0) {
    lines.push('| 項目 | 内容 |', '|------|------|', ...tableRows, '');
  }

  if (character.appearance) lines.push('## 外見', '', character.appearance, '');
  if (character.personality)
    lines.push('## 性格', '', character.personality, '');
  if (character.background) lines.push('## 背景', '', character.background, '');
  if (character.motivation) lines.push('## 動機', '', character.motivation, '');
  if (character.relationships)
    lines.push('## 人間関係', '', character.relationships, '');
  if (character.notes) lines.push('## ノート', '', character.notes, '');

  return lines.join('\n');
}

/**
 * Memo の markdown コンテンツを生成する。
 */
export function buildMemoMarkdown(memo: Memo): string {
  const lines: string[] = [`# ${memo.name}`, ''];
  if (memo.tags && memo.tags.length > 0) {
    lines.push(`タグ: ${memo.tags.join(', ')}`, '');
  }
  if (memo.content) lines.push(memo.content);
  return lines.join('\n');
}

/**
 * Writing のフラットリストから ZipEntry[] を生成する。
 * フォルダノードは除外し、コンテンツノードのみ出力する。
 */
export function buildWritingEntries(writings: Writing[]): ZipEntry[] {
  const nodeMap = new Map<string, Node>(writings.map((w) => [w.id, w]));
  return writings
    .filter((w) => w.nodeType !== 'folder')
    .map((w) => ({
      path: `writings/${getNodeZipPath(w, nodeMap)}.md`,
      content: buildWritingMarkdown(w),
    }));
}

/**
 * Plot のフラットリストから ZipEntry[] を生成する。
 */
export function buildPlotEntries(plots: Plot[]): ZipEntry[] {
  const nodeMap = new Map<string, Node>(plots.map((p) => [p.id, p]));
  return plots
    .filter((p) => p.nodeType !== 'folder')
    .map((p) => ({
      path: `plots/${getNodeZipPath(p, nodeMap)}.md`,
      content: buildPlotMarkdown(p),
    }));
}

/**
 * Character のフラットリストから ZipEntry[] を生成する。
 */
export function buildCharacterEntries(characters: Character[]): ZipEntry[] {
  const nodeMap = new Map<string, Node>(characters.map((c) => [c.id, c]));
  return characters
    .filter((c) => c.nodeType !== 'folder')
    .map((c) => ({
      path: `characters/${getNodeZipPath(c, nodeMap)}.md`,
      content: buildCharacterMarkdown(c),
    }));
}

/**
 * Memo のフラットリストから ZipEntry[] を生成する。
 */
export function buildMemoEntries(memos: Memo[]): ZipEntry[] {
  const nodeMap = new Map<string, Node>(memos.map((m) => [m.id, m]));
  return memos
    .filter((m) => m.nodeType !== 'folder')
    .map((m) => ({
      path: `memos/${getNodeZipPath(m, nodeMap)}.md`,
      content: buildMemoMarkdown(m),
    }));
}
