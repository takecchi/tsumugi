import { useState, useCallback, useEffect, useRef } from 'react';
import type { EditorTab, TreeNodeData } from '@tsumugi/ui';
import type { EditorTabType } from '@tsumugi/adapter';
import { useProjectSettings, useUpdateProjectSettings } from '~/hooks/settings';

/**
 * selectedNode の型。TreeNodeData の type を EditorTabType に拡張。
 * project タブ選択時は type: 'project' が入る。
 */
export interface SelectedNode {
  id: string;
  name: string;
  type: EditorTabType;
  nodeType: 'folder' | string;
}

const SAVE_DEBOUNCE_MS = 500;

/**
 * エディタタブの状態管理 hook
 *
 * - タブの開閉・選択
 * - ノード選択との連動
 * - settings からの復元・保存
 */
export function useEditorTabs(projectId: string, projectName: string) {
  const { data: settings } = useProjectSettings(projectId);
  const { trigger: triggerUpdateSettings } = useUpdateProjectSettings(projectId);

  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [openTabs, setOpenTabs] = useState<EditorTab[]>([]);
  const initializedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // ─── settings からタブ状態を復元（初回のみ） ───
  useEffect(() => {
    if (initializedRef.current || !settings) return;
    initializedRef.current = true;

    if (settings.openTabs.length > 0) {
      setOpenTabs(settings.openTabs);
      const activeTab = settings.openTabs.find((t) => t.active);
      if (activeTab) {
        setSelectedNode({ id: activeTab.id, name: activeTab.name, type: activeTab.type, nodeType: 'file' });
      }
    }
  }, [settings]);

  // ─── debounce 付きタブ状態保存 ───
  const saveTabState = useCallback(
    (tabs: EditorTab[]) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        triggerUpdateSettings({ openTabs: tabs }).catch((e) =>
          console.error('Failed to save tab state:', e),
        );
      }, SAVE_DEBOUNCE_MS);
    },
    [triggerUpdateSettings],
  );

  const selectNode = useCallback((node: TreeNodeData) => {
    setSelectedNode({ id: node.id, name: node.name, type: node.type, nodeType: node.nodeType });
    if (node.nodeType !== 'folder') {
      setOpenTabs((prev) => {
        const exists = prev.some((t) => t.id === node.id);
        const deactivated = prev.map((t) => ({ ...t, active: false }));
        const next = exists
          ? deactivated.map((t) => t.id === node.id ? { ...t, active: true } : t)
          : [...deactivated, { id: node.id, name: node.name, type: node.type, active: true }];
        saveTabState(next);
        return next;
      });
    }
  }, [saveTabState]);

  const deselectNode = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const closeTab = useCallback((id: string) => {
    setOpenTabs((prev) => {
      const closing = prev.find((t) => t.id === id);
      const next = prev.filter((t) => t.id !== id);
      if (closing?.active && next.length > 0) {
        const closedIndex = prev.findIndex((t) => t.id === id);
        const newActiveIndex = Math.min(closedIndex, next.length - 1);
        next[newActiveIndex] = { ...next[newActiveIndex], active: true };
        const newActive = next[newActiveIndex];
        setSelectedNode({ id: newActive.id, name: newActive.name, type: newActive.type, nodeType: 'file' });
      } else if (next.length === 0) {
        setSelectedNode(null);
      }
      saveTabState(next);
      return next;
    });
  }, [saveTabState]);

  const closeOtherTabs = useCallback((id: string) => {
    setOpenTabs((prev) => {
      const kept = prev.find((t) => t.id === id);
      if (!kept) return prev;
      setSelectedNode({ id: kept.id, name: kept.name, type: kept.type, nodeType: 'file' });
      const next = [{ ...kept, active: true }];
      saveTabState(next);
      return next;
    });
  }, [saveTabState]);

  const closeAllTabs = useCallback(() => {
    setOpenTabs([]);
    setSelectedNode(null);
    saveTabState([]);
  }, [saveTabState]);

  const selectTab = useCallback((id: string) => {
    setOpenTabs((prev) => {
      const next = prev.map((t) => ({ ...t, active: t.id === id }));
      const tab = next.find((t) => t.id === id);
      if (tab) {
        setSelectedNode({ id: tab.id, name: tab.name, type: tab.type, nodeType: 'file' });
      }
      saveTabState(next);
      return next;
    });
  }, [saveTabState]);

  const selectProjectTab = useCallback(() => {
    const tabId = `project:${projectId}`;
    const node: SelectedNode = { id: tabId, name: projectName, type: 'project', nodeType: 'project' };
    setSelectedNode(node);
    setOpenTabs((prev) => {
      const exists = prev.some((t) => t.id === tabId);
      const deactivated = prev.map((t) => ({ ...t, active: false }));
      const next = exists
        ? deactivated.map((t) => t.id === tabId ? { ...t, active: true } : t)
        : [...deactivated, { id: tabId, name: projectName, type: 'project' as const, active: true }];
      saveTabState(next);
      return next;
    });
  }, [projectId, projectName, saveTabState]);

  const updateProjectTabName = useCallback((name: string) => {
    const tabId = `project:${projectId}`;
    setOpenTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === tabId);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], name };
      saveTabState(next);
      return next;
    });
    setSelectedNode((prev) => prev && prev.id === tabId ? { ...prev, name } : prev);
  }, [projectId, saveTabState]);

  return {
    selectedNode,
    openTabs,
    selectNode,
    deselectNode,
    closeTab,
    closeOtherTabs,
    closeAllTabs,
    selectTab,
    selectProjectTab,
    updateProjectTabName,
  };
}
