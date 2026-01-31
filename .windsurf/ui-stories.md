# packages/ui の Story ルール

### 新規コンポーネント作成時
- コンポーネントと同じディレクトリに `*.stories.tsx` を必ず作成する
- 既存の story（例: `plot-editor.stories.tsx`）のパターンに合わせる

### Story の構成（必須）
1. **Default** — 代表的なデータを表示する基本ストーリー
2. **Empty** — 空またはデフォルト状態のストーリー
3. **Interactive** — `useState` で state を管理し、ユーザー操作を反映するストーリー

### 既存コンポーネント更新時
- フィールド追加・型変更があった場合は story の mockData も更新する
- 関連する story（例: workspace-layout.stories.tsx）に影響がある場合はそちらも更新する

### 共通設定
```tsx
const meta = {
  title: "Features/コンポーネント名",
  component: コンポーネント,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ height: "600px" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof コンポーネント>;
```

### 注意事項
- packages/ui は adapter に依存しない。Story では mock データを直接定義する
- 型は story ファイル内で import し、mockData の型を明示する
