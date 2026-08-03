import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import type { EditPolicy } from '../edit-policy';
import {
  NodeAiAttributes,
  type CanonStatus,
  type ContextPolicy,
} from './node-ai-attributes';

const meta = {
  title: 'Features/NodeAiAttributes',
  component: NodeAiAttributes,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof NodeAiAttributes>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    canonStatus: 'confirmed',
    contextPolicy: 'auto',
    editPolicy: 'free',
  },
};

export const Empty: Story = {
  args: {
    canonStatus: 'draft',
    contextPolicy: 'never',
    editPolicy: 'free',
  },
};

export const Disabled: Story = {
  args: {
    canonStatus: 'draft',
    contextPolicy: 'auto',
    editPolicy: 'free',
    disabled: true,
  },
};

/** 承認必須。対話チャットでは free と同じで、自律Runの自動適用だけが拒否される */
export const ApprovalRequired: Story = {
  args: {
    canonStatus: 'confirmed',
    contextPolicy: 'always',
    editPolicy: 'approval_required',
  },
};

/** 編集ロック。AIからの編集提案自体が生成されない */
export const Locked: Story = {
  args: {
    canonStatus: 'confirmed',
    contextPolicy: 'always',
    editPolicy: 'locked',
  },
};

export const Interactive: StoryObj = {
  render: () => {
    const [canonStatus, setCanonStatus] = useState<CanonStatus>('confirmed');
    const [contextPolicy, setContextPolicy] = useState<ContextPolicy>('always');
    const [editPolicy, setEditPolicy] = useState<EditPolicy>('free');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <NodeAiAttributes
          canonStatus={canonStatus}
          contextPolicy={contextPolicy}
          editPolicy={editPolicy}
          onCanonStatusChange={setCanonStatus}
          onContextPolicyChange={setContextPolicy}
          onEditPolicyChange={setEditPolicy}
        />
        <p style={{ fontSize: 12, color: '#888' }}>
          canonStatus: {canonStatus} / contextPolicy: {contextPolicy} /
          editPolicy: {editPolicy}
        </p>
      </div>
    );
  },
};
