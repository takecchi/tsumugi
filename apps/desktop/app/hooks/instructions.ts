import { useAdapter } from '~/hooks/useAdapter';
import useSWR, { type SWRConfiguration } from 'swr';
import useSWRMutation from 'swr/mutation';
import type {
  CreateInstructionData,
  Instruction,
  UpdateInstructionData,
} from '@tsumugi/adapter';

interface InstructionsKey {
  type: 'instructions';
  projectId: string;
}

/**
 * プロジェクトの執筆指示一覧を取得する
 * @param projectId - プロジェクトID
 * @param config
 */
export function useInstructions(
  projectId: string,
  config?: SWRConfiguration<Instruction[], Error>,
) {
  const adapter = useAdapter();
  return useSWR<Instruction[], Error, InstructionsKey>(
    { type: 'instructions', projectId },
    ({ projectId }) => adapter.instructions.list(projectId),
    config,
  );
}

/**
 * 執筆指示を作成する
 * @param projectId - プロジェクトID
 * @revalidates useInstructions - 執筆指示一覧を再フェッチする
 */
export function useCreateInstruction(projectId: string) {
  const adapter = useAdapter();
  return useSWRMutation<
    Instruction,
    Error,
    InstructionsKey,
    CreateInstructionData
  >({ type: 'instructions', projectId }, ({ projectId }, { arg }) =>
    adapter.instructions.create(projectId, arg),
  );
}

interface UpdateInstructionArg {
  instructionId: string;
  data: UpdateInstructionData;
}

/**
 * 執筆指示を更新する
 * @param projectId - プロジェクトID
 * @revalidates useInstructions - 執筆指示一覧を再フェッチする
 */
export function useUpdateInstruction(projectId: string) {
  const adapter = useAdapter();
  return useSWRMutation<
    Instruction,
    Error,
    InstructionsKey,
    UpdateInstructionArg
  >({ type: 'instructions', projectId }, (_, { arg }) =>
    adapter.instructions.update(arg.instructionId, arg.data),
  );
}

/**
 * 執筆指示を削除する
 * @param projectId - プロジェクトID
 * @revalidates useInstructions - 執筆指示一覧を再フェッチする
 */
export function useDeleteInstruction(projectId: string) {
  const adapter = useAdapter();
  return useSWRMutation<undefined, Error, InstructionsKey, string>(
    { type: 'instructions', projectId },
    async (_, { arg: instructionId }) => {
      await adapter.instructions.delete(instructionId);
      return undefined;
    },
  );
}
