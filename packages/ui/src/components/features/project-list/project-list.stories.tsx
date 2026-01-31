import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { ProjectList, type ProjectItem } from "./project-list";

const mockProjects: ProjectItem[] = [
  {
    id: "1",
    name: "hoge",
    path: "~/TsumugiProjects/hoge",
  },
  {
    id: "2",
    name: "test",
    path: "~/TsumugiProjects/test",
  },
  {
    id: "3",
    name: "私の小説",
    path: "~/TsumugiProjects/my-novel",
  },
  {
    id: "4",
    name: "短編集",
    path: "~/TsumugiProjects/short-stories",
  },
  {
    id: "5",
    name: "ファンタジー長編",
    path: "~/TsumugiProjects/fantasy",
  },
];

const meta = {
  title: "Features/ProjectList",
  component: ProjectList,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: "360px" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProjectList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    projects: mockProjects,
    selectedId: null,
  },
};

export const WithSelection: Story = {
  args: {
    projects: mockProjects,
    selectedId: "2",
  },
};

export const Empty: Story = {
  args: {
    projects: [],
    selectedId: null,
  },
};

export const SingleProject: Story = {
  args: {
    projects: [mockProjects[0]],
    selectedId: null,
  },
};

export const Loading: Story = {
  args: {
    projects: [],
    isLoading: true,
  },
};

export const Interactive: StoryObj = {
  render: () => {
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const handleSelect = (project: ProjectItem) => {
      setSelectedId(project.id);
      console.log("Selected project:", project);
    };

    return (
      <ProjectList
        projects={mockProjects}
        selectedId={selectedId}
        onSelect={handleSelect}
      />
    );
  },
};
