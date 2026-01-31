import { useState, useCallback } from 'react';
import { useSWRConfig } from 'swr';
import type { AIToolName, AIProposal } from '@tsumugi/adapter';
import { TOOL_TO_CONTENT_TYPE, toContentTreeKey } from '../_utils/ai-panel-utils';

interface AiStreamingState {
  isLoading: boolean;
  streamingContent: string | null;
  pendingUserMessage: string | null;
  streamingProposals: AIProposal[];
  setIsLoading: (value: boolean) => void;
  setStreamingContent: (value: string | null) => void;
  setPendingUserMessage: (value: string | null) => void;
  setStreamingProposals: React.Dispatch<React.SetStateAction<AIProposal[]>>;
  handleToolResult: (toolName: AIToolName) => void;
  handleProposal: (proposal: AIProposal) => void;
}

export function useAiStreamingState(projectId: string): AiStreamingState {
  const { mutate: globalMutate } = useSWRConfig();
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  const [streamingProposals, setStreamingProposals] = useState<AIProposal[]>([]);

  const handleToolResult = useCallback((toolName: AIToolName) => {
    const contentType = TOOL_TO_CONTENT_TYPE[toolName];
    if (!contentType) return;
    if (contentType === 'project') {
      void globalMutate({ type: 'project', id: projectId });
    } else {
      void globalMutate(toContentTreeKey(contentType, projectId));
    }
  }, [globalMutate, projectId]);

  const handleProposal = useCallback((proposal: AIProposal) => {
    setStreamingProposals((prev) => [...prev, proposal]);
  }, []);

  return {
    isLoading,
    streamingContent,
    pendingUserMessage,
    streamingProposals,
    setIsLoading,
    setStreamingContent,
    setPendingUserMessage,
    setStreamingProposals,
    handleToolResult,
    handleProposal,
  };
}
