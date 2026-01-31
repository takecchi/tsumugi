import type { Meta, StoryObj } from "@storybook/react";
import { Skeleton } from "./skeleton";

const meta = {
  title: "UI/Skeleton",
  component: Skeleton,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    className: "h-4 w-[200px]",
  },
};

export const Circle: Story = {
  args: {
    className: "size-10 rounded-full",
  },
};

export const Card: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Skeleton className="size-8 rounded-md" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-[120px]" />
        <Skeleton className="h-3 w-[200px]" />
      </div>
    </div>
  ),
};

export const ProjectListSkeleton: Story = {
  render: () => (
    <div className="flex w-[360px] flex-col gap-1 p-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2">
          <Skeleton className="size-8 rounded-md" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-3 w-[180px]" />
          </div>
        </div>
      ))}
    </div>
  ),
};
