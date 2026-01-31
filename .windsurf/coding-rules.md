# コーディングルール

このドキュメントはAIアシスタント向けの必須ルールです。コード変更時は必ず従ってください。

## 1. テストコード

- **ロジックを含むコードには必ずテストを書くこと**
- テストフレームワーク: `packages/adapter/local` は Jest
- テストファイルは対象ファイルと同じディレクトリに `*.spec.ts` で配置
- ロジックは可能な限りピュアロジック（副作用なし）として分離し、ユニットテストを書く
- I/O を含む関数は、I/O 部分を薄いラッパーにしてロジック部分をテスト可能にする

### テスト不要なケース

- 型定義のみのファイル（`types.ts` 等）
- 単純な CRUD ラッパー（JSON の読み書きだけ、ロジックがないもの）
- UI コンポーネント（`packages/ui`）はストーリーでカバー

## 2. ファイル I/O の集約

- **ファイルの読み書きは全て `@/utils/fs.ts` 経由にすること**
- Tauri プラグイン（`@tauri-apps/plugin-fs`, `@tauri-apps/api/path`）を直接 import しない
- これにより `jest.mock('@/utils/fs')` でテスト時にモック可能になる
- AI SDK（`ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`）は直接利用 OK

## 3. 型安全

### 禁止事項

- **`any` は禁止**
- **`as unknown`、`as never` のインライン使用は禁止**
- **`as any` は禁止**

### 許可される型変換パターン

型変換が必要な場合は、**専用の変換関数または型チェック関数**を定義すること:

```typescript
// ✅ OK: 変換関数を定義
function toCharacter(json: CharacterJson, fullPath: string): Character {
  return {
    id: fullPath,
    projectId: getProjectIdFromPath(fullPath),
    // ... 明示的にフィールドをマッピング
  };
}

// ✅ OK: 型チェック関数を定義
function isProposalMessage(m: MessageJson): m is ProposalMessageJson {
  return m.messageType === 'proposal' && m.proposal != null;
}

// ✅ OK: 変換関数・型チェック関数の内部では as unknown を使ってよい
function toRecord(obj: ContentBase): Record<string, unknown> {
  return obj as unknown as Record<string, unknown>;
}

// ❌ NG: インラインで as unknown, as never を使う
const record = current as unknown as Record<string, unknown>;
await adapters.plots.create(createData as never);
```

## 4. 処理の分離と共通化

### 原則

- **処理は可能な限り分離する**
- 責務と IF（インターフェース）をしっかり分けることでテストしやすくバグも減る
- 共通化できるロジックは共通関数に抽出する

### ファイル分割の基準

- 1 ファイルが **500 行を超えたら分割を検討** する
- 異なる責務が混在していたら分割する
- 分割先の命名例: `ai.ts` → `ai-memory.ts`, `ai-prompt.ts`, `ai-model.ts` 等

### ピュアロジック分離パターン

```
adapters/ai.ts          ← I/O + オーケストレーション（薄く）
utils/ai-logic.ts       ← ピュアロジック（テスト付き）
utils/ai-tools-logic.ts ← ピュアロジック（テスト付き）
```

- I/O（ファイル読み書き、API 呼び出し）を含む関数は `adapters/` に置く
- ピュアロジック（入力→出力の変換、判定、構築）は `utils/` に分離してテストを書く
- `adapters/` の関数は `utils/` のピュアロジックを呼び出す薄いラッパーにする

## 5. エクスポートスタイル

- **型・関数・コンポーネント・定数のエクスポートは、定義に直接 `export` を付けること**
- **末尾にまとめて `export { ... }` や `export type { ... }` と書くスタイルは禁止**
- `index.ts` 等での再エクスポート（`export { ... } from '...'` / `export * from '...'`）は OK

```typescript
// ✅ OK: 定義に直接 export
export interface FooProps {
  name: string;
}

export function Foo({ name }: FooProps) {
  return <div>{name}</div>;
}

export const BAR = 42;

// ❌ NG: 末尾にまとめてエクスポート
interface FooProps { name: string; }
function Foo({ name }: FooProps) { return <div>{name}</div>; }
const BAR = 42;

export { Foo, BAR };
export type { FooProps };
```

## 6. 既存パターンへの準拠

新しいコードを書く際は、既存の実装パターンに合わせること:

- **Json→型変換**: `XxxJson` 型 + `toXxx()` 変換関数パターン（`new Date()` 変換含む）
- **SWR hooks**: `.windsurf/swr-hooks.md` のルールに従う
- **UI コンポーネント**: `.windsurf/ui-stories.md` のルールに従う
- **コンポーネント設計**: `.windsurf/component-design.md` のルールに従う
