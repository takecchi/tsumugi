import type {
  CreateFeedbackData,
  FeedbackAdapter,
  ProductSignal,
} from '@tsumugi/adapter';
import type { ApiClients } from '@/client';
import {
  toCreateProductSignalRequest,
  toProductSignal,
} from '@/internal/helpers/feedback';

/**
 * フィードバック送信アダプター（API版）
 */
export function createFeedbackAdapter(clients: ApiClients): FeedbackAdapter {
  return {
    async send(data: CreateFeedbackData): Promise<ProductSignal> {
      const signal = await clients.feedback.createFeedback({
        createProductSignalRequest: toCreateProductSignalRequest(data),
      });
      return toProductSignal(signal);
    },
  };
}
