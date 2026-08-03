import * as React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  EDIT_POLICY_NOTE,
  EDIT_POLICY_OPTIONS,
  EditPolicyIcon,
  type EditPolicy,
} from '@/components/features/edit-policy';
import { cn } from '@/lib/utils';

export type CanonStatus = 'confirmed' | 'draft';
export type ContextPolicy = 'always' | 'auto' | 'never';

export interface NodeAiAttributesProps {
  canonStatus: CanonStatus;
  contextPolicy: ContextPolicy;
  editPolicy: EditPolicy;
  onCanonStatusChange?: (status: CanonStatus) => void;
  onContextPolicyChange?: (policy: ContextPolicy) => void;
  onEditPolicyChange?: (policy: EditPolicy) => void;
  disabled?: boolean;
  className?: string;
}

const CONTEXT_POLICY_OPTIONS: {
  value: ContextPolicy;
  label: string;
  description: string;
}[] = [
  { value: 'always', label: '常に注入', description: '全文をAIに渡す' },
  { value: 'auto', label: '自動（要約）', description: '要約のみ渡す' },
  { value: 'never', label: '隠す', description: 'AIから隠す' },
];

function CanonStatusToggle({
  status,
  onChange,
  disabled,
}: {
  status: CanonStatus;
  onChange?: (status: CanonStatus) => void;
  disabled?: boolean;
}) {
  const id = React.useId();
  const confirmed = status === 'confirmed';
  const hint = 'オンにすると「確定」、オフのままだと「検討中」として扱われます';

  return (
    <div className="flex items-center gap-1.5">
      <Switch
        id={id}
        checked={confirmed}
        disabled={disabled}
        title={hint}
        onCheckedChange={(checked) =>
          onChange?.(checked ? 'confirmed' : 'draft')
        }
      />
      <label
        htmlFor={id}
        title={hint}
        className={cn(
          'cursor-pointer text-xs font-medium select-none',
          confirmed ? 'text-foreground' : 'text-muted-foreground',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        確定
      </label>
    </div>
  );
}

interface PolicyOption<T extends string> {
  value: T;
  label: string;
  description: string;
}

/**
 * ラベル + ポップオーバーで選択肢を選ぶ共通コントロール。
 * contextPolicy / editPolicy で共有する。
 */
function PolicySelector<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
  note,
  triggerIcon,
  contentClassName,
}: {
  label: string;
  options: PolicyOption<T>[];
  value: T;
  onChange?: (value: T) => void;
  disabled?: boolean;
  /** ポップオーバー下部に出す補足説明 */
  note?: string;
  /** トリガーのラベル前に出すアイコン */
  triggerIcon?: React.ReactNode;
  contentClassName?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const current =
    options.find((option) => option.value === value) ?? options[0];

  const handleSelect = (next: T) => {
    onChange?.(next);
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            className="h-7 gap-1 px-2 text-xs font-medium"
          >
            {triggerIcon}
            {current.label}
            <ChevronDown className="size-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={cn('w-56 p-1', contentClassName)}
          align="start"
        >
          <div className="space-y-0.5">
            {options.map((option) => {
              const active = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    'flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent',
                    active && 'bg-accent',
                  )}
                >
                  <Check
                    className={cn(
                      'mt-0.5 size-3 shrink-0',
                      active ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span className="flex flex-col gap-0.5">
                    <span className="font-medium">{option.label}</span>
                    <span className="text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          {note && (
            <p className="mt-1 border-t px-2 py-1.5 text-[11px] leading-relaxed text-muted-foreground">
              {note}
            </p>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

/**
 * ノードのAI属性（正典ステータス・コンテキストの見せ方・編集の保護）を操作する
 * コンパクトなインラインコントロール行。エディタのツールバー等に配置する。
 *
 * 正典ステータスは「確定」ラベル付きのトグルスイッチで表現する（オフ = 検討中）。
 */
export function NodeAiAttributes({
  canonStatus,
  contextPolicy,
  editPolicy,
  onCanonStatusChange,
  onContextPolicyChange,
  onEditPolicyChange,
  disabled = false,
  className,
}: NodeAiAttributesProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <CanonStatusToggle
        status={canonStatus}
        onChange={onCanonStatusChange}
        disabled={disabled}
      />
      <Separator orientation="vertical" className="h-4" />
      <PolicySelector
        label="AIへの見せ方:"
        options={CONTEXT_POLICY_OPTIONS}
        value={contextPolicy}
        onChange={onContextPolicyChange}
        disabled={disabled}
      />
      <Separator orientation="vertical" className="h-4" />
      <PolicySelector
        label="AIの編集:"
        options={EDIT_POLICY_OPTIONS}
        value={editPolicy}
        onChange={onEditPolicyChange}
        disabled={disabled}
        note={EDIT_POLICY_NOTE}
        contentClassName="w-72"
        triggerIcon={<EditPolicyIcon policy={editPolicy} />}
      />
    </div>
  );
}
