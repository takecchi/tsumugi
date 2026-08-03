import * as React from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * AIによる編集の保護ポリシー
 *
 * 意味の切り分け（誤解されやすいので注意）:
 * - free: 制限なし。対話チャットでは提案・適用でき、自律Runでも自動適用される
 * - approval_required: ユーザーの承認なしに適用しない。
 *   対話チャットは元々承認が必要なため free と体感差はなく（提案も出るし承認もできる）、
 *   差が出るのは承認を経ない適用経路＝自律Runだけで、そこでは拒否される
 * - locked: AIからの編集提案自体を拒否する。対話チャットでも提案が生成されない
 */
export type EditPolicy = 'free' | 'approval_required' | 'locked';

export interface EditPolicyOption {
  value: EditPolicy;
  /** コントロール上に出す短いラベル */
  label: string;
  /** 選択肢の説明。対話チャットと自律Runで挙動が違う点を明示する */
  description: string;
}

export const EDIT_POLICY_OPTIONS: EditPolicyOption[] = [
  {
    value: 'free',
    label: '制限なし',
    description: 'AIの編集を制限しない。自律Runでは自動で適用される',
  },
  {
    value: 'approval_required',
    label: '承認必須',
    description:
      '自律Runでの自動適用を拒否する。対話チャットでは通常どおり提案が出て承認できる',
  },
  {
    value: 'locked',
    label: '編集ロック',
    description: 'AIからの編集提案自体を拒否する。提案が生成されない',
  },
];

/**
 * 「承認必須」を承認ダイアログが増えるモードと誤解されないための補足。
 * 対話フローは元々承認必須なので、差が出るのは自律Runだけ。
 */
export const EDIT_POLICY_NOTE =
  '対話チャットは元々あなたの承認が必要です。「承認必須」で挙動が変わるのは自律Runだけで、承認を経ない自動適用が拒否されます。';

export function editPolicyLabel(policy: EditPolicy): string {
  return (
    EDIT_POLICY_OPTIONS.find((option) => option.value === policy)?.label ??
    policy
  );
}

const EDIT_POLICY_ICONS: Record<
  Exclude<EditPolicy, 'free'>,
  React.ElementType
> = {
  approval_required: ShieldCheck,
  locked: Lock,
};

export interface EditPolicyIconProps {
  policy: EditPolicy;
  className?: string;
}

/**
 * 保護されているノードを示すアイコン。
 * `free`（既定）では何も描画しないため、ツリー上では保護されたノードだけが目立つ。
 */
export function EditPolicyIcon({ policy, className }: EditPolicyIconProps) {
  if (policy === 'free') return null;

  const Icon = EDIT_POLICY_ICONS[policy];
  return (
    <Icon
      aria-hidden="true"
      className={cn('size-3 shrink-0 text-muted-foreground', className)}
    />
  );
}
