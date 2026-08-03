import type { ReactNode } from 'react';
import { NodeAiAttributes } from '@tsumugi/ui';
import { useUpdateNodeAttributes } from '~/hooks/nodes';
import type {
  CanonStatus,
  ContentType,
  ContextPolicy,
  EditPolicy,
  NodeAttributes,
} from '@tsumugi/adapter';

interface NodeAttributesBarProps {
  projectId: string;
  contentType: ContentType;
  nodeId: string;
  canonStatus: CanonStatus;
  contextPolicy: ContextPolicy;
  editPolicy: EditPolicy;
  /** バー右端に配置する追加コントロール（例: 本文/整合性チェックの切り替え） */
  children?: ReactNode;
}

/**
 * エディタ上部に表示する、ノードのAI属性（確定/検討中・AIへの見せ方・AIの編集保護）の操作バー。
 * 変更は adapter.nodes.updateAttributes 経由で保存し、対応するツリーを再フェッチする。
 * children を渡すとバー右端に配置される。
 */
export function NodeAttributesBar({
  projectId,
  contentType,
  nodeId,
  canonStatus,
  contextPolicy,
  editPolicy,
  children,
}: NodeAttributesBarProps) {
  const { trigger, isMutating } = useUpdateNodeAttributes(
    projectId,
    contentType,
  );

  const updateAttributes = (attributes: NodeAttributes) => {
    trigger({ nodeId, attributes }).catch((e: unknown) => {
      // 失敗時はキャッシュがロールバックされ、表示が元の値に戻る
      console.error('Failed to update node attributes:', e);
    });
  };

  return (
    <div className="flex shrink-0 items-center border-b bg-background px-3 py-1.5">
      <NodeAiAttributes
        canonStatus={canonStatus}
        contextPolicy={contextPolicy}
        editPolicy={editPolicy}
        disabled={isMutating}
        onCanonStatusChange={(canonStatus) => updateAttributes({ canonStatus })}
        onContextPolicyChange={(contextPolicy) =>
          updateAttributes({ contextPolicy })
        }
        onEditPolicyChange={(editPolicy) => updateAttributes({ editPolicy })}
      />
      {children ? (
        <div className="ml-auto flex items-center">{children}</div>
      ) : null}
    </div>
  );
}
