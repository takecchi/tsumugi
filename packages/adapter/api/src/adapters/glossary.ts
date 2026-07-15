import type {
  CreateGlossaryTermData,
  GlossaryAdapter,
  GlossaryTerm,
  UpdateGlossaryTermData,
} from '@tsumugi/adapter';
import type { ApiClients } from '@/client';
import type { GlossaryTerm as ApiGlossaryTerm } from '@tsumugi-chan/client';

function toGlossaryTerm(api: ApiGlossaryTerm): GlossaryTerm {
  return {
    id: api.id,
    projectId: api.projectId,
    term: api.term,
    reading: api.reading,
    aliases: api.aliases,
    notes: api.notes,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
  };
}

export function createGlossaryAdapter(clients: ApiClients): GlossaryAdapter {
  return {
    async list(projectId: string): Promise<GlossaryTerm[]> {
      const terms = await clients.projects.getGlossaryTerms({ projectId });
      return terms.map(toGlossaryTerm);
    },

    async create(
      projectId: string,
      data: CreateGlossaryTermData,
    ): Promise<GlossaryTerm> {
      const term = await clients.projects.createGlossaryTerm({
        projectId,
        createGlossaryTermRequest: {
          term: data.term,
          reading: data.reading,
          aliases: data.aliases,
          notes: data.notes,
        },
      });
      return toGlossaryTerm(term);
    },

    async get(termId: string): Promise<GlossaryTerm | null> {
      try {
        const term = await clients.glossary.getGlossaryTerm({ termId });
        return toGlossaryTerm(term);
      } catch {
        return null;
      }
    },

    async update(
      termId: string,
      data: UpdateGlossaryTermData,
    ): Promise<GlossaryTerm> {
      const term = await clients.glossary.updateGlossaryTerm({
        termId,
        updateGlossaryTermRequest: {
          term: data.term,
          reading: data.reading,
          aliases: data.aliases,
          notes: data.notes,
        },
      });
      return toGlossaryTerm(term);
    },

    async delete(termId: string): Promise<void> {
      await clients.glossary.deleteGlossaryTerm({ termId });
    },
  };
}
