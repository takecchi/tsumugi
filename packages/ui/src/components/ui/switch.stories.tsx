import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Switch } from './switch';

const meta = {
  title: 'UI/Switch',
  component: Switch,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    defaultChecked: true,
    'aria-label': '確定',
  },
};

export const Empty: Story = {
  args: {
    defaultChecked: false,
    'aria-label': '確定',
  },
};

export const Disabled: Story = {
  args: {
    checked: false,
    disabled: true,
    'aria-label': '確定',
  },
};

export const Interactive: StoryObj = {
  render: () => {
    const [checked, setChecked] = useState(false);

    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Switch
            id="canon-status"
            checked={checked}
            onCheckedChange={setChecked}
          />
          <label htmlFor="canon-status" className="text-xs font-medium">
            確定
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          checked: {String(checked)}
        </p>
      </div>
    );
  },
};
