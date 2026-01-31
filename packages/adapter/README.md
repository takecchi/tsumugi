# @tsumugi/adapter

Tsumugiのデータアクセス層を抽象化するアダプターパッケージ群です。

## パッケージ構成

| パッケージ | 説明 |
|-----------|------|
| `@tsumugi/adapter` | インターフェース定義とスタブ実装 |
| `@tsumugi/adapter-local` | Tauri用ローカルファイルベース実装 |

## 設計思想

アプリケーションコードは常に `@tsumugi/adapter` からインポートし、ビルド時にエイリアスで実装を切り替えます。

```
開発時: @tsumugi/adapter (コード上)
     ↓ ビルド時にエイリアス置換
ビルド時:
 - @tsumugi/adapter-local (Tauri用)
 - @tsumugi/adapter-api   (Web API用、将来実装)
```

## 使い方

### 1. インストール

```bash
npm install @tsumugi/adapter @tsumugi/adapter-local
```

### 2. アプリケーションコード

```typescript
import { createAdapter, ProjectCancelledError } from '@tsumugi/adapter';
import type { Project, Node } from '@tsumugi/adapter';

// アダプターを作成（workDir未指定時は ~/TsumugiProjects を使用）
const adapter = createAdapter();

// プロジェクト作成（Local版ではダイアログが開く）
try {
  const project = await adapter.projects.create({ name: '新しい小説' });
} catch (e) {
  if (e instanceof ProjectCancelledError) {
    // ユーザーがキャンセルした
  }
}

// プロジェクト操作
const projects = await adapter.projects.getAll();
await adapter.projects.update(project.id, { name: '改名した小説' });
await adapter.projects.delete(project.id);

// ノード操作（フォルダ・ファイル）
const tree = await adapter.nodes.getTreeByProjectId(project.id);
const folder = await adapter.nodes.createFolder({
  projectId: project.id,
  parentId: null,
  name: '第1章',
  nodeType: 'folder',
  contentType: 'writing',
  order: 0,
});

// その他のアダプター
adapter.plots       // プロット
adapter.characters  // キャラクター
adapter.memos       // メモ
adapter.writings    // 執筆（本文）
```

### 3. ビルド設定（Vite）

```typescript
// vite.config.ts
export default defineConfig({
  resolve: {
    alias: {
      '@tsumugi/adapter': '@tsumugi/adapter-local',
    },
  },
});
```

## adapter-local のセットアップ（Tauri）

### 1. 依存関係

使用するアプリの `package.json` に以下を追加:

```json
{
  "dependencies": {
    "@tauri-apps/api": "2.10.1",
    "@tauri-apps/plugin-dialog": "2.6.0",
    "@tauri-apps/plugin-fs": "2.4.5"
  }
}
```

### 2. Tauri プラグインの追加

```bash
npm run tauri add dialog
npm run tauri add fs
```

これにより `Cargo.toml` に以下が自動追加されます:

```toml
[dependencies]
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"
```

### 3. パーミッション設定

`src-tauri/capabilities/default.json` に以下を追加:

```json
{
  "permissions": [
    "core:default",
    "dialog:default",
    "dialog:allow-open",
    "dialog:allow-save",
    "fs:default",
    "fs:allow-read-text-file",
    "fs:allow-write-text-file",
    "fs:allow-exists",
    "fs:allow-mkdir",
    "fs:allow-read-dir",
    "fs:allow-remove"
  ]
}
```

## API リファレンス

### AdapterConfig

```typescript
interface AdapterConfig {
  workDir?: string;  // ワークディレクトリ（adapter-local用、未指定時は~/TsumugiProjects）
  baseUrl?: string;  // APIエンドポイント（adapter-api用）
}
```

### Adapter

```typescript
interface Adapter {
  readonly projects: ProjectAdapter;
  readonly nodes: NodeAdapter;
  readonly plots: PlotAdapter;
  readonly characters: CharacterAdapter;
  readonly memos: MemoAdapter;
  readonly writings: WritingAdapter;
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

### NodeAdapter

```typescript
interface NodeAdapter {
  getByProjectId(projectId: string): Promise<Node[]>;
  getTreeByProjectId(projectId: string): Promise<TreeNode[]>;
  getById(id: string): Promise<Node | null>;
  getChildren(parentId: string): Promise<Node[]>;
  createFolder(data: ...): Promise<FolderNode>;
  createFile(data: ...): Promise<FileNode>;
  update(id: string, data: ...): Promise<Node>;
  delete(id: string): Promise<void>;
  move(id: string, newParentId: string | null, newOrder: number): Promise<Node>;
  reorder(parentId: string | null, nodeIds: string[]): Promise<void>;
}
```

### その他のアダプター

- **PlotAdapter** - プロット（あらすじ、構成）
- **CharacterAdapter** - キャラクター設定
- **MemoAdapter** - メモ、タグ検索対応
- **WritingAdapter** - 執筆本文、文字数カウント

## データ型

### Project

```typescript
interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Node

```typescript
type NodeType = 'folder' | 'file';
type ContentType = 'plot' | 'character' | 'memo' | 'writing';

interface NodeBase {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  nodeType: NodeType;
  contentType: ContentType;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

interface FolderNode extends NodeBase {
  nodeType: 'folder';
}

interface FileNode extends NodeBase {
  nodeType: 'file';
  content: string;
}

type Node = FolderNode | FileNode;
```

## adapter-local のファイル構造

```
~/TsumugiProjects/              # workDir（デフォルト）
└── .tsumugi/
    └── projects.json           # 全プロジェクトのインデックス

{選択したプロジェクトフォルダ}/
├── .tsumugi/
│   └── project.json            # プロジェクトメタデータ・設定
├── nodes/
│   └── {nodeId}.json
├── plots/
│   └── {plotId}.json
├── characters/
│   └── {characterId}.json
├── memos/
│   └── {memoId}.json
└── writings/
    └── {writingId}.json
```

- `workDir`（デフォルト: `~/TsumugiProjects`）配下の `.tsumugi/projects.json` に全プロジェクトのインデックスを保存
- 各プロジェクトの `.tsumugi/` にはメタデータ・設定を保存
- 実際のコンテンツ（nodes, plots等）はプロジェクトフォルダ直下に保存

## 新しいアダプターの実装

`@tsumugi/adapter`のインターフェースを満たす`createAdapter`関数をエクスポートしてください。

```typescript
// @tsumugi/adapter-api の例
import type { Adapter, AdapterConfig } from '@tsumugi/adapter';

export function createAdapter(config: AdapterConfig): Adapter {
  const baseUrl = config.baseUrl;
  
  return {
    projects: {
      async getAll() {
        const res = await fetch(`${baseUrl}/projects`);
        return res.json();
      },
      // ...
    },
    // ...
  };
}
```
