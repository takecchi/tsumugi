import type {
  CreateInstructionData,
  Instruction,
  InstructionAdapter,
  UpdateInstructionData,
} from '@tsumugi/adapter';
import type { ApiClients } from '@/client';
import type { Instruction as ApiInstruction } from '@tsumugi-chan/client';

function toInstruction(api: ApiInstruction): Instruction {
  return {
    id: api.id,
    projectId: api.projectId,
    title: api.title,
    content: api.content,
    enabled: api.enabled,
    order: api.order,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
  };
}

export function createInstructionAdapter(
  clients: ApiClients,
): InstructionAdapter {
  return {
    async list(projectId: string): Promise<Instruction[]> {
      const instructions = await clients.projects.getInstructions({
        projectId,
      });
      return instructions.map(toInstruction);
    },

    async create(
      projectId: string,
      data: CreateInstructionData,
    ): Promise<Instruction> {
      const instruction = await clients.projects.createInstruction({
        projectId,
        createInstructionRequest: {
          title: data.title,
          content: data.content,
          enabled: data.enabled,
          order: data.order,
        },
      });
      return toInstruction(instruction);
    },

    async get(instructionId: string): Promise<Instruction | null> {
      try {
        const instruction = await clients.instructions.getInstruction({
          instructionId,
        });
        return toInstruction(instruction);
      } catch {
        return null;
      }
    },

    async update(
      instructionId: string,
      data: UpdateInstructionData,
    ): Promise<Instruction> {
      const instruction = await clients.instructions.updateInstruction({
        instructionId,
        updateInstructionRequest: {
          title: data.title,
          content: data.content,
          enabled: data.enabled,
          order: data.order,
        },
      });
      return toInstruction(instruction);
    },

    async delete(instructionId: string): Promise<void> {
      await clients.instructions.deleteInstruction({ instructionId });
    },
  };
}
