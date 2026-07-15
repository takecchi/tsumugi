import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
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
    canonStatus: 'draft',
    contextPolicy: 'auto',
  },
};

export const Empty: Story = {
  args: {
    canonStatus: 'draft',
    contextPolicy: 'never',
    disabled: true,
  },
};

export const Interactive: StoryObj = {
  render: () => {
    const [canonStatus, setCanonStatus] = useState<CanonStatus>('confirmed');
    const [contextPolicy, setContextPolicy] = useState<ContextPolicy>('always');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <NodeAiAttributes
          canonStatus={canonStatus}
          contextPolicy={contextPolicy}
          onCanonStatusChange={setCanonStatus}
          onContextPolicyChange={setContextPolicy}
        />
        <p style={{ fontSize: 12, color: '#888' }}>
          canonStatus: {canonStatus} / contextPolicy: {contextPolicy}
        </p>
      </div>
    );
  },
};
