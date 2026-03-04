# コンポーネント設計ルール

### hooks はコンポーネントに閉じ込める
- SWR hooks や adapter 呼び出しは、それを必要とするコンポーネント内で直接呼ぶ
- 親コンポーネントに hooks をまとめて props で渡すパターンは避ける
- 各コンポーネントが自分のデータ取得に責任を持つ

### 例: AI チャットパネル
```
WorkspaceAiPanel              ← セッション一覧 + 切り替え（useAISessions）
  NewSessionContent           ← sessionId 未確定。初回送信 → createSession（useCreateAISession）
  ExistingSessionContent      ← sessionId 確定後にマウント（useAIMessages, useAIChat, useAcceptProposal, useRejectProposal）
```

**NG パターン:**
```
WorkspaceAiPanel ← ここに全部の hooks を集めて props で渡す
  AiPanelContent ← props だけ受け取る
```

```
WorkspaceAiPanelContent ← sessionId?: string で undefined を許容し、hooks 内で null キーを使う
```

### コンポーネント分割の基準
- データソースが異なるなら別コンポーネントにする
- sessionId のような ID が確定してから子コンポーネントをマウントする（条件付きレンダリング）
- UI コンポーネント（packages/ui）はデータ取得しない。adapter 依存は apps 側のラッパーコンポーネントで行う
