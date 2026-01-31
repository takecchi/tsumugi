# @tsumugi/adapter-local

ローカルファイルシステムベースのアダプター実装。Tauri デスクトップアプリ向け。

## ディレクトリ構成

```
src/
├── adapter.ts              # createAdapter() — 統合アダプターのファクトリ
├── index.ts                # パッケージの公開 API（export はここだけ）
├── adapters/               # アダプター（外部 IF の実装）
│   ├── ai.ts               #   AI チャット（createAIAdapter）
│   ├── ai-tools.ts         #   AI ツール定義（Vercel AI SDK tool()）
│   ├── character.ts        #   キャラクター CRUD
│   ├── memo.ts             #   メモ CRUD
│   ├── plot.ts             #   プロット CRUD
│   ├── project.ts          #   プロジェクト CRUD
│   ├── settings.ts         #   プロジェクト設定
│   └── writing.ts          #   執筆 CRUD
└── internal/               # 内部実装（外部に export しない）
    ├── helpers/            #   AI adapter の内部ヘルパー・ピュアロジック
    │   ├── ai-context.ts   #     プロジェクトサマリー・アクティブタブ取得
    │   ├── ai-logic.ts     #     AI メッセージ変換・コンフリクト検出等
    │   ├── ai-memory.ts    #     AI メモリ管理（読み書き）
    │   ├── ai-model.ts     #     LLM モデル生成
    │   ├── ai-proposal.ts  #     提案承認ロジック（コンフリクト検出・データ更新）
    │   ├── ai-session.ts   #     セッション I/O ヘルパー（提案ステータス操作等）
    │   ├── ai-stream.ts    #     ストリーミングチャット処理
    │   ├── ai-summary.ts   #     会話要約・タイトル生成
    │   └── ai-tools-logic.ts #   ツール用差分計算
    └── utils/              #   共通ユーティリティ
        ├── fs.ts           #     ファイル I/O（Tauri プラグインのラッパー）
        ├── id.ts           #     ID・タイムスタンプ生成
        ├── path.ts         #     パス操作
        └── project-index.ts #    プロジェクト一覧スキャン
```

## 設計方針

- **`adapters/`** にはアダプターのファクトリ関数のみ配置する
- **`internal/`** は外部に export しない内部実装。`index.ts` からは一切参照しない
- **`internal/helpers/`** は AI adapter の内部ヘルパー（I/O を含むものとピュアロジックの両方）
- **`internal/utils/`** は全アダプターが共通で使うユーティリティ
- ファイル I/O は全て `internal/utils/fs.ts` 経由で行い、テスト時にモック可能にする
- ピュアロジックにはテスト（`*.spec.ts`）を同ディレクトリに配置する
- 詳細なコーディングルールは `.windsurf/coding-rules.md` を参照
