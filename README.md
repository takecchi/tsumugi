# Tsumugi

AIアシスタントを搭載した小説エディタです。

> 🚧 **プロトタイプ段階**: 基本機能は動作しますが、まだ開発中です。

## 機能

### コンテンツ管理
- **プロジェクト管理** — 作品単位でプロジェクトを作成・管理
- **執筆エディタ** — 本文の執筆、文字数カウント
- **プロットエディタ** — あらすじ・設定・テーマ・構成・葛藤・結末の管理
- **登場人物エディタ** — 名前・役割・外見・性格・背景・動機・関係性の管理
- **メモエディタ** — 自由記述メモ、タグ付き検索
- **ツリー構造** — 各コンテンツをフォルダ/ファイルで階層管理、ドラッグ&ドロップ並べ替え

### AIアシスタント
- **質問モード（ask）** — 作品に関する質問・相談
- **執筆モード（write）** — AIによる文章の提案・編集
- **提案システム** — AIが変更を提案 → 承認/拒否で反映（行単位の差分表示対応）
- **コンテキスト認識** — 開いているタブの情報をAIに自動共有
- **OpenAI / Anthropic** — プロバイダー切り替え対応

### UI
- **リサイズ可能な3ペインレイアウト** — サイドバー・エディタ・AIパネル
- **タブ管理** — 複数コンテンツの同時編集
- **Storybook** — UIコンポーネントのカタログ

## 技術スタック

- **Runtime**: Node.js 22.x
- **Package Manager**: npm 11.x
- **Monorepo**: Turborepo
- **Desktop**: Tauri 2
- **Frontend**: React 19, React Router v7
- **State**: SWR（キャッシュ + オプティミスティック更新）
- **AI**: Vercel AI SDK（OpenAI / Anthropic）
- **UI**: TailwindCSS 4, Radix UI
- **Build**: Vite, tsup
- **Linter/Formatter**: ESLint, Prettier

## ディレクトリ構成

```
tsumugi/
├── apps/
│   └── desktop/              # デスクトップアプリ (Tauri + React Router)
│       ├── app/
│       │   ├── hooks/        # SWR hooks（データ取得・更新）
│       │   └── routes/       # ページコンポーネント
│       └── src-tauri/        # Tauri バックエンド (Rust)
├── packages/
│   ├── adapter/
│   │   ├── core/             # アダプターインターフェース・型定義
│   │   ├── local/            # ローカルファイルシステム実装（Tauri）
│   │   └── api/              # APIサーバー実装（Web）
│   ├── react-router/         # React Router ユーティリティ
│   └── ui/                   # 共通UIコンポーネント（Storybook付き）
├── turbo.json
└── package.json
```

## 開発環境構築

### 前提条件

- Node.js 22.x
- npm 11.x
- rust 1.90.x

> 💡 [mise](https://mise.jdx.dev/) を使用すると、`mise trust` でプロジェクトに適したバージョンを自動でセットアップできます。

### セットアップ

```bash
# リポジトリをクローン
git clone git@github.com:takecchi/tsumugi.git
cd tsumugi

# 依存関係をインストール
npm install

# 環境変数を設定
cp apps/desktop/.env apps/desktop/.env.local
# .env.local を編集
#   VITE_AI_API_KEY   — AIプロバイダーのAPIキー（Tauriモード時）
#   VITE_API_BASE_URL — バックエンドAPIのURL（Webモード時、デフォルト: http://localhost:8080）
```

## 起動方法

### 開発サーバー

```bash
# Tauri デスクトップアプリを起動（ローカルファイルシステム + AI SDK直接呼び出し）
npm run dev:tauri

# Web モードで起動（バックエンドAPIサーバー経由）
npm run dev:web

# Storybookを起動（UIコンポーネント開発）
npm run storybook
```

`dev:tauri` と `dev:web` の違いは `VITE_ADAPTER` 環境変数のみです。

| | `dev:tauri` | `dev:web` |
|---|---|---|
| **アダプター** | `@tsumugi/adapter-local` | `@tsumugi/adapter-api` |
| **データ保存** | Tauri FS（ローカルファイル） | バックエンド API |
| **AI** | フロントエンドから直接呼び出し | バックエンド経由 |

### その他のコマンド

```bash
# Tauriプロダクションビルド（依存パッケージのビルド含む）
npm run build:tauri

# 全パッケージビルド
npm run build

# Lint
npm run lint

# 型チェック
npm run tsc

# テスト
npm run test

# フォーマット
npm run format
```

## ライセンス

ISC
