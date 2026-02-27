import type { Project, ProjectAdapter } from '@tsumugi/adapter';
import type { ApiClients } from '@/client';
import type { Project as ApiProject } from '@tsumugi-chan/client';

function toProject(api: ApiProject): Project {
  return {
    id: api.id,
    name: api.name,
    synopsis: api.synopsis ?? undefined,
    theme: api.theme ?? undefined,
    goal: api.goal ?? undefined,
    targetWordCount: api.targetWordCount ?? undefined,
    targetAudience: api.targetAudience ?? undefined,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
  };
}

export function createProjectAdapter(clients: ApiClients): ProjectAdapter {
  return {
    async getAll(): Promise<Project[]> {
      const projects = await clients.projects.getProjects();
      return projects.map(toProject);
    },

    async getById(id: string): Promise<Project | null> {
      try {
        const project = await clients.projects.getProject({
          projectId: id,
        });
        return toProject(project);
      } catch {
        return null;
      }
    },

    async create(
      data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>,
    ): Promise<Project> {
      const project = await clients.projects.createProject({
        createProjectRequest: {
          name: data.name,
          synopsis: data.synopsis,
          theme: data.theme,
          goal: data.goal,
          targetWordCount: data.targetWordCount,
          targetAudience: data.targetAudience,
        },
      });
      return toProject(project);
    },

    async update(
      id: string,
      data: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>,
    ): Promise<Project> {
      const project = await clients.projects.updateProject({
        projectId: id,
        updateProjectRequest: {
          name: data.name,
          synopsis: data.synopsis,
          theme: data.theme,
          goal: data.goal,
          targetWordCount: data.targetWordCount,
          targetAudience: data.targetAudience,
        },
      });
      return toProject(project);
    },

    async delete(id: string): Promise<void> {
      await clients.projects.deleteProject({ projectId: id });
    },
  };
}
