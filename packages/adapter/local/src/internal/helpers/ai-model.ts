import type { AIAdapterConfig } from '@tsumugi/adapter';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';

/**
 * プロバイダーに応じたLLMモデルを作成
 */
export function createModel(config: AIAdapterConfig, overrideModel?: string) {
  const modelName = overrideModel ?? config.defaultModel ?? 'gpt-5.2';

  switch (config.provider) {
    case 'openai': {
      const openai = createOpenAI({
        apiKey: config.apiKey,
        ...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
      });
      return openai(modelName);
    }
    case 'anthropic': {
      const anthropic = createAnthropic({
        apiKey: config.apiKey,
        ...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
      });
      return anthropic(modelName);
    }
    default:
      throw new Error(`Unsupported AI provider: ${config.provider}`);
  }
}

/**
 * タイトル生成用の軽量モデルを作成
 * OpenAI → gpt-4o-mini, Anthropic → claude-3-5-haiku-latest
 */
export function createTitleModel(config: AIAdapterConfig) {
  switch (config.provider) {
    case 'openai': {
      const openai = createOpenAI({
        apiKey: config.apiKey,
        ...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
      });
      return openai('gpt-4o-mini');
    }
    case 'anthropic': {
      const anthropic = createAnthropic({
        apiKey: config.apiKey,
        ...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
      });
      return anthropic('claude-3-5-haiku-latest');
    }
    default:
      return createModel(config);
  }
}
