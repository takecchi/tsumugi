# @tsumugi/adapter

Tsumugiのデータアクセス層を抽象化するアダプターパッケージ群です。

## パッケージ構成

| パッケージ | 説明 |
|-----------|------|
| `@tsumugi/adapter` | インターフェース定義とスタブ実装（`@tsumugi/adapter-core`） |
| `@tsumugi/adapter-api` | バックエンドAPI実装（Web / Tauri シェル共通） |

> ローカルファイルベースの実装（`@tsumugi/adapter-local`）は保守負荷の観点から廃止しました。
> アダプターという抽象化の仕組み自体は維持しているため、将来的に別実装を追加することは可能です。

## 設計思想

アプリケーションコードは常に `@tsumugi/adapter` からインポートし、ビルド時にエイリアスで実装を切り替えます。現在の実装は `@tsumugi/adapter-api` のみです。

```
開発時: @tsumugi/adapter (コード上)
     ↓ ビルド時にエイリアス置換
ビルド時: @tsumugi/adapter-api (バックエンドAPI用)
```

## 使い方

### 1. インストール

```bash
npm install @tsumugi/adapter @tsumugi/adapter-api
```

### 2. アプリケーションコード

```typescript
import { createAdapter } from '@tsumugi/adapter';
import type { Project, Node } from '@tsumugi/adapter';

// アダプターを作成（バックエンドのベースURLを指定）
const adapter = createAdapter({
  api: { baseUrl: 'http://localhost:8080' },
});

// プロジェクト作成
const project = await adapter.projects.create({ name: '新しい小説' });

// プロジェクト操作
const projects = await adapter.projects.getAll();
await adapter.projects.update(project.id, { name: '改名した小説' });
await adapter.projects.delete(project.id);

// ノード操作（フォルダ・ファイル）
const tree = await adapter.plots.getTreeByProjectId(project.id);

// その他のアダプター
adapter.plots       // プロット
adapter.characters  // キャラクター
adapter.memos       // メモ
adapter.writings    // 執筆（本文）
adapter.ai          // AIチャット
adapter.export      // エクスポート
```

### 3. ビルド設定（Vite）

```typescript
// vite.config.ts
export default defineConfig({
  resolve: {
    alias: {
      '@tsumugi/adapter': '@tsumugi/adapter-api',
    },
  },
});
```

## API リファレンス

### AdapterConfig

```typescript
interface AdapterConfig {
  api?: ApiAdapterConfig;  // Web APIアダプター設定
}

interface ApiAdapterConfig {
  baseUrl: string;  // APIエンドポイント
}
```

### Adapter

```typescript
interface Adapter {
  readonly auth: AuthAdapter;
  readonly projects: ProjectAdapter;
  readonly settings: ProjectSettingsAdapter;
  readonly plots: PlotAdapter;
  readonly characters: CharacterAdapter;
  readonly memos: MemoAdapter;
  readonly writings: WritingAdapter;
  readonly ai: AIAdapter;
  readonly export: ExportAdapter;
}
```

### ProjectAdapter

```typescript
interface ProjectAdapter {
  getAll(): Promise<Project[]>;
  getById(id: string): Promise<Project | null>;
  create(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project>;
  update(id: string, data: Partial<...>): Promise<Project>;
  delete(id: string): Promise<void>;
}
```

### NodeAdapterBase

各コンテンツ（Plot / Character / Memo / Writing）のアダプターが継承する共通インターフェース。

```typescript
interface NodeAdapterBase<T extends Node> {
  getByProjectId(projectId: string): Promise<T[]>;
  getTreeByProjectId(projectId: string): Promise<TreeNode[]>;
  getById(id: string): Promise<T | null>;
  create(data: ...): Promise<T>;
  update(id: string, data: ...): Promise<T>;
  delete(id: string): Promise<void>;
  move(id: string, newParentId: string | null, newOrder: number): Promise<T>;
  reorder(parentId: string | null, ids: string[]): Promise<void>;
}
```

### その他のアダプター

- **PlotAdapter** - プロット（あらすじ、構成）
- **CharacterAdapter** - キャラクター設定
- **MemoAdapter** - メモ
- **WritingAdapter** - 執筆本文
- **AIAdapter** - AIチャット（ストリーミング）、提案の承認/拒否、メモリ、トークン使用量
- **ConsistencyAdapter** - 矛盾チェック（ストリーミング）
- **GlossaryAdapter** - 用語集
- **InstructionAdapter** - 執筆指示（カスタムインストラクション）
- **AuthAdapter** - 認証（Google OAuth）
- **ExportAdapter** - プロジェクトのエクスポート

## データ型

### Project

```typescript
interface Project {
  id: string;
  name: string;
  synopsis?: string;
  theme?: string;
  goal?: string;
  targetWordCount?: number;
  targetAudience?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Node

```typescript
type ContentType = 'plot' | 'character' | 'memo' | 'writing';
type NodeType = 'folder' | ContentType;

interface Node {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  nodeType: NodeType;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

interface TreeNode extends Node {
  children?: TreeNode[];
}
```

## 新しいアダプターの実装

`@tsumugi/adapter`のインターフェース（`Adapter`）を満たす`createAdapter`関数をエクスポートしてください。

```typescript
import type { Adapter, AdapterConfig } from '@tsumugi/adapter';

export function createAdapter(config: AdapterConfig): Adapter {
  // config を元に各アダプターを構築して返す
  return {
    auth: /* ... */,
    projects: /* ... */,
    // ...
  };
}
```
