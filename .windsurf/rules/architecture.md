# Tsumugi アーキテクチャ設計指針

このドキュメントはAIアシスタント向けの設計指針です。コード変更時は必ずこの原則に従ってください。

## パッケージ構成と責務

```
packages/
  adapter/
    core/     → IF定義（types, adapter interfaces, stub）
    api/      → バックエンドAPI実装（HTTP通信 + 型変換）
  ui/         → UIコンポーネント（表示のみ）
  react-router/ → ルーティング
apps/
  desktop/    → アプリ本体（Tauri シェル / ブラウザ。APIとUIをつなぐだけ）
```

> ビジネスロジック・データ永続化・AI推論はすべてバックエンド（本リポジトリ外）が担う。
> `adapter-api` はそのバックエンドと通信する薄いクライアントに徹する。
> かつて存在したローカル実装（`adapter-local`）は廃止済み。

### 責務の境界（最重要）

| レイヤー | 責務 | やってはいけないこと |
|---|---|---|
| **adapter-core** | 型定義・インターフェース定義のみ | ロジックを持たない |
| **adapter-api** | バックエンドAPIとの通信・型変換（IF実装） | ビジネスロジックをフロントに持たない、UI に依存しない |
| **packages/ui** | 表示のみ | データ取得しない、adapter に依存しない |
| **apps/desktop** | adapter と UI をつなぐだけ | ビジネスロジックを持たない |

### 判断基準

- 「この処理はバックエンド（adapter-api 経由）の仕事か？」と常に問うこと
- apps/desktop に `if` 分岐やデータ変換ロジックが増えたら、それは adapter-api / バックエンドに移すべきサイン
- adapter-core に新しい操作が必要なら、まず IF を定義してから adapter-api に実装する

## adapter パターン

### adapter-core: IF の集約

- 全ての操作は `Adapter` インターフェースに集約する
- 型は `types.ts` に、インターフェースは `adapter.ts` に定義
- `stub.ts` にスタブ実装を用意（テスト・初期化用）
- 新しい操作を追加する場合: **types.ts → adapter.ts → stub.ts** の順で追加

### adapter-api: バックエンドとの通信

- 各操作をバックエンドAPIの HTTP リクエストにマッピングする薄いクライアント
- レスポンス JSON → `@tsumugi/adapter` の型への変換（`XxxJson` + `toXxx()` パターン）に徹する
- ストリーミング（AIチャット）は SSE を `ReadableStream<AIStreamChunk>` に変換して返す
- ビジネスロジック・データ永続化・AI推論はバックエンドが担い、ここには持ち込まない

### apps/desktop: 薄いグルーレイヤー

- adapter の呼び出しと UI state の更新のみ
- SWR hooks でデータ取得、`mutate` でキャッシュ更新
- ストリーミングは `consumeStream()` で消費し、state に反映

## コンテンツモデル

```
ContentBase { id, projectId, parentId, name, nodeType, order } + Timestamps
  ├── Writing  (content, wordCount)
  ├── Plot
  ├── Character
  └── Memo     (content, tags)
```

- `NodeAdapterBase<T>`: CRUD + ツリー操作の共通インターフェース
- 永続化はバックエンドが担当。`id`, `projectId` はバックエンドが払い出す

## AI チャット設計

### モード

- `ask`: 読み取り専用。データ参照のみ
- `write`: 提案モード。`propose_create_*` / `propose_update_*` ツールで変更提案を生成

### 提案フロー（Write モード）

```
ユーザーメッセージ
  → AI がツールで提案を生成（propose_update_writing 等）
  → 提案が messageType: 'proposal' としてバックエンドに保存
  → UI に提案カードが表示（承認/拒否ボタン付き）
  → ユーザーが承認 or 拒否
  → adapter.ai.acceptProposal() or rejectProposal() が実行
  → AIに自動フィードバック送信 → AIが次のアクションを取る（ループ可能）
```

### 提案の保存

- 提案はメッセージとしてバックエンドに保存（`messageType: 'proposal'`）
- `proposalStatus`: `'pending' | 'accepted' | 'rejected' | 'conflict'`
- 承認/拒否のロジックは全てバックエンド側の `acceptProposal()` / `rejectProposal()` に集約（フロントは adapter-api 経由で呼ぶだけ）

### AIFieldChange（行単位編集）

- `replace`: フィールド全体を置換（短文フィールド向け）
- `line_edits`: 行単位で部分的に編集（長文フィールド向け、`AILineEdit[]`）
- `get_writing` は `numberedContent`（行番号付きテキスト）を返し、AIの行番号精度を向上

## コーディング規約

**詳細は `.windsurf/coding-rules.md` を参照すること。** 以下は要約:

- **`any` は禁止**、`as unknown` / `as never` のインライン使用も禁止（変換関数を定義すること）
- **ロジックには必ずテストを書く**。ピュアロジックは `internal/helpers` に分離してユニットテストを書く
- **HTTP通信とピュアロジックを分離**する（変換・組み立て部分をテスト可能にする）
- **1ファイル300行超は分割を検討**。責務ごとにファイルを分ける
- UI コンポーネント（packages/ui）は adapter-core の型に依存しない。必要なら UI 側で独自の型を定義する
- SWR hooks は各コンポーネント内で直接呼ぶ（親に集約しない）
- sessionId 等の ID が確定してから子コンポーネントをマウントする（条件付きレンダリング）
