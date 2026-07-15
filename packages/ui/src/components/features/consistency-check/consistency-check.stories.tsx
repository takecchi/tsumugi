import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import {
  ConsistencyCheckPanel,
  type ConsistencyFindingItem,
  type FindingStatus,
} from './consistency-check';

const meta = {
  title: 'Features/ConsistencyCheckPanel',
  component: ConsistencyCheckPanel,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ height: '600px', maxWidth: '480px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ConsistencyCheckPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockFindings: ConsistencyFindingItem[] = [
  {
    id: 'f1',
    severity: 'error',
    category: 'timeline',
    quote: '三日前に東京へ発ったばかりの彼が、昨日には京都の宿にいた。',
    startLine: 12,
    endLine: 13,
    description:
      '第2章では主人公は「三日前」に東京を発ったとされていますが、第1章の記述では「昨日」京都に到着しています。移動日数の辻褄が合いません。',
    suggestion: '一週間前に東京へ発ったばかりの彼が、昨日には京都の宿にいた。',
    status: 'open',
  },
  {
    id: 'f2',
    severity: 'warning',
    category: 'character',
    quote: '青い瞳の少女はゆっくりと振り返った。',
    startLine: 45,
    endLine: 45,
    description:
      'キャラクター設定では主人公の瞳は「茶色」と記載されています。ここでは「青い瞳」と描写されており、設定と矛盾しています。',
    suggestion: '茶色い瞳の少女はゆっくりと振り返った。',
    status: 'open',
  },
  {
    id: 'f3',
    severity: 'warning',
    category: 'notation',
    quote: '彼女はスマホを取り出した。',
    startLine: 88,
    endLine: 88,
    description:
      '本作では他の箇所で「携帯電話」という表記に統一されています。「スマホ」という口語表記が混在しています。',
    suggestion: '彼女は携帯電話を取り出した。',
    status: 'open',
  },
  {
    id: 'f4',
    severity: 'info',
    category: 'setting',
    quote: '街には魔法使いの姿はもう見られなくなっていた。',
    startLine: 102,
    endLine: 103,
    description:
      '世界観設定では魔法が日常に溶け込んだ社会とされています。魔法使いが姿を消した理由が本文中で説明されていないため、補足を検討してください。',
    suggestion: null,
    status: 'open',
  },
];

export const Default: Story = {
  args: {
    findings: mockFindings,
    summary:
      '4件の指摘が見つかりました。時系列の矛盾1件、人物設定の不整合1件、表記ゆれ1件、要確認の情報1件です。',
    history: [
      {
        id: 'h1',
        status: 'completed',
        findingCount: 4,
        summary: '4件の指摘',
        createdAt: new Date('2026-07-15T10:30:00'),
      },
      {
        id: 'h2',
        status: 'completed',
        findingCount: 7,
        summary: '7件の指摘',
        createdAt: new Date('2026-07-14T18:05:00'),
      },
      {
        id: 'h3',
        status: 'error',
        findingCount: 0,
        summary: null,
        createdAt: new Date('2026-07-14T09:12:00'),
      },
    ],
  },
};

export const Empty: Story = {
  args: {
    findings: [],
  },
};

export const Interactive: StoryObj = {
  render: () => {
    const [findings, setFindings] = useState<ConsistencyFindingItem[]>([]);
    const [isRunning, setIsRunning] = useState(false);

    const handleRun = () => {
      setIsRunning(true);
      // チェックの実行をシミュレート: 完了後にモック指摘を反映する
      setTimeout(() => {
        setFindings(mockFindings);
        setIsRunning(false);
      }, 1200);
    };

    const handleUpdateStatus = (findingId: string, status: FindingStatus) => {
      setFindings((prev) =>
        prev.map((f) => (f.id === findingId ? { ...f, status } : f)),
      );
    };

    const summary =
      findings.length > 0
        ? `${findings.length}件の指摘が見つかりました。`
        : null;

    return (
      <ConsistencyCheckPanel
        findings={findings}
        summary={summary}
        isRunning={isRunning}
        onRun={handleRun}
        onUpdateFindingStatus={handleUpdateStatus}
        onFixFinding={(id) => console.log('fix', id)}
      />
    );
  },
};
