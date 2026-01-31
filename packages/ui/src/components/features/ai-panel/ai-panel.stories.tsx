import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { AiPanel, AiPanelContent, AiPanelInput, type Message, type AiMode, type Conversation } from "./ai-panel";

const meta = {
  title: "Features/AiPanel",
  component: AiPanel,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ height: "600px", width: "360px" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AiPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * モック応答付きのインタラクティブなAiPanelストーリー
 */
function MockAiPanel({
  initialConversations = [],
  initialConversationId,
  initialMessages = [],
  initialMode = "write",
}: {
  initialConversations?: Conversation[];
  initialConversationId?: string;
  initialMessages?: Message[];
  initialMode?: AiMode;
}) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(initialConversationId);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [mode, setMode] = useState<AiMode>(initialMode);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = (message: string) => {
    if (!currentConversationId) {
      const newId = Date.now().toString();
      setConversations(prev => [...prev, {
        id: newId,
        title: message.slice(0, 20) + (message.length > 20 ? "..." : ""),
        createdAt: new Date(),
        updatedAt: new Date(),
      }]);
      setCurrentConversationId(newId);
    }

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: "user",
      content: message,
    }]);
    setIsLoading(true);

    setTimeout(() => {
      if (mode === "write") {
        setMessages(prev => [...prev,
          { id: (Date.now() + 1).toString(), role: "assistant" as const, content: "以下の変更を提案します。" },
          { id: (Date.now() + 2).toString(), role: "assistant" as const, proposal: { id: "p-" + Date.now(), action: "update" as const, contentType: "writing", targetName: "第1章", original: { content: "元の文章" }, proposed: { content: { type: "replace" as const, value: "AIが提案する新しい文章です。より詳細で魅力的な表現になっています。" } }, status: "pending" as const } },
        ]);
      } else {
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant" as const, content: "ご質問にお答えします。" }]);
      }
      setIsLoading(false);
    }, 1500);
  };

  return (
    <AiPanel
      conversations={conversations}
      currentConversationId={currentConversationId}
      onNewConversation={() => { setCurrentConversationId(undefined); setMessages([]); }}
      onSelectConversation={(id) => { setCurrentConversationId(id); setMessages([]); }}
    >
      <AiPanelContent
        messages={messages}
        description={
          mode === "write"
            ? "文章の執筆をお手伝いします。\n書いてほしい内容を教えてください。"
            : "質問があればお気軽にどうぞ。"
        }
        isLoading={isLoading}
      />
      <AiPanelInput
        mode={mode}
        onModeChange={setMode}
        onSend={handleSend}
        isLoading={isLoading}
      />
    </AiPanel>
  );
}

// サンプルメッセージデータ
const sampleMessages: Message[] = [
  {
    id: "1",
    role: "user",
    content: "主人公が旅立つシーンを書いてください",
  },
  {
    id: "2",
    role: "assistant",
    content: "以下の変更を提案します。",
  },
  {
    id: "3",
    role: "assistant",
    proposal: {
      id: "p-1",
      action: "update",
      contentType: "writing",
      targetName: "第1章 旅立ち",
      original: { content: "主人公は家を出た。" },
      proposed: {
        content: { type: "replace", value: "夜明け前の静寂が街を包んでいた。主人公は窓辺に立ち、遠くに見える山々を眺めていた。「さあ、行こう」彼は小さくつぶやくと、背負った荷物を確かめ、部屋を後にした。" },
      },
      status: "pending",
    },
  },
];

const askModeMessages: Message[] = [
  {
    id: "1",
    role: "user",
    content: "この物語の主人公の性格について教えてください",
  },
  {
    id: "2",
    role: "assistant",
    content:
      "主人公は内向的で思慮深い性格です。普段は物静かですが、大切な人を守るためなら勇敢に行動します。幼少期の経験から、他人を信じることに慎重ですが、一度信頼した相手には深い絆を築きます。",
  },
];

const sampleConversations: Conversation[] = [
  {
    id: "1",
    title: "主人公の旅立ちシーン",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "2",
    title: "物語の考察",
    createdAt: new Date("2024-01-02"),
    updatedAt: new Date("2024-01-02"),
  },
];

const acceptedMessages: Message[] = [
  {
    id: "1",
    role: "user",
    content: "主人公が旅立つシーンを書いてください",
  },
  {
    id: "2",
    role: "assistant",
    proposal: {
      id: "p-2",
      action: "update",
      contentType: "writing",
      targetName: "第1章 旅立ち",
      original: { content: "主人公は家を出た。" },
      proposed: { content: { type: "replace", value: "夜明け前の静寂が街を包んでいた。主人公は窓辺に立ち、遠くに見える山々を眺めていた。" } },
      status: "accepted",
    },
  },
];

const rejectedMessages: Message[] = [
  {
    id: "1",
    role: "user",
    content: "主人公が旅立つシーンを書いてください",
  },
  {
    id: "2",
    role: "assistant",
    proposal: {
      id: "p-3",
      action: "update",
      contentType: "writing",
      targetName: "第1章 旅立ち",
      original: { content: "主人公は家を出た。" },
      proposed: { content: { type: "replace", value: "夜明け前の静寂が街を包んでいた。主人公は窓辺に立ち、遠くに見える山々を眺めていた。" } },
      status: "rejected",
    },
  },
];

export const Empty: Story = {
  render: () => <MockAiPanel />,
};

export const WriteMode: Story = {
  render: () => (
    <MockAiPanel
      initialConversations={sampleConversations}
      initialConversationId="1"
      initialMessages={sampleMessages}
      initialMode="write"
    />
  ),
};

export const AskMode: Story = {
  render: () => (
    <MockAiPanel
      initialConversations={sampleConversations}
      initialConversationId="2"
      initialMessages={askModeMessages}
      initialMode="ask"
    />
  ),
};

export const AcceptedSuggestion: Story = {
  render: () => (
    <MockAiPanel
      initialConversations={[sampleConversations[0]]}
      initialConversationId="1"
      initialMessages={acceptedMessages}
      initialMode="write"
    />
  ),
};

export const RejectedSuggestion: Story = {
  render: () => (
    <MockAiPanel
      initialConversations={[sampleConversations[0]]}
      initialConversationId="1"
      initialMessages={rejectedMessages}
      initialMode="write"
    />
  ),
};

const markdownMessages: Message[] = [
  {
    id: "1",
    role: "user",
    content: "物語の構成について教えてください",
  },
  {
    id: "2",
    role: "assistant",
    content: `## 物語の基本構成

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

詳しくは[こちら](https://example.com)を参照してください。`,
  },
];

export const MarkdownRendering: Story = {
  render: () => (
    <MockAiPanel
      initialConversations={[sampleConversations[1]]}
      initialConversationId="2"
      initialMessages={markdownMessages}
      initialMode="ask"
    />
  ),
};
