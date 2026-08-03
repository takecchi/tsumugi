import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import {
  EDIT_POLICY_NOTE,
  EDIT_POLICY_OPTIONS,
  EditPolicyIcon,
  editPolicyLabel,
  type EditPolicy,
} from './edit-policy';

const meta = {
  title: 'Features/EditPolicyIcon',
  component: EditPolicyIcon,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof EditPolicyIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 保護されているノード（承認必須）のアイコン */
export const Default: Story = {
  args: { policy: 'approval_required' },
};

/** free では何も描画しない（ツリー上で保護されたノードだけが目立つ） */
export const Empty: Story = {
  args: { policy: 'free' },
};

/** 3値それぞれの意味と見え方 */
export const AllPolicies: StoryObj = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {EDIT_POLICY_OPTIONS.map((option) => (
        <div
          key={option.value}
          style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}
        >
          <span style={{ display: 'flex', width: 16, paddingTop: 2 }}>
            <EditPolicyIcon policy={option.value} />
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <strong style={{ fontSize: 12 }}>{option.label}</strong>
            <span style={{ fontSize: 12, color: '#888' }}>
              {option.description}
            </span>
          </span>
        </div>
      ))}
      <p style={{ maxWidth: 380, fontSize: 11, color: '#888' }}>
        {EDIT_POLICY_NOTE}
      </p>
    </div>
  ),
};

export const Interactive: StoryObj = {
  render: () => {
    const [policy, setPolicy] = useState<EditPolicy>('free');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {EDIT_POLICY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPolicy(option.value)}
              style={{
                fontSize: 12,
                padding: '4px 8px',
                border: '1px solid #ddd',
                borderRadius: 4,
                background: policy === option.value ? '#eee' : 'transparent',
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <EditPolicyIcon policy={policy} />
          <span style={{ fontSize: 12 }}>
            AIの編集: {editPolicyLabel(policy)}
          </span>
        </div>
      </div>
    );
  },
};
