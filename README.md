# Tsumugi

AIアシスタントを搭載した小説エディタです。

> ⚠️ **開発初期段階**: 現在開発を開始したばかりで、まだ動作しません。

## 目指しているもの

- AIアシスタントによる執筆支援機能
- デスクトップアプリ（現在開発中）
- Webサービス（予定）
- モバイルアプリ（予定）

## 技術スタック

- **Runtime**: Node.js 22.22.0
- **Package Manager**: npm 11.6.4
- **Monorepo**: Turborepo
- **Frontend**: React 19, React Router V7
- **UI**: TailwindCSS 4, Radix UI
- **Build**: Vite, tsup
- **Linter/Formatter**: ESLint, Prettier

## ディレクトリ構成

```
tsumugi/
├── apps/
│   └── desktop/          # デスクトップアプリ (React Router)
├── packages/
│   └── ui/               # 共通UIコンポーネント
├── turbo.json            # Turborepo設定
└── package.json          # ルートパッケージ
```

## 開発環境構築

### 前提条件

- Node.js 22.x
- npm 11.x

> 💡 [mise](https://mise.jdx.dev/) を使用すると、`mise trust` でプロジェクトに適したバージョンを自動でセットアップできます。

### セットアップ

```bash
# リポジトリをクローン
git clone git@github.com:takecchi/tsumugi.git
cd tsumugi

# 依存関係をインストール
npm install
```

## 起動方法

### 開発サーバー

```bash
# 全パッケージの開発サーバーを起動
npm run dev

# Storybookを起動（UIコンポーネント開発）
npm run storybook
```

### その他のコマンド

```bash
# ビルド
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
