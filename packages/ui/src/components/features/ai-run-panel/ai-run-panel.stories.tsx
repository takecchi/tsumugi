import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import { AiRunPanel } from './ai-run-panel';
import type {
  AiRunDetail,
  AiRunMessage,
  AiRunStartInput,
  AiRunSummary,
} from './types';
import type { AiModelOption } from '../ai-panel/ai-panel';

const mockModels: AiModelOption[] = [
  { value: 'gpt-5.4', label: 'GPT-5.4' },
  { value: 'gpt-5.2', label: 'GPT-5.2' },
  { value: 'gpt-4o-mini', label: 'GPT-4o mini' },
  { value: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku' },
];

const mockRunningRun: AiRunDetail = {
  id: 'run_1',
  goal: '第2章のプロットを整理して、登場人物の設定と矛盾がないようにメモを作成する',
  status: 'running',
  finishReason: null,
  plan: [
    {
      content: '第1章と第2章のプロットを読む',
      activeForm: '第1章と第2章のプロットを読んでいます',
      status: 'completed',
    },
    {
      content: '登場人物の設定を確認する',
      activeForm: '登場人物の設定を確認しています',
      status: 'completed',
    },
    {
      content: '矛盾点をメモにまとめる',
      activeForm: '矛盾点をメモにまとめています',
      status: 'in_progress',
    },
    {
      content: '第2章のプロットを更新する',
      activeForm: '第2章のプロットを更新しています',
      status: 'pending',
    },
  ],
  stepCount: 14,
  maxSteps: 60,
  totalTokens: 486_200,
  maxTotalTokens: 2_000_000,
  createdNodeCount: 2,
  subagentCount: 1,
  lastError: null,
};

const mockMessages: AiRunMessage[] = [
  {
    id: 'm1',
    kind: 'text',
    role: 'user',
    content:
      '第2章のプロットを整理して、登場人物の設定と矛盾がないようにメモを作成する',
  },
  {
    id: 'm2',
    kind: 'text',
    role: 'assistant',
    content:
      '第1章と第2章のプロットを読みました。**時系列の矛盾**が2件見つかりました。\n\n1. 主人公が第1章で「まだ剣を握ったことがない」とありますが、第2章冒頭で熟練した剣技を見せています。\n2. 妹の年齢が第1章では12歳、第2章では15歳と書かれています。',
  },
  {
    id: 'm3',
    kind: 'edit',
    action: 'create',
    contentType: 'memo',
    targetName: '第2章 矛盾点メモ',
    status: 'accepted',
  },
  {
    id: 'm4',
    kind: 'text',
    role: 'assistant',
    content: '矛盾点をメモにまとめました。続けてプロット側を修正します。',
  },
  {
    id: 'm5',
    kind: 'edit',
    action: 'update',
    contentType: 'plot',
    targetName: '第2章 邂逅',
    status: 'accepted',
  },
  {
    id: 'm6',
    kind: 'edit',
    action: 'update',
    contentType: 'character',
    // 編集保護（editPolicy: approval_required）で弾かれた例
    targetName: '主人公 アキラ',
    status: 'rejected',
  },
];

const mockRuns: AiRunSummary[] = [
  {
    id: 'run_1',
    goal: '第2章のプロットを整理して、登場人物の設定と矛盾がないようにメモを作成する',
    status: 'running',
    finishReason: null,
    createdAt: new Date('2026-08-04T10:30:00'),
  },
  {
    id: 'run_2',
    goal: '登場人物一覧を作る',
    status: 'completed',
    finishReason: 'agent_completed',
    createdAt: new Date('2026-08-03T18:12:00'),
  },
  {
    id: 'run_3',
    goal: '全章のあらすじを書き出す',
    status: 'completed',
    finishReason: 'max_steps',
    createdAt: new Date('2026-08-02T09:05:00'),
  },
  {
    id: 'run_4',
    goal: '世界観設定を膨らませる',
    status: 'error',
    finishReason: 'interrupted',
    createdAt: new Date('2026-08-01T22:40:00'),
  },
];

const meta = {
  title: 'Features/AiRunPanel',
  component: AiRunPanel,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ height: '600px', width: '380px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AiRunPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    run: mockRunningRun,
    messages: mockMessages,
    runs: mockRuns,
    models: mockModels,
  },
};

export const Empty: Story = {
  args: {
    run: null,
    runs: [],
    models: mockModels,
  },
};

/** ゴール入力から実行開始・停止までを state で再現する */
export const Interactive: StoryObj = {
  render: () => {
    const [run, setRun] = React.useState<AiRunDetail | null>(null);
    const [messages, setMessages] = React.useState<AiRunMessage[]>([]);
    const [isStarting, setIsStarting] = React.useState(false);
    const [isStopping, setIsStopping] = React.useState(false);

    const handleStartRun = (input: AiRunStartInput) => {
      setIsStarting(true);
      // 起動リクエストを擬似的に待つ
      setTimeout(() => {
        setIsStarting(false);
        setRun({
          ...mockRunningRun,
          goal: input.goal,
          maxSteps: input.maxSteps,
          maxTotalTokens: input.maxTotalTokens,
          stepCount: 1,
          totalTokens: 12_400,
          createdNodeCount: 0,
          subagentCount: 0,
          plan: [],
        });
        setMessages([
          { id: 'u1', kind: 'text', role: 'user', content: input.goal },
        ]);
      }, 600);
    };

    const handleStopRun = () => {
      setIsStopping(true);
      // 停止は現在のバッチ終了後に確定するため、少し遅れて反映される
      setTimeout(() => {
        setIsStopping(false);
        setRun((prev) =>
          prev ? { ...prev, status: 'stopped', finishReason: 'stopped' } : prev,
        );
      }, 1200);
    };

    return (
      <AiRunPanel
        run={run}
        messages={messages}
        runs={mockRuns}
        models={mockModels}
        isStarting={isStarting}
        isStopping={isStopping}
        onStartRun={handleStartRun}
        onStopRun={handleStopRun}
        onNewRun={() => {
          setRun(null);
          setMessages([]);
        }}
      />
    );
  },
};

/** ステップ上限で打ち切られた状態（status は completed だが成功ではない） */
export const TruncatedByMaxSteps: Story = {
  args: {
    run: {
      ...mockRunningRun,
      status: 'completed',
      finishReason: 'max_steps',
      stepCount: 60,
      plan: mockRunningRun.plan.map((item, index) =>
        index < 2 ? { ...item, status: 'completed' } : item,
      ),
    },
    messages: mockMessages,
    runs: mockRuns,
    models: mockModels,
  },
};

/** サーバー再起動などで中断された状態（自動再開しない） */
export const Interrupted: Story = {
  args: {
    run: {
      ...mockRunningRun,
      status: 'error',
      finishReason: 'interrupted',
      lastError: 'worker restarted while the run was in flight',
    },
    messages: mockMessages,
    runs: mockRuns,
    models: mockModels,
  },
};

/** 同時実行の 409。進行中 Run への導線を出す */
export const ConflictOnStart: Story = {
  args: {
    run: null,
    runs: mockRuns,
    models: mockModels,
    startError: {
      message: 'このプロジェクトでは既に自律実行が進行中です。',
      runningRunId: 'run_1',
    },
  },
};

/** ストリーム切断からの再接続中 */
export const Reconnecting: Story = {
  args: {
    run: mockRunningRun,
    messages: mockMessages,
    runs: mockRuns,
    models: mockModels,
    isReconnecting: true,
  },
};

/** サーバー側がリトライ中（終端ではないので「失敗」と書かない） */
export const RetryingAfterError: Story = {
  args: {
    run: mockRunningRun,
    messages: mockMessages,
    runs: mockRuns,
    models: mockModels,
    transientError: 'upstream timeout',
  },
};

/** 再接続を諦めた状態（自動リトライとは別物として見せる） */
export const Disconnected: Story = {
  args: {
    run: mockRunningRun,
    messages: mockMessages,
    runs: mockRuns,
    models: mockModels,
    fatalError:
      'ストリームへの再接続を諦めました。進捗はここで止まって見えますが、実行自体は続いている可能性があります。',
  },
};

/** 終了理由が未知（バックエンドが新しい値を追加した場合も成功と誤解させない） */
export const UnknownFinishReason: Story = {
  args: {
    run: {
      ...mockRunningRun,
      status: 'completed',
      finishReason: null,
    },
    messages: mockMessages,
    runs: mockRuns,
    models: mockModels,
  },
};

/** Run の取得に失敗（黙って起動フォームに戻さない） */
export const LoadFailed: Story = {
  args: {
    run: null,
    runs: mockRuns,
    models: mockModels,
    loadError: '実行を読み込めませんでした: Not Found',
  },
};
