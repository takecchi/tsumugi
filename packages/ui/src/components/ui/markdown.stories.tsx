import type { Meta, StoryObj } from "@storybook/react";
import { Markdown } from "./markdown";

const meta = {
  title: "UI/Markdown",
  component: Markdown,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "600px", width: "100%" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Markdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Headings: Story = {
  args: {
    children: `# 見出し1
## 見出し2
### 見出し3

通常のテキストが続きます。`,
  },
};

export const TextFormatting: Story = {
  args: {
    children: `**太字のテキスト** と *斜体のテキスト* を組み合わせられます。

また、~~取り消し線~~ も使えます。

\`インラインコード\` はこのように表示されます。`,
  },
};

export const Lists: Story = {
  args: {
    children: `### 箇条書き
- 項目1
- 項目2
  - ネストされた項目
- 項目3

### 番号付きリスト
1. 最初の手順
2. 次の手順
3. 最後の手順`,
  },
};

export const CodeBlock: Story = {
  args: {
    children: `コードブロックの例：

\`\`\`typescript
interface Character {
  name: string;
  age: number;
  role: "protagonist" | "antagonist";
}

function introduce(char: Character): string {
  return \`\${char.name}は\${char.age}歳の\${char.role}です。\`;
}
\`\`\``,
  },
};

export const Blockquote: Story = {
  args: {
    children: `> 「物語とは、人間の心の旅路である」
> — ある作家の言葉

この引用は物語の本質を表しています。`,
  },
};

export const Table: Story = {
  args: {
    children: `| キャラクター | 役割 | 年齢 |
|------------|------|------|
| 太郎 | 主人公 | 17 |
| 花子 | ヒロイン | 16 |
| 次郎 | ライバル | 18 |`,
  },
};

export const Link: Story = {
  args: {
    children: `詳しくは [公式ドキュメント](https://example.com) を参照してください。

[別のリンク](https://example.com/other) もあります。`,
  },
};

export const Mixed: Story = {
  args: {
    children: `## 物語の基本構成

物語は一般的に **三幕構成** で組み立てられます。

### 第一幕：設定
- 主人公の紹介
- 世界観の提示
- *きっかけとなる事件*

### 第二幕：対立
1. 障害との遭遇
2. 仲間との出会い
3. 最大の危機（ミッドポイント）

### 第三幕：解決

> 「すべての物語は、変化の物語である」— ロバート・マッキー

コードで表すと：

\`\`\`typescript
interface Story {
  act1: Setup;
  act2: Confrontation;
  act3: Resolution;
}
\`\`\`

また、\`起承転結\` という日本独自の構成法もあります。

| 構成 | 役割 |
|------|------|
| 起 | 物語の始まり |
| 承 | 展開 |
| 転 | 転換点 |
| 結 | 結末 |

---

詳しくは[こちら](https://example.com)を参照してください。`,
  },
};

const longInlineCodeContent = `長いインラインコードの例：

この文中に \`verylongvariablenamethatexceedstheparentelementwidthandcausesoverflowissues.someProperty.anotherProperty.yetAnotherOne\` という長い変数名があります。

また \`/Users/takecchi/RustroverProjects/tsumugi/packages/adapter/local/src/adapters/very-long-filename-that-overflows.ts\` のようなパスも溢れます。

通常の \`短いコード\` は問題ありません。`;

export const LongInlineCode: Story = {
  args: {
    children: longInlineCodeContent,
  },
};
