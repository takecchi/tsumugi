import type { ReactNode } from 'react';
import { NodeAiAttributes } from '@tsumugi/ui';
import { useUpdateNodeAttributes } from '~/hooks/nodes';
import type { CanonStatus, ContentType, ContextPolicy } from '@tsumugi/adapter';

interface NodeAttributesBarProps {
  projectId: string;
  contentType: ContentType;
  nodeId: string;
  canonStatus: CanonStatus;
  contextPolicy: ContextPolicy;
  /** バー右端に配置する追加コントロール（例: 本文/整合性チェックの切り替え） */
  children?: ReactNode;
}

/**
 * エディタ上部に表示する、ノードのAI属性（確定/検討中・AIへの見せ方）の操作バー。
 * 変更は adapter.nodes.updateAttributes 経由で保存し、対応するツリーを再フェッチする。
 * children を渡すとバー右端に配置される。
 */
export function NodeAttributesBar({
  projectId,
  contentType,
  nodeId,
  canonStatus,
  contextPolicy,
  children,
}: NodeAttributesBarProps) {
  const { trigger, isMutating } = useUpdateNodeAttributes(
    projectId,
    contentType,
  );

  return (
    <div className="flex shrink-0 items-center border-b bg-background px-3 py-1.5">
      <NodeAiAttributes
        canonStatus={canonStatus}
        contextPolicy={contextPolicy}
        disabled={isMutating}
        onCanonStatusChange={(status) => {
          void trigger({ nodeId, attributes: { canonStatus: status } });
        }}
        onContextPolicyChange={(policy) => {
          void trigger({ nodeId, attributes: { contextPolicy: policy } });
        }}
      />
      {children ? (
        <div className="ml-auto flex items-center">{children}</div>
      ) : null}
    </div>
  );
}
