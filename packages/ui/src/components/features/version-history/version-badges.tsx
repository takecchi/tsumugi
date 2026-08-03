import { cn } from '@/lib/utils';
import type {
  CommitTypeValue,
  DiffChangeTypeValue,
  RevisionEntryTypeValue,
} from '@/lib/version-history-utils';

/** コミット種別ごとの見た目とラベル */
export const COMMIT_TYPE_META: Record<
  CommitTypeValue,
  { label: string; className: string }
> = {
  manual: {
    label: '保存',
    className:
      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  },
  auto: {
    label: '自動保存',
    className: 'bg-muted text-muted-foreground',
  },
  backup: {
    label: 'バックアップ',
    className:
      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  },
  restore: {
    label: '復元',
    className:
      'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  },
};

/**
 * コミット種別のバッジ（保存 / 自動保存 / バックアップ / 復元）
 */
export function CommitTypeBadge({
  commitType,
  className,
}: {
  commitType: CommitTypeValue;
  className?: string;
}) {
  const meta = COMMIT_TYPE_META[commitType];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-xs font-medium',
        meta.className,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}

/** 差分の変更種別ごとの見た目とラベル */
export const CHANGE_TYPE_META: Record<
  DiffChangeTypeValue,
  { label: string; symbol: string; className: string }
> = {
  added: {
    label: '追加',
    symbol: '+',
    className:
      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  },
  modified: {
    label: '変更',
    symbol: '~',
    className:
      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  },
  removed: {
    label: '削除',
    symbol: '−',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  },
};

/**
 * 差分エントリの変更種別バッジ（追加 / 変更 / 削除）
 */
export function ChangeTypeBadge({
  changeType,
  className,
}: {
  changeType: DiffChangeTypeValue;
  className?: string;
}) {
  const meta = CHANGE_TYPE_META[changeType];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium',
        meta.className,
        className,
      )}
    >
      <span aria-hidden className="font-mono">
        {meta.symbol}
      </span>
      {meta.label}
    </span>
  );
}

/** 差分エントリの対象種別ラベル */
export const ENTRY_TYPE_LABELS: Record<RevisionEntryTypeValue, string> = {
  project: 'プロジェクト',
  node: 'ノード',
  instruction: '執筆指示',
  glossary_term: '用語',
};

/** ノード種別ラベル */
export const NODE_TYPE_LABELS: Record<string, string> = {
  folder: 'フォルダ',
  plot: 'プロット',
  character: 'キャラクター',
  memo: 'メモ',
  writing: '執筆',
};

/**
 * 差分エントリの見出しに出す種別ラベル。
 * ノードの場合はノード種別（執筆 / プロット等）を優先して表示する。
 */
export function entryKindLabel(
  entryType: RevisionEntryTypeValue,
  nodeType: string | null,
): string {
  if (entryType === 'node' && nodeType !== null) {
    return NODE_TYPE_LABELS[nodeType] ?? nodeType;
  }
  return ENTRY_TYPE_LABELS[entryType];
}

/**
 * 差分に現れるフィールド名の表示ラベル。
 * バックエンドは snake_case で返すが、表記揺れに備えて camelCase も引けるようにしている。
 */
export const DIFF_FIELD_LABELS: Record<string, string> = {
  name: '名前',
  content: '本文',
  synopsis: 'あらすじ',
  setting: '舞台設定',
  theme: 'テーマ',
  structure: '構成',
  conflict: '対立・葛藤',
  resolution: '結末',
  notes: '備考',
  aliases: '別名',
  role: '役職',
  gender: '性別',
  age: '年齢',
  appearance: '外見',
  personality: '性格',
  background: '経歴',
  motivation: '動機',
  relationships: '人間関係',
  tags: 'タグ',
  goal: '目標',
  reading: '読み',
  term: '用語',
  title: 'タイトル',
  enabled: '有効',
  order: '表示順',
  parent_id: '親ノード',
  parentId: '親ノード',
  node_type: '種別',
  nodeType: '種別',
  word_count: '文字数',
  wordCount: '文字数',
  canon_status: '正典ステータス',
  canonStatus: '正典ステータス',
  context_policy: 'AIコンテキスト',
  contextPolicy: 'AIコンテキスト',
  target_audience: '想定読者',
  targetAudience: '想定読者',
  target_word_count: '目標文字数',
  targetWordCount: '目標文字数',
};

/**
 * フィールド名を日本語ラベルに変換する（未知のフィールドはそのまま返す）
 */
export function fieldLabel(field: string): string {
  return DIFF_FIELD_LABELS[field] ?? field;
}

/**
 * `YYYY-MM-DD` を「2026年8月4日」形式の見出しにする。
 * ロケール API を使わないためタイムゾーンに依存しない。
 */
export function formatDateHeading(dateKey: string): string {
  const [year, month, day] = dateKey.split('-');
  if (year === undefined || month === undefined || day === undefined) {
    return dateKey;
  }
  return `${year}年${Number(month)}月${Number(day)}日`;
}

/**
 * 時刻（HH:MM）だけを表示する
 */
export function formatTimeOfDay(date: Date): string {
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
}
