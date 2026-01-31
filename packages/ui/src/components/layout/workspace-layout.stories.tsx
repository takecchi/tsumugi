import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { WorkspaceLayout } from '@/components';
import { Sidebar, SidebarSection, type TreeNodeData, type ContentType } from "@/components/features/sidebar/sidebar";
import { WritingEditor } from "@/components/features/editor/writing-editor";
import { PlotEditor, type PlotEditorData } from "@/components/features/editor/plot-editor";
import { CharacterEditor, type CharacterEditorData } from "@/components/features/editor/character-editor";
import { MemoEditor } from "@/components/features/editor/memo-editor";
import { ProjectEditor, type ProjectEditorData } from "@/components/features/editor/project-editor";
import { EditorTabs, type EditorTab } from "@/components/features/editor/editor-tabs";
import { Button } from "@/components/ui/button";
import { SettingsIcon } from "lucide-react";
import { AiPanel, AiPanelContent, AiPanelInput, type Message, type AiMode, type Conversation } from "@/components/features/ai-panel/ai-panel";

const mockPlots: TreeNodeData[] = [
  {
    id: "1",
    name: "第1章 プロット",
    type: "plot",
    nodeType: "folder",
    children: [
      { id: "1-1", name: "起承転結", type: "plot", nodeType: "file" },
      { id: "1-2", name: "キャラ動線", type: "plot", nodeType: "file" },
    ],
  },
  { id: "2", name: "全体構成", type: "plot", nodeType: "file" },
];
const mockCharacters: TreeNodeData[] = [
  {
    id: "3",
    name: "主要キャラクター",
    type: "character",
    nodeType: "folder",
    children: [
      { id: "3-1", name: "主人公", type: "character", nodeType: "file" },
      { id: "3-2", name: "ヒロイン", type: "character", nodeType: "file" },
    ],
  },
  { id: "4", name: "サブキャラ一覧", type: "character", nodeType: "file" },
];
const mockMemos: TreeNodeData[] = [
  { id: "5", name: "世界観設定", type: "memo", nodeType: "file" },
  { id: "6", name: "アイデアメモ", type: "memo", nodeType: "file" },
];
const mockWritings: TreeNodeData[] = [
  {
    id: "7",
    name: "第1章",
    type: "writing",
    nodeType: "folder",
    children: [
      { id: "7-1", name: "1-1 出会い", type: "writing", nodeType: "file" },
      { id: "7-2", name: "1-2 旅立ち", type: "writing", nodeType: "file" },
    ],
  },
  { id: "8", name: "プロローグ", type: "writing", nodeType: "file" },
];

function MockSidebarContent({ onSelect, onCreateFile }: { onSelect?: (node: TreeNodeData) => void; onCreateFile?: (type: ContentType, parentId: string | null) => void }) {
  return (
    <>
      <SidebarSection type="plot" nodes={mockPlots} onSelect={onSelect} onCreateFile={onCreateFile} />
      <SidebarSection type="character" nodes={mockCharacters} onSelect={onSelect} onCreateFile={onCreateFile} />
      <SidebarSection type="memo" nodes={mockMemos} onSelect={onSelect} onCreateFile={onCreateFile} />
      <SidebarSection type="writing" nodes={mockWritings} onSelect={onSelect} onCreateFile={onCreateFile} />
    </>
  );
}

const meta = {
  title: "Layout/WorkspaceLayout",
  component: WorkspaceLayout,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof WorkspaceLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    sidebar: (
      <Sidebar selectedId={null}>
        <MockSidebarContent />
      </Sidebar>
    ),
    editor: (
      <div className="flex h-full items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">左のサイドバーからファイルを選択してください</p>
      </div>
    ),
    aiPanel: (
      <AiPanel>
        <AiPanelContent description="文章の執筆をお手伝いします。書いてほしい内容を教えてください。" />
        <AiPanelInput mode="write" />
      </AiPanel>
    ),
  },
};

export const WithContent: Story = {
  args: {
    sidebar: (
      <Sidebar selectedId="7-1">
        <MockSidebarContent />
      </Sidebar>
    ),
    editor: (
      <WritingEditor
        name="1-1 出会い"
        content={`# 第1章 出会い\n\n夜明け前の静寂が街を包んでいた。\n\n主人公は窓辺に立ち、遠くに見える山々を眺めていた。`}
        wordCount={42}
      />
    ),
    aiPanel: (
      <AiPanel
        conversations={[
          {
            id: "1",
            title: "文章作成の相談",
            createdAt: new Date("2024-01-01"),
            updatedAt: new Date("2024-01-01"),
          },
        ]}
        currentConversationId="1"
      >
        <AiPanelContent
          messages={[
            {
              id: "1",
              role: "user",
              content: "続きを書いてください",
            },
            {
              id: "2",
              role: "assistant",
              content: "以下の文章を提案します。",
            },
            {
              id: "3",
              role: "assistant" as const,
              proposal: {
                id: "p-ws-1",
                action: "update" as const,
                contentType: "writing",
                targetName: "第1章",
                original: { content: "" },
                proposed: { content: { type: "replace" as const, value: "今日から始まる新しい冒険への期待と不安が入り混じった複雑な感情が、胸の奥で渦を巻いていた。" } },
                status: "pending" as const,
              },
            },
          ]}
        />
        <AiPanelInput mode="write" />
      </AiPanel>
    ),
  },
};

const mockWritingData: Record<string, { content: string }> = {
  "7-1": { content: "夜明け前の静寂が街を包んでいた。\n\n主人公は窓辺に立ち、遠くに見える山々を眺めていた。今日から始まる新しい冒険への期待と不安が入り混じった複雑な感情が、胸の奥で渦を巻いていた。\n\n「行かなくちゃ」\n\n小さく呟いた声は、まだ眠りについている街に溶けていった。\n\n祖父の家を出たのは、太陽が地平線に顔を見せる少し前のことだった。背中には使い古された革のリュック、腰には祖父から譲り受けた短剣。それが彼の全財産だった。\n\n石畳の道を歩きながら、幼い頃の記憶が次々と蓋ってくる。祖父と一緒に釣りをした川、友人たちと駆け回った広場、初めて剣を振った裏庭。\n\n「必ず帰ってくるから」\n\n昨夜、祖父にそう言ったとき、老人は静かに笑っただけだった。その笑顔の裏にどんな感情が隠されていたのか、今の彼にはわからない。\n\n村の門をくぐると、見慣れた畑が広がっていた。青々とした麦畑の向こうに、森の緑が濃く連なっている。その先にあるのが王都へと続く街道だ。\n\n「待って！」\n\n背後から声がした。振り返ると、息を切らした幼馴染が駆け寄ってくるところだった。銀色の髪が朝日に照らされて揺れている。\n\n「黙って行こうとしたでしょ」\n\n彼女の声には怪訟と寂しさが混ざっていた。" },
  "7-2": { content: "村の入口に立った主人公は、振り返って故郷を一望した。\n\n幼い頃から見慣れた風景。畑の向こうに広がる森、その先にそびえる山々。すべてが朝日に照らされて金色に輝いていた。" },
  "8": { content: "これは、ある少年の物語である。\n\n彼の名前はまだ誰にも知られていない。しかし、やがて世界中がその名を口にすることになる。" },
};

const mockPlotData: Record<string, PlotEditorData> = {
  "1-1": {
    name: "起承転結",
    synopsis: "主人公が旅立ちを決意するまでの物語。幼馴染との別れと新たな出会いを描く。\n\n祖父の病が悪化し、王都にしかない特殊な薬草を求めて旅に出ることを決意する。幼馴染のヒロインは王都の魔法学院に在籍しており、彼女を頼ることも旅の目的の一つ。\n\n出発前夜の祖父との会話、村人たちとの別れ、そして旅路での最初の試練を通じて、主人公の成長の第一歩を描く。",
    setting: "中世ヨーロッパ風の架空世界。魔法が日常に溶け込んだ社会。\n\n主人公の村は王都から馬車で5日ほどの辺境に位置する。農業を主産業とし、魔法は主に農作業の補助に使われている。\n\n王都は大陸最大の都市で、魔法学院・騎士団・商業ギルドが集中している。",
    theme: "成長と自立。守られる側から守る側への変化。\n\nサブテーマとして「家族の絆」と「自己犠牲の意味」を描く。祖父のために旅に出るという行動が、単なる義務ではなく愛情から来ていることを示す。",
    structure: "起：平穏な日常。村での生活、祖父との穏やかな暮らし。祖父の体調が少しずつ悪化している描写をさりげなく入れる。\n\n承：事件の発生。祖父が倒れる。村の医者から「王都の薬草が必要」と告げられる。主人公は動揺するが、旅に出る決心がつかない。\n\n転：決意。幼馴染からの手紙が届く。「王都で待っている」という言葉に背中を押され、旅立ちを決意する。\n\n結：旅立ち。村を出て、未知の世界へ踏み出す。最初の試練（森での魔獣遣遇）を乗り越え、成長の兆しを見せる。",
    conflict: "主人公の内面的な葛藤（安定を捨てる恐怖 vs 冒険への憧れ）\n\n祖父を一人にして旅に出ることへの罪悪感。「祖父のそばにいるべきではないか」という葉藤。\n\n一方で、薬草を手に入れなければ祖父は助からないという現実。\n\n「行動しないこともまた選択である」というテーマを裏に持たせる。",
    resolution: "幼馴染の後押しにより旅立ちを決意する。\n\n幼馴染からの手紙には「私の学院の伝手で薬草を探せるかもしれない」と書かれており、希望が生まれる。\n\n村長が旅費を援助し、村人たちが見送るシーンで第1章を紞める。",
    notes: "第2章への伏線を忘れずに入れる\n\n伏線リスト：\n・祖父の病の原因（単なる病気ではない可能性）\n・幼馴染の手紙の「私の学院の伝手」の意味\n・森での魔獣が不自然に活性化していること\n・主人公の剣が一瞬光った描写（覚醒の兆し）",
  },
  "1-2": { name: "キャラ動線", synopsis: "各キャラクターの動きと合流ポイントを整理", structure: "主人公→村出発→森→街道→王都\nヒロイン→王都で待機→主人公と合流" },
  "2": { name: "全体構成", synopsis: "全5章構成。第1章〜第3章が前半、第4章〜第5章が後半。\n\n前半は仲間集めと世界観の提示、後半はクライマックスと解決。" },
};

const mockCharacterData: Record<string, CharacterEditorData> = {
  "3-1": {
    name: "主人公",
    aliases: "タロー、勇者、剣の少年",
    role: "主人公",
    gender: "男性",
    age: "18歳",
    appearance: "黒髪短髪。身長175cm。鍛えられた体つきだが、目元は柔和。普段は農作業用の簡素な服を着ているが、旅立ち後は師匠から譲り受けた革鎧を身につける。\n\n右頭に小さな傷跡がある（幼少期の事故によるもの。本人は記憶がない）。\n\n戦闘時は表情が一変し、鋭い目つきになる。このギャップが周囲を驚かせることがある。",
    personality: "正義感が強く、困っている人を放っておけない。やや無鉄砲なところがある。しかし根は優しく、仲間思い。\n\n料理が得意で、旅の中では自然と食事当番になる。祖父から教わった家庭料理が得意。\n\n弱点は方向音痴。地図が読めず、仲間に頓繁にからかわれる。\n\n感情を表に出すのが苦手で、大事な場面で言葉が足りなくなることがある。",
    background: "小さな村で育った農家の息子。幼い頃に両親を亡くし、祖父に育てられた。祖父から剣術の基礎を学んでいる。\n\n両親の死因は「森での事故」とだけ伝えられているが、祖父は詳細を語ろうとしない。これが第3章の覚醒イベントに繋がる伏線。\n\n村では「剣の才能がある」と言われていたが、本人はそれを自覚していない。祖父の指導は厳しく、「お前には剣が必要になる日が来る」とだけ言われていた。",
    motivation: "祖父の病を治す薬草を求めて旅に出る。\n\n表面的な動機は祖父の治療だが、潜在的には「外の世界を見たい」という憧れもある。この二重の動機が、物語後半で「本当に大切なものは何か」という問いに繋がる。",
    relationships: "幼馴染のヒロインとは兄妹のような関係。師匠の老騎士を尊敬している。\n\nヒロインとは幼少期に一緒に過ごしたが、3年前に彼女が王都に行ってからは手紙のやり取りのみ。再会を心待ちにしているが、同時に「変わってしまったのでは」という不安もある。\n\n第2章で出会う老騎士は、かつて祖父と共に戦った戦友。主人公の素性を見抜き、剣術の指導を買って出る。",
    notes: "第3章で覚醒イベントあり。伏線を第1章から張っておく。\n\n覚醒のトリガー：仲間が危機に陥ったとき、剣が光を放ち、両親から受け継いだ力が目覚める。\n\n覚醒後の変化：\n・剣に光の属性が宿る\n・身体能力が向上\n・代償として感情の制御が難しくなる（戦闘時の表情変化がより顕著に）\n\n第4章での試練：覚醒した力を制御できず、仲間を傷つけてしまうエピソード。これが第5章のクライマックスへの布石。",
  },
  "3-2": {
    name: "ヒロイン",
    aliases: "ハナ",
    role: "ヒロイン",
    gender: "女性",
    age: "17歳",
    appearance: "長い銀髪。小柄だが芯の強さを感じさせる佇まい。",
    personality: "冷静沈着で頭脳明晰。時折見せる笑顔が印象的。",
    background: "王都の魔法学院に通う優等生。実は没落貴族の出身。",
  },
  "4": { name: "サブキャラ一覧", notes: "村長、宿屋の主人、旅の商人など" },
};

const mockProjectData: ProjectEditorData = {
  name: "異世界転生物語",
  synopsis: "現代日本で交通事故に遭った主人公が、剣と魔法の世界に転生する。",
  theme: "自分の居場所を見つけること",
  goal: "主人公が「ここが自分の居場所だ」と心から思える瞬間を描く",
  targetWordCount: "120000",
  targetAudience: "10代後半〜20代のライトノベル読者層",
};

const mockMemoData: Record<string, { content: string; tags: string[] }> = {
  "5": {
    content: "この世界では魔法が日常的に使われている。\n\n■ 魔力について\n魔力は生まれつき持っているもので、訓練によって強化できる。魔力の総量は個人差が大きく、生まれながらにして大きな魔力を持つ者は「天賦」と呼ばれる。主人公は自覚なき天賦の持ち主。\n\n■ 属性システム\n属性は火・水・風・土・光・闇の6種類。それぞれに相克関係がある。\n・火 → 風に強い、水に弱い\n・水 → 火に強い、土に弱い\n・風 → 土に強い、火に弱い\n・土 → 水に強い、風に弱い\n・光と闇は互いに相克\n\n光と闇は希少な属性で、使い手は数世代に一人と言われている。\n\n■ 魔法のランク\n一般人でも簡単な魔法（火を起こす、水を浄化するなど）は使える。これらは「生活魔法」と呼ばれる。\n\n戦闘用魔法は「術式魔法」と呼ばれ、専門の訓練が必要。魔法学院で学ぶのが一般的。\n\n最上位の魔法は「禁術」と呼ばれ、使用には大きな代償が伴う。歴史上、禁術の使用が大災害を引き起こした例があり、厳しく禁じられている。\n\n■ 魔法学院\n王都にある最高峰の教育機関。入学試験は難関で、合格率は毎年10%程度。\n\nヒロインは首席で合格した天才。彼女の専攻は水属性だが、光属性の素質も持っていることが後に判明する。",
    tags: ["世界観", "魔法", "設定"],
  },
  "6": {
    content: "・第2章で新キャラ登場させたい\n・魔法のバトルシーンをもっと迫力あるものに\n・ヒロインの過去を掘り下げるエピソードが必要",
    tags: ["アイデア", "要検討"],
  },
};

function InteractiveDemo() {
  const [selectedNode, setSelectedNode] = useState<TreeNodeData | null>(null);
  const [openTabs, setOpenTabs] = useState<EditorTab[]>([]);
  const [writingData, setWritingData] = useState(mockWritingData);
  const [plotData, setPlotData] = useState(mockPlotData);
  const [characterData, setCharacterData] = useState(mockCharacterData);
  const [memoData, setMemoData] = useState(mockMemoData);
  const [aiMode, setAiMode] = useState<AiMode>("write");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [projectData, setProjectData] = useState<ProjectEditorData>(mockProjectData);

  const handleSelectProject = () => {
    const tabId = "project:settings";
    setSelectedNode({ id: tabId, name: projectData.name, type: "plot" as ContentType, nodeType: "file" });
    setOpenTabs((prev) => {
      const exists = prev.some((t) => t.id === tabId);
      const deactivated = prev.map((t) => ({ ...t, active: false }));
      return exists
        ? deactivated.map((t) => t.id === tabId ? { ...t, active: true } : t)
        : [...deactivated, { id: tabId, name: projectData.name, type: "project" as const, active: true }];
    });
  };

  const handleSelect = (node: TreeNodeData) => {
    if (node.nodeType === "file") {
      setSelectedNode(node);
      setOpenTabs((prev) => {
        const exists = prev.some((t) => t.id === node.id);
        const deactivated = prev.map((t) => ({ ...t, active: false }));
        return exists
          ? deactivated.map((t) => t.id === node.id ? { ...t, active: true } : t)
          : [...deactivated, { id: node.id, name: node.name, type: node.type, active: true }];
      });
    }
  };

  const handleCloseTab = (id: string) => {
    setOpenTabs((prev) => {
      const closing = prev.find((t) => t.id === id);
      const next = prev.filter((t) => t.id !== id);
      if (closing?.active && next.length > 0) {
        const closedIndex = prev.findIndex((t) => t.id === id);
        const newActiveIndex = Math.min(closedIndex, next.length - 1);
        next[newActiveIndex] = { ...next[newActiveIndex], active: true };
        const newActive = next[newActiveIndex];
        setSelectedNode({ id: newActive.id, name: newActive.name, type: newActive.type as ContentType, nodeType: "file" });
      } else if (next.length === 0) {
        setSelectedNode(null);
      }
      return next;
    });
  };

  const handleSelectTab = (id: string) => {
    setOpenTabs((prev) => prev.map((t) => ({ ...t, active: t.id === id })));
    const tab = openTabs.find((t) => t.id === id);
    if (tab) {
      setSelectedNode({ id: tab.id, name: tab.name, type: tab.type as ContentType, nodeType: "file" });
    }
  };

  const handleCloseOtherTabs = (id: string) => {
    setOpenTabs((prev) => {
      const kept = prev.find((t) => t.id === id);
      if (!kept) return prev;
      setSelectedNode({ id: kept.id, name: kept.name, type: kept.type as ContentType, nodeType: "file" });
      return [{ ...kept, active: true }];
    });
  };

  const handleCloseAllTabs = () => {
    setOpenTabs([]);
    setSelectedNode(null);
  };

  const handleCreateFile = (type: ContentType, parentId: string | null) => {
    console.log("Create file:", type, parentId);
  };

  const renderEditor = () => {
    if (!selectedNode) {
      return (
        <div className="flex h-full items-center justify-center bg-background">
          <p className="text-sm text-muted-foreground">左のサイドバーからファイルを選択してください</p>
        </div>
      );
    }
    const id = selectedNode.id;
    if (id.startsWith("project:")) {
      return (
        <ProjectEditor
          data={projectData}
          onChange={(field, value) => {
            setProjectData((prev) => ({ ...prev, [field]: value }));
            if (field === "name") {
              const tabId = "project:settings";
              setOpenTabs((prev) => prev.map((t) => t.id === tabId ? { ...t, name: value } : t));
            }
          }}
        />
      );
    }
    switch (selectedNode.type) {
      case "writing": {
        const d = writingData[id] ?? { content: "" };
        return (
          <WritingEditor
            name={selectedNode.name}
            content={d.content}
            wordCount={d.content.length}
            onContentChange={(content) =>
              setWritingData((prev) => ({ ...prev, [id]: { content } }))
            }
          />
        );
      }
      case "plot": {
        const d = plotData[id] ?? { name: selectedNode.name };
        return (
          <PlotEditor
            data={d}
            onChange={(field, value) =>
              setPlotData((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
            }
          />
        );
      }
      case "character": {
        const d = characterData[id] ?? { name: selectedNode.name };
        return (
          <CharacterEditor
            data={d}
            onChange={(field, value) =>
              setCharacterData((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
            }
          />
        );
      }
      case "memo": {
        const d = memoData[id] ?? { content: "", tags: [] };
        return (
          <MemoEditor
            name={selectedNode.name}
            content={d.content}
            tags={d.tags}
            onContentChange={(content) =>
              setMemoData((prev) => ({ ...prev, [id]: { ...prev[id], content } }))
            }
            onTagsChange={(tags) =>
              setMemoData((prev) => ({ ...prev, [id]: { ...prev[id], tags } }))
            }
          />
        );
      }
      default:
        return null;
    }
  };

  const handleSendMessage = (message: string) => {
    if (!currentConversationId) {
      const newId = Date.now().toString();
      const conversation: Conversation = {
        id: newId,
        title: message.slice(0, 20) + (message.length > 20 ? "..." : ""),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setConversations(prev => [...prev, conversation]);
      setCurrentConversationId(newId);
    }
    setMessages(prev => [...prev, { id: Date.now().toString(), role: "user" as const, content: message }]);
    setIsLoading(true);
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant" as const,
        content: aiMode === "write" ? "以下の文章を提案します。" : "ご質問にお答えします。",
      }]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <WorkspaceLayout
      sidebar={
        <Sidebar
          selectedId={selectedNode?.id}
          header={
            <div className="flex w-full min-w-0 items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{projectData.name}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0"
                onClick={handleSelectProject}
              >
                <SettingsIcon className="size-4" />
              </Button>
            </div>
          }
        >
          <MockSidebarContent onSelect={handleSelect} onCreateFile={handleCreateFile} />
        </Sidebar>
      }
      editor={
        <EditorTabs
          tabs={openTabs}
          onSelectTab={handleSelectTab}
          onCloseTab={handleCloseTab}
          onCloseOtherTabs={handleCloseOtherTabs}
          onCloseAllTabs={handleCloseAllTabs}
        >
          {renderEditor()}
        </EditorTabs>
      }
      aiPanel={
        <AiPanel
          conversations={conversations}
          currentConversationId={currentConversationId}
          onNewConversation={() => { setCurrentConversationId(undefined); setMessages([]); }}
          onSelectConversation={(id) => { setCurrentConversationId(id); setMessages([]); }}
        >
          <AiPanelContent
            messages={messages}
            description={
              aiMode === "write"
                ? "文章の執筆をお手伝いします。\n書いてほしい内容を教えてください。"
                : "質問があればお気軽にどうぞ。"
            }
            isLoading={isLoading}
          />
          <AiPanelInput
            mode={aiMode}
            onModeChange={setAiMode}
            onSend={handleSendMessage}
            isLoading={isLoading}
          />
        </AiPanel>
      }
    />
  );
}

export const Interactive: StoryObj = {
  render: () => <InteractiveDemo />,
};

export const Mobile: StoryObj = {
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
  render: () => <InteractiveDemo />,
};

export const MobileWithContent: Story = {
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
  args: {
    sidebar: (
      <Sidebar selectedId="7-1">
        <MockSidebarContent />
      </Sidebar>
    ),
    editor: (
      <WritingEditor
        name="1-1 出会い"
        content={`# 第1章 出会い\n\n夜明け前の静寂が街を包んでいた。\n\n主人公は窓辺に立ち、遠くに見える山々を眺めていた。`}
        wordCount={42}
      />
    ),
    aiPanel: (
      <AiPanel>
        <AiPanelContent description="文章の執筆をお手伝いします。書いてほしい内容を教えてください。" />
        <AiPanelInput mode="write" />
      </AiPanel>
    ),
  },
};

export const CustomSizes: Story = {
  args: {
    sidebar: (
      <Sidebar selectedId={null}>
        <MockSidebarContent />
      </Sidebar>
    ),
    editor: (
      <WritingEditor
        name="カスタムサイズ"
        content="カスタムサイズのレイアウト"
      />
    ),
    aiPanel: (
      <AiPanel>
        <AiPanelContent description="質問があればお気軽にどうぞ。" />
        <AiPanelInput mode="ask" />
      </AiPanel>
    ),
    defaultSidebarSize: 15,
    defaultAiPanelSize: 30,
    minSidebarSize: 10,
    minEditorSize: 40,
    minAiPanelSize: 15,
  },
};
